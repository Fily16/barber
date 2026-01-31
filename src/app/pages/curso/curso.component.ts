import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import { AuthService, CourseService } from '../../core/services';
import { CourseResponse, VideoResponse } from '../../core/models';

// Interfaz local para el template
interface Video {
  id: string;
  titulo: string;
  duracion: string;
  thumbnail: string;
  videoUrl: string;
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

  // Sistema de autenticación
  isAuthenticated: boolean = false;
  showWelcome: boolean = false;
  loginError: string = '';
  username: string = '';
  password: string = '';
  isLoading: boolean = false;

  // Modal de sesión activa
  showSessionModal: boolean = false;

  // Modal de sesión cerrada (cuando otro dispositivo inicia sesión)
  showSessionClosedModal: boolean = false;

  // Estado de curso no encontrado
  courseNotFound: boolean = false;

  // Modal de video
  showVideoModal: boolean = false;

  // Para cleanup de subscriptions
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private courseService: CourseService
  ) {}

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.cursoId = params['id'];
      this.resetState();

      // Crear placeholder del curso para mostrar login
      this.curso = this.createPlaceholderCourse(this.cursoId);

      // Verificar si ya está autenticado
      if (this.authService.isAuthenticated()) {
        this.loadCourse();
      }
    });

    // Suscribirse a eventos de sesión inválida
    this.authService.sessionInvalid$
      .pipe(takeUntil(this.destroy$))
      .subscribe(invalid => {
        if (invalid && this.isAuthenticated) {
          console.log('Session invalidated by another device!');
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
    this.isLoading = false;
    this.courseNotFound = false;
  }

  /**
   * Maneja cuando la sesión es invalidada por otro dispositivo
   */
  private handleSessionInvalidated(): void {
    if (this.showVideoModal) {
      this.closeModal();
    }
    this.showSessionClosedModal = true;
    this.isAuthenticated = false;
    this.cdr.detectChanges();
  }

  /**
   * Usuario acepta que su sesión fue cerrada
   */
  acceptSessionClosed(): void {
    this.showSessionClosedModal = false;
    this.loginError = '';
    this.curso = this.createPlaceholderCourse(this.cursoId);
    this.cdr.detectChanges();
  }

  /**
   * Crea un placeholder del curso basado en el slug para mostrar el login
   */
  private createPlaceholderCourse(slug: string): CursoData {
    const titulo = slug.replace(/-/g, ' ').toUpperCase();
    return {
      id: slug,
      titulo: titulo,
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

    this.authService.login({
      username: this.username,
      password: this.password,
      forceLogin: forceLogin
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Verificar si hay sesión activa en otro dispositivo
            if (response.data.hasActiveSession) {
              this.isLoading = false;
              this.showSessionModal = true;
              this.cdr.detectChanges();
              return;
            }

            // Login exitoso
            this.showWelcome = true;
            this.cdr.detectChanges();

            // Mostrar bienvenida y luego cargar curso
            setTimeout(() => {
              this.loadCourse();
            }, 2500);
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

  confirmForceLogin(): void {
    this.login(true);
  }

  cancelForceLogin(): void {
    this.showSessionModal = false;
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private loadCourse(): void {
    console.log('=== LOADING COURSE ===');
    console.log('Course ID:', this.cursoId);

    this.courseService.getCourse(this.cursoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Course loaded:', response);
          if (response.success && response.data) {
            // Mapear respuesta del backend a formato local
            this.curso = this.mapCourseResponse(response.data);
            this.isAuthenticated = true;
            this.showWelcome = false;
            this.isLoading = false;
            this.courseNotFound = false;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.log('=== COURSE LOAD ERROR ===', error);

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

  /**
   * Mapea la respuesta del backend al formato local
   */
  private mapCourseResponse(course: CourseResponse): CursoData {
    // Videos de teoría (tomar el primero si hay)
    const teoriaVideo = course.theoryVideos && course.theoryVideos.length > 0
      ? this.mapVideoResponse(course.theoryVideos[0])
      : null;

    // Videos de práctica
    const practicas = course.practiceVideos
      ? course.practiceVideos.map(v => this.mapVideoResponse(v))
      : [];

    return {
      id: course.slug,
      titulo: course.title,
      descripcion: course.description || '',
      teoria: teoriaVideo,
      practicas: practicas
    };
  }

  /**
   * Mapea un VideoResponse del backend al formato Video local
   */
  private mapVideoResponse(video: VideoResponse): Video {
    return {
      id: video.id.toString(),
      titulo: video.title,
      duracion: video.duration || '',
      thumbnail: video.thumbnailUrl || this.getYoutubeThumbnail(video.videoUrl),
      videoUrl: video.videoUrl
    };
  }

  /**
   * Genera thumbnail de YouTube a partir de la URL o ID
   */
  getYoutubeThumbnail(videoUrl: string): string {
    const videoId = this.extractYoutubeId(videoUrl);
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  /**
   * Extrae el ID de YouTube de una URL
   */
  extractYoutubeId(url: string): string {
    if (!url) return '';

    // Si ya es solo un ID (11 caracteres)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
      return url.trim();
    }

    const patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return url.trim();
  }

  playVideo(video: Video): void {
    this.authService.checkSession();
    this.selectedVideo = video;
    this.showVideoModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showVideoModal = false;
    this.selectedVideo = null;
    document.body.style.overflow = 'auto';
  }

  /**
   * Genera URL de YouTube con parámetros para ocultar branding
   */
  getSecureVideoUrl(videoUrl: string): string {
    const videoId = this.extractYoutubeId(videoUrl);

    // Parámetros para ocultar YouTube branding al máximo
    const params = new URLSearchParams({
      'modestbranding': '1',
      'rel': '0',
      'showinfo': '0',
      'iv_load_policy': '3',
      'fs': '1',
      'playsinline': '1',
      'enablejsapi': '1',
      'origin': window.location.origin,
      'widget_referrer': window.location.origin,
      'cc_load_policy': '0',
      'disablekb': '0'
    });

    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }

  /**
   * Obtiene el total de videos del curso
   */
  getTotalVideos(): number {
    if (!this.curso) return 0;
    const teoriaCount = this.curso.teoria ? 1 : 0;
    return teoriaCount + this.curso.practicas.length;
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
