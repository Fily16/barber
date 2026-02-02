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
   * Sube un archivo de video directamente a Bunny CDN
   * @param file Archivo de video a subir
   * @param uploadData Datos de upload obtenidos de createVideo()
   */
  uploadVideoToBunny(file: File, uploadData: BunnyUploadUrlResponse): Observable<UploadProgress> {
    const progressSubject = new Subject<UploadProgress>();

    // Resetear progreso
    this.uploadProgress$.next({
      state: 'pending',
      progress: 0,
      message: 'Preparando upload...'
    });

    // Headers para Bunny CDN
    const headers = new HttpHeaders({
      'AuthorizationSignature': uploadData.authorizationSignature,
      'AuthorizationExpire': uploadData.authorizationExpire.toString(),
      'VideoId': uploadData.videoId,
      'LibraryId': uploadData.libraryId
    });

    // Crear request con reporte de progreso
    const req = new HttpRequest('PUT', uploadData.uploadUrl, file, {
      headers: headers,
      reportProgress: true
    });

    this.http.request(req).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          const update: UploadProgress = {
            state: 'uploading',
            progress: progress,
            message: `Subiendo video... ${progress}%`,
            videoId: uploadData.videoId
          };
          this.uploadProgress$.next(update);
          progressSubject.next(update);
        } else if (event.type === HttpEventType.Response) {
          const update: UploadProgress = {
            state: 'processing',
            progress: 100,
            message: 'Video subido. Procesando en Bunny...',
            videoId: uploadData.videoId
          };
          this.uploadProgress$.next(update);
          progressSubject.next(update);

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
      },
      error: (error) => {
        console.error('Error uploading to Bunny:', error);
        const errorUpdate: UploadProgress = {
          state: 'error',
          progress: 0,
          message: 'Error al subir el video. Intenta de nuevo.',
          videoId: uploadData.videoId
        };
        this.uploadProgress$.next(errorUpdate);
        progressSubject.next(errorUpdate);
        progressSubject.error(error);
      }
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
          // Luego subir el archivo
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
}
