import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import { AuthService, CourseService } from '../../core/services';
import { CourseResponse, VideoResponse } from '../../core/models';

// Interfaz local para mantener compatibilidad con el template
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

  // Sección abierta
  openSection: string = '';

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
    this.openSection = '';
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
    // Cerrar modal de video si está abierto
    if (this.showVideoModal) {
      this.closeModal();
    }

    // Mostrar modal de sesión cerrada
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

  /**
   * Usuario confirma cerrar sesión anterior y continuar
   */
  confirmForceLogin(): void {
    this.login(true);
  }

  /**
   * Usuario cancela el login forzado
   */
  cancelForceLogin(): void {
    this.showSessionModal = false;
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private loadCourse(): void {
    console.log('=== LOADING COURSE ===');
    console.log('Course ID:', this.cursoId);
    console.log('Token exists:', !!this.authService.getToken());

    this.courseService.getCourse(this.cursoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Course loaded successfully:', response);
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
          console.log('=== COURSE LOAD ERROR ===');
          console.log('Full error:', error);
          console.log('sessionInvalid:', error.sessionInvalid);
          console.log('status:', error.status);

          this.isLoading = false;
          this.showWelcome = false;

          if (error.sessionInvalid) {
            console.log('Handling sessionInvalid error');
            this.handleSessionInvalidated();
          } else if (error.status === 403) {
            this.loginError = error.error?.message || 'No tienes acceso a este curso';
            this.isAuthenticated = false;
            this.authService.clearAuth();
          } else if (error.status === 401) {
            console.log('Handling 401 error');
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

          console.log('Final state - isAuthenticated:', this.isAuthenticated);
          console.log('Final state - loginError:', this.loginError);
          this.cdr.detectChanges();
        }
      });
  }

  private mapCourseResponse(course: CourseResponse): CursoData {
    const teoriaVideo = course.theoryVideos.length > 0
      ? this.mapVideoResponse(course.theoryVideos[0])
      : null;

    const practicas = course.practiceVideos.map(v => this.mapVideoResponse(v));

    return {
      id: course.slug,
      titulo: course.title,
      descripcion: course.description,
      teoria: teoriaVideo,
      practicas: practicas
    };
  }

  private mapVideoResponse(video: VideoResponse): Video {
    return {
      id: video.id.toString(),
      titulo: video.title,
      duracion: video.duration || '00:00',
      thumbnail: video.thumbnailUrl || 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300',
      videoUrl: video.videoUrl
    };
  }

  toggleSection(section: string): void {
    this.openSection = this.openSection === section ? '' : section;
  }

  playVideo(video: Video): void {
    // Verificar sesión antes de reproducir
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
    // Si ya es una URL de embed, extraer el ID
    let videoId = '';

    if (videoUrl.includes('youtube.com/embed/')) {
      videoId = videoUrl.split('youtube.com/embed/')[1]?.split('?')[0] || '';
    } else if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (videoUrl.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(videoUrl.split('?')[1]);
      videoId = urlParams.get('v') || '';
    } else {
      // Asumir que es solo el ID
      videoId = videoUrl;
    }

    // Parámetros para ocultar YouTube branding
    const params = new URLSearchParams({
      'modestbranding': '1',      // Reduce branding
      'rel': '0',                  // No mostrar videos relacionados
      'showinfo': '0',             // Ocultar título (deprecado pero ayuda)
      'iv_load_policy': '3',       // Ocultar anotaciones
      'fs': '1',                   // Permitir pantalla completa
      'playsinline': '1',          // Reproducir inline en móvil
      'enablejsapi': '1',          // Habilitar API
      'origin': window.location.origin,
      'widget_referrer': window.location.origin
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
