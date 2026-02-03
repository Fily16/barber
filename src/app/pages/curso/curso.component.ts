import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import { AuthService, CourseService } from '../../core/services';
import { BunnyService } from '../../core/services/bunny.service';
import { CourseResponse, VideoResponse } from '../../core/models';

interface Video {
  id: string;
  titulo: string;
  duracion: string;
  thumbnail: string;
  videoUrl: string;
  embedUrl: string;
  descripcion?: string;
}

interface CursoData {
  id: string;
  titulo: string;
  descripcion: string;
  teoria: Video | null;
  practicas: Video[];
}

@Component({
  selector: 'app-curso',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, SafeUrlPipe],
  templateUrl: './curso.component.html',
  styleUrl: './curso.component.css'
})
export class CursoComponent implements OnInit, OnDestroy {
  cursoId: string = '';
  curso: CursoData | null = null;
  selectedVideo: Video | null = null;
  isAuthenticated: boolean = false;
  showWelcome: boolean = false;
  loginError: string = '';
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  showSessionModal: boolean = false;
  showSessionClosedModal: boolean = false;
  courseNotFound: boolean = false;
  showVideoModal: boolean = false;
  playingVideoId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private courseService: CourseService,
    private bunnyService: BunnyService
  ) {}

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.cursoId = params['id'];
      this.resetState();
      this.curso = this.createPlaceholderCourse(this.cursoId);
      if (this.authService.isAuthenticated()) {
        this.loadCourse();
      }
    });

    this.authService.sessionInvalid$
      .pipe(takeUntil(this.destroy$))
      .subscribe(invalid => {
        if (invalid && this.isAuthenticated) {
          this.handleSessionInvalidated();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetState(): void {
    this.curso = null;
    this.isAuthenticated = false;
    this.showWelcome = false;
    this.loginError = '';
    this.username = '';
    this.password = '';
    this.showVideoModal = false;
    this.showSessionModal = false;
    this.showSessionClosedModal = false;
    this.selectedVideo = null;
    this.playingVideoId = null;
    this.isLoading = false;
    this.courseNotFound = false;
  }

  private handleSessionInvalidated(): void {
    if (this.showVideoModal) this.closeModal();
    this.showSessionClosedModal = true;
    this.isAuthenticated = false;
    this.cdr.detectChanges();
  }

  acceptSessionClosed(): void {
    this.showSessionClosedModal = false;
    this.loginError = '';
    this.curso = this.createPlaceholderCourse(this.cursoId);
    this.cdr.detectChanges();
  }

  private createPlaceholderCourse(slug: string): CursoData {
    return {
      id: slug,
      titulo: slug.replace(/-/g, ' ').toUpperCase(),
      descripcion: '',
      teoria: null,
      practicas: []
    };
  }

  login(forceLogin: boolean = false): void {
    if (!this.username || !this.password) {
      this.loginError = 'Ingresa usuario y contraseña';
      return;
    }
    this.isLoading = true;
    this.loginError = '';
    this.showSessionModal = false;

    this.authService.login({ username: this.username, password: this.password, forceLogin })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            if (response.data.hasActiveSession) {
              this.isLoading = false;
              this.showSessionModal = true;
              this.cdr.detectChanges();
              return;
            }
            this.showWelcome = true;
            this.cdr.detectChanges();
            setTimeout(() => this.loadCourse(), 2500);
          } else {
            this.loginError = response.message || 'Error al iniciar sesión';
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          this.isLoading = false;
          if (error.sessionInvalid) {
            this.loginError = 'Sesión cerrada. Se inició sesión en otro dispositivo.';
          } else if (error.error?.message) {
            this.loginError = error.error.message;
          } else if (error.status === 401) {
            this.loginError = 'Credenciales incorrectas';
          } else {
            this.loginError = 'Error de conexión. Intenta de nuevo.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  confirmForceLogin(): void { this.login(true); }
  cancelForceLogin(): void {
    this.showSessionModal = false;
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private loadCourse(): void {
    this.courseService.getCourse(this.cursoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.curso = this.mapCourseResponse(response.data);
            this.isAuthenticated = true;
            this.showWelcome = false;
            this.isLoading = false;
            this.courseNotFound = false;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.showWelcome = false;
          if (error.sessionInvalid) {
            this.handleSessionInvalidated();
          } else if (error.status === 403) {
            this.loginError = error.error?.message || 'No tienes acceso a este curso';
            this.isAuthenticated = false;
            this.authService.clearAuth();
          } else if (error.status === 401) {
            this.loginError = 'Sesión expirada. Inicia sesión nuevamente.';
            this.isAuthenticated = false;
            this.authService.clearAuth();
            this.curso = this.createPlaceholderCourse(this.cursoId);
          } else if (error.status === 404) {
            this.courseNotFound = true;
            this.curso = null;
          } else {
            this.loginError = 'Error al cargar el curso. Intenta de nuevo.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  private mapCourseResponse(course: CourseResponse): CursoData {
    const teoriaVideo = course.theoryVideos?.length > 0
      ? this.mapVideoResponse(course.theoryVideos[0])
      : null;
    const practicas = course.practiceVideos?.map(v => this.mapVideoResponse(v)) || [];
    return {
      id: course.slug,
      titulo: course.title,
      descripcion: course.description || '',
      teoria: teoriaVideo,
      practicas: practicas
    };
  }

  private mapVideoResponse(video: VideoResponse): Video {
    const videoId = video.videoUrl;
    return {
      id: video.id.toString(),
      titulo: video.title,
      duracion: video.duration || '',
      thumbnail: video.thumbnailUrl || this.getBunnyThumbnail(videoId),
      videoUrl: videoId,
      embedUrl: this.getBunnyEmbedUrl(videoId),
      descripcion: video.description || ''
    };
  }

  getBunnyThumbnail(videoId: string): string {
    return `https://vz-e7443a92-10a.b-cdn.net/${videoId}/thumbnail.jpg`;
  }

  getBunnyEmbedUrl(videoId: string): string {
    return `https://iframe.mediadelivery.net/embed/590927/${videoId}?autoplay=false&preload=true`;
  }

  playVideo(video: Video): void {
    this.authService.checkSession();
    this.selectedVideo = video;
    this.showVideoModal = true;
    document.body.style.overflow = 'hidden';
  }

  playVideoInline(video: Video): void {
    this.authService.checkSession();
    // Si ya está reproduciendo este video, lo pausamos
    if (this.playingVideoId === video.id) {
      this.playingVideoId = null;
    } else {
      this.playingVideoId = video.id;
    }
    this.cdr.detectChanges();
  }

  stopVideo(): void {
    this.playingVideoId = null;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showVideoModal = false;
    this.selectedVideo = null;
    document.body.style.overflow = 'auto';
  }

  getSecureVideoUrl(videoUrl: string): string {
    const params = new URLSearchParams({
      'autoplay': 'true',
      'preload': 'true',
      'responsive': 'true'
    });
    return `https://iframe.mediadelivery.net/embed/590927/${videoUrl}?${params.toString()}`;
  }

  getTotalVideos(): number {
    if (!this.curso) return 0;
    return (this.curso.teoria ? 1 : 0) + this.curso.practicas.length;
  }

  logout(): void {
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetState();
          this.curso = this.createPlaceholderCourse(this.cursoId);
          this.cdr.detectChanges();
        },
        error: () => {
          this.authService.clearAuth();
          this.resetState();
          this.curso = this.createPlaceholderCourse(this.cursoId);
          this.cdr.detectChanges();
        }
      });
  }
}
