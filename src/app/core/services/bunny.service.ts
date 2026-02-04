import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';
import {
  BunnyVideoResponse,
  BunnyVideoListResponse,
  BunnyUploadUrlResponse,
  BunnyVideoUrls
} from '../models/bunny.model';
import * as tus from 'tus-js-client';

export interface UploadProgress {
  state: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  videoId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BunnyService {
  private readonly API_URL = `${environment.apiUrl}/bunny`;
  private readonly TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';

  // Subject para tracking de progreso de upload
  private uploadProgress$ = new BehaviorSubject<UploadProgress>({
    state: 'pending',
    progress: 0,
    message: ''
  });

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el observable de progreso de upload
   */
  getUploadProgress(): Observable<UploadProgress> {
    return this.uploadProgress$.asObservable();
  }

  /**
   * Lista videos de Bunny Stream con paginación
   */
  listVideos(page: number = 1, itemsPerPage: number = 10): Observable<BunnyVideoListResponse> {
    return this.http.get<BunnyVideoListResponse>(
      `${this.API_URL}/videos?page=${page}&itemsPerPage=${itemsPerPage}`
    );
  }

  /**
   * Obtiene un video específico por ID
   */
  getVideo(videoId: string): Observable<BunnyVideoResponse> {
    return this.http.get<BunnyVideoResponse>(`${this.API_URL}/videos/${videoId}`);
  }

  /**
   * Crea un video en Bunny y obtiene URL de upload
   */
  createVideo(title: string): Observable<BunnyUploadUrlResponse> {
    return this.http.post<BunnyUploadUrlResponse>(
      `${this.API_URL}/videos?title=${encodeURIComponent(title)}`,
      {}
    );
  }

  /**
   * Actualiza el título de un video
   */
  updateVideoTitle(videoId: string, title: string): Observable<BunnyVideoResponse> {
    return this.http.put<BunnyVideoResponse>(
      `${this.API_URL}/videos/${videoId}?title=${encodeURIComponent(title)}`,
      {}
    );
  }

  /**
   * Elimina un video de Bunny
   */
  deleteVideo(videoId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/videos/${videoId}`);
  }

  /**
   * Obtiene las URLs de reproducción de un video
   */
  getVideoUrls(videoId: string): Observable<BunnyVideoUrls> {
    return this.http.get<BunnyVideoUrls>(`${this.API_URL}/videos/${videoId}/urls`);
  }

  /**
   * Sube un archivo de video directamente a Bunny CDN usando TUS protocol
   * @param file Archivo de video a subir
   * @param uploadData Datos de upload obtenidos de createVideo()
   */
  uploadVideoToBunny(file: File, uploadData: BunnyUploadUrlResponse): Observable<UploadProgress> {
    const progressSubject = new Subject<UploadProgress>();

    console.log('Bunny upload data:', uploadData);

    // Resetear progreso
    this.uploadProgress$.next({
      state: 'pending',
      progress: 0,
      message: 'Preparando upload...'
    });

    // Crear upload TUS con headers pre-signed
    const upload = new tus.Upload(file, {
      endpoint: this.TUS_ENDPOINT,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        'AuthorizationSignature': uploadData.authorizationSignature,
        'AuthorizationExpire': uploadData.authorizationExpire.toString(),
        'VideoId': uploadData.videoId,
        'LibraryId': uploadData.libraryId
      },
      metadata: {
        filetype: file.type,
        title: file.name
      },
      onError: (error) => {
        console.error('TUS upload error:', error);
        const errorUpdate: UploadProgress = {
          state: 'error',
          progress: 0,
          message: 'Error al subir el video: ' + error.message,
          videoId: uploadData.videoId
        };
        this.uploadProgress$.next(errorUpdate);
        progressSubject.next(errorUpdate);
        progressSubject.error(error);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const progress = Math.round((bytesUploaded / bytesTotal) * 100);
        const update: UploadProgress = {
          state: 'uploading',
          progress: progress,
          message: `Subiendo video... ${progress}%`,
          videoId: uploadData.videoId
        };
        this.uploadProgress$.next(update);
        progressSubject.next(update);
      },
      onSuccess: () => {
        console.log('TUS upload success!');
        const processingUpdate: UploadProgress = {
          state: 'processing',
          progress: 100,
          message: 'Video subido. Procesando en Bunny...',
          videoId: uploadData.videoId
        };
        this.uploadProgress$.next(processingUpdate);
        progressSubject.next(processingUpdate);

        // Completar después de un momento
        setTimeout(() => {
          const completed: UploadProgress = {
            state: 'completed',
            progress: 100,
            message: '¡Video subido exitosamente!',
            videoId: uploadData.videoId
          };
          this.uploadProgress$.next(completed);
          progressSubject.next(completed);
          progressSubject.complete();
        }, 1000);
      }
    });

    // Verificar si hay uploads previos para continuar (resumable)
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        console.log('Found previous upload, resuming...');
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      // Iniciar upload
      upload.start();
    });

    return progressSubject.asObservable();
  }

  /**
   * Proceso completo: crear video + subir archivo
   */
  async uploadVideo(title: string, file: File): Promise<Observable<UploadProgress>> {
    // Primero crear el video en Bunny para obtener URL de upload
    return new Promise((resolve, reject) => {
      this.createVideo(title).subscribe({
        next: (uploadData) => {
          // Luego subir el archivo usando TUS
          const upload$ = this.uploadVideoToBunny(file, uploadData);
          resolve(upload$);
        },
        error: (error) => {
          console.error('Error creating video in Bunny:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Resetea el estado de progreso
   */
  resetProgress(): void {
    this.uploadProgress$.next({
      state: 'pending',
      progress: 0,
      message: ''
    });
  }

  /**
   * Sube un thumbnail personalizado para un video
   * @param videoId ID del video en Bunny
   * @param file Archivo de imagen (JPG, PNG, WebP)
   */
  uploadThumbnail(videoId: string, file: File): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<string>>(
      `${this.API_URL}/videos/${videoId}/thumbnail`,
      formData
    );
  }
}
