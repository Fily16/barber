import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, UserResponse, CreateUserRequest, AssignCourseRequest, CreateVideoRequest } from '../../core/services/admin.service';
import { CourseResponse, UserCourseResponse, VideoResponse } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  // Estados de vista
  isAuthenticated = false;
  isLoading = false;
  currentView: 'students' | 'videos' = 'students';

  // Mensaje de servidor despertando
  serverWakingUp = false;
  loadingMessage = 'Cargando...';
  private loadingTimer: any = null;

  // Login
  username = '';
  password = '';
  loginError = '';

  // Modal de sesión activa
  showSessionModal = false;

  // Datos
  students: UserResponse[] = [];
  courses: CourseResponse[] = [];

  // Modal de estudiante
  showStudentModal = false;
  editingStudent: UserResponse | null = null;
  studentForm: CreateUserRequest = {
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: ''
  };
  studentFormError = '';

  // Modal de asignación de curso
  showAssignModal = false;
  selectedStudent: UserResponse | null = null;
  assignForm: AssignCourseRequest = {
    userId: 0,
    courseId: 0,
    planType: 'UNLIMITED',
    durationMonths: 3
  };
  assignFormError = '';

  // Modal de cambio de contraseña
  showPasswordModal = false;
  passwordStudent: UserResponse | null = null;
  newPassword = '';
  passwordError = '';

  // ==================== VIDEOS ====================
  showVideoModal = false;
  editingVideo: VideoResponse | null = null;
  selectedCourseForVideos: CourseResponse | null = null;
  videoForm: CreateVideoRequest = {
    courseId: 0,
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    duration: '',
    type: 'PRACTICE',
    orderIndex: 0
  };
  videoFormError = '';

  // Mensajes
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Verificar si ya está autenticado como admin
    const user = this.authService.getCurrentUser();
    if (user && user.role === 'ADMIN') {
      this.isAuthenticated = true;
      this.loadData();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearLoadingTimer();
  }

  // ==================== LOADING CON MENSAJE AMIGABLE ====================

  private startLoading(message: string = 'Cargando...'): void {
    this.isLoading = true;
    this.loadingMessage = message;
    this.serverWakingUp = false;
    this.clearLoadingTimer();

    // Si tarda más de 5 segundos, mostrar mensaje amigable
    this.loadingTimer = setTimeout(() => {
      this.serverWakingUp = true;
      this.loadingMessage = '¡El servidor está despertando! ☕ Esto puede tomar unos segundos...';
      this.cdr.detectChanges();
    }, 5000);

    this.cdr.detectChanges();
  }

  private stopLoading(): void {
    this.isLoading = false;
    this.serverWakingUp = false;
    this.loadingMessage = 'Cargando...';
    this.clearLoadingTimer();
    this.cdr.detectChanges();
  }

  private clearLoadingTimer(): void {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
  }

  // ==================== NAVEGACIÓN ====================

  switchView(view: 'students' | 'videos'): void {
    this.currentView = view;
    if (view === 'videos' && this.courses.length > 0 && !this.selectedCourseForVideos) {
      this.selectedCourseForVideos = this.courses[0];
    }
    this.cdr.detectChanges();
  }

  selectCourseForVideos(course: CourseResponse): void {
    this.selectedCourseForVideos = course;
    this.cdr.detectChanges();
  }

  // ==================== LOGIN ====================

  login(forceLogin: boolean = false): void {
    if (!this.username || !this.password) {
      this.loginError = 'Ingresa usuario y contraseña';
      this.cdr.detectChanges();
      return;
    }

    this.startLoading('Iniciando sesión...');
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
          console.log('Login response:', response);

          if (response.success && response.data) {
            // Verificar si hay sesión activa en otro dispositivo
            if (response.data.hasActiveSession) {
              console.log('Sesión activa detectada, mostrando modal');
              this.isLoading = false;
              this.serverWakingUp = false;
              this.loadingMessage = 'Cargando...';
              this.clearLoadingTimer();
              this.showSessionModal = true;
              this.cdr.detectChanges();
              return;
            }

            // Verificar rol de admin
            if (response.data.role === 'ADMIN') {
              console.log('Login exitoso como ADMIN');
              this.isAuthenticated = true;
              this.cdr.detectChanges();
              this.loadData();
            } else {
              console.log('No es admin');
              this.loginError = 'No tienes permisos de administrador';
              this.authService.clearAuth();
              this.stopLoading();
            }
          } else {
            console.log('Respuesta sin éxito:', response.message);
            this.loginError = response.message || 'Error al iniciar sesión';
            this.stopLoading();
          }
        },
        error: (error) => {
          console.log('Login error:', error);
          this.stopLoading();
          if (error.sessionInvalid) {
            this.loginError = 'Sesión cerrada. Se inició sesión en otro dispositivo.';
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
    this.stopLoading();
  }

  logout(): void {
    this.authService.logout().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isAuthenticated = false;
        this.username = '';
        this.password = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.authService.clearAuth();
        this.isAuthenticated = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== CARGA DE DATOS ====================

  loadData(): void {
    this.startLoading('Cargando datos...');

    forkJoin({
      students: this.adminService.getAllStudents(),
      courses: this.adminService.getAllCourses()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        console.log('Datos cargados:', result);
        this.students = result.students.data || [];
        this.courses = result.courses.data || [];

        // Seleccionar primer curso por defecto para videos
        if (this.courses.length > 0 && !this.selectedCourseForVideos) {
          this.selectedCourseForVideos = this.courses[0];
        }

        this.stopLoading();
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.stopLoading();
      }
    });
  }

  // ==================== GESTIÓN DE ESTUDIANTES ====================

  openNewStudentModal(): void {
    this.editingStudent = null;
    this.studentForm = {
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: ''
    };
    this.studentFormError = '';
    this.showStudentModal = true;
    this.cdr.detectChanges();
  }

  openEditStudentModal(student: UserResponse): void {
    this.editingStudent = student;
    this.studentForm = {
      username: student.username,
      password: '', // No mostrar contraseña
      fullName: student.fullName,
      email: student.email || '',
      phone: student.phone || ''
    };
    this.studentFormError = '';
    this.showStudentModal = true;
    this.cdr.detectChanges();
  }

  closeStudentModal(): void {
    this.showStudentModal = false;
    this.editingStudent = null;
    this.cdr.detectChanges();
  }

  saveStudent(): void {
    if (!this.studentForm.username || !this.studentForm.fullName) {
      this.studentFormError = 'Usuario y nombre son requeridos';
      this.cdr.detectChanges();
      return;
    }

    if (!this.editingStudent && !this.studentForm.password) {
      this.studentFormError = 'La contraseña es requerida';
      this.cdr.detectChanges();
      return;
    }

    this.startLoading(this.editingStudent ? 'Actualizando estudiante...' : 'Creando estudiante...');
    this.studentFormError = '';

    const request = this.editingStudent
      ? this.adminService.updateStudent(this.editingStudent.id, this.studentForm)
      : this.adminService.createStudent(this.studentForm);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showSuccess(this.editingStudent ? 'Estudiante actualizado' : 'Estudiante creado');
        this.closeStudentModal();
        this.loadData();
      },
      error: (error) => {
        this.studentFormError = error.error?.message || 'Error al guardar';
        this.stopLoading();
      }
    });
  }

  toggleStatus(student: UserResponse): void {
    this.startLoading('Actualizando estado...');

    this.adminService.toggleStudentStatus(student.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Estudiante ${student.active ? 'desactivado' : 'activado'}`);
          this.loadData();
        },
        error: () => {
          this.stopLoading();
        }
      });
  }

  deleteStudent(student: UserResponse): void {
    if (confirm(`¿Eliminar a ${student.fullName}? Esta acción no se puede deshacer.`)) {
      this.startLoading('Eliminando estudiante...');

      this.adminService.deleteStudent(student.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('Estudiante eliminado');
            this.loadData();
          },
          error: () => {
            this.stopLoading();
          }
        });
    }
  }

  // ==================== CAMBIO DE CONTRASEÑA ====================

  openPasswordModal(student: UserResponse): void {
    this.passwordStudent = student;
    this.newPassword = '';
    this.passwordError = '';
    this.showPasswordModal = true;
    this.cdr.detectChanges();
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.passwordStudent = null;
    this.cdr.detectChanges();
  }

  savePassword(): void {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres';
      this.cdr.detectChanges();
      return;
    }

    if (!this.passwordStudent) return;

    this.startLoading('Actualizando contraseña...');

    this.adminService.resetPassword(this.passwordStudent.id, this.newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Contraseña actualizada');
          this.closePasswordModal();
          this.stopLoading();
        },
        error: (error) => {
          this.passwordError = error.error?.message || 'Error al cambiar contraseña';
          this.stopLoading();
        }
      });
  }

  // ==================== ASIGNACIÓN DE CURSOS ====================

  openAssignModal(student: UserResponse): void {
    this.selectedStudent = student;
    this.assignForm = {
      userId: student.id,
      courseId: this.courses.length > 0 ? this.courses[0].id : 0,
      planType: 'UNLIMITED',
      durationMonths: 3
    };
    this.assignFormError = '';
    this.showAssignModal = true;
    this.cdr.detectChanges();
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedStudent = null;
    this.cdr.detectChanges();
  }

  assignCourse(): void {
    if (!this.assignForm.courseId) {
      this.assignFormError = 'Selecciona un curso';
      this.cdr.detectChanges();
      return;
    }

    this.startLoading('Asignando curso...');
    this.assignFormError = '';

    this.adminService.assignCourse(this.assignForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Curso asignado exitosamente');
          this.closeAssignModal();
          this.loadData();
        },
        error: (error) => {
          this.assignFormError = error.error?.message || 'Error al asignar curso';
          this.stopLoading();
        }
      });
  }

  revokeAccess(userCourse: UserCourseResponse): void {
    if (confirm(`¿Revocar acceso al curso ${userCourse.courseTitle}?`)) {
      this.startLoading('Revocando acceso...');

      this.adminService.revokeAccess(userCourse.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('Acceso revocado');
            this.loadData();
          },
          error: () => {
            this.stopLoading();
          }
        });
    }
  }

  // ==================== GESTIÓN DE VIDEOS ====================

  openNewVideoModal(): void {
    if (!this.selectedCourseForVideos) {
      this.showSuccess('Selecciona un curso primero');
      return;
    }

    this.editingVideo = null;
    this.videoForm = {
      courseId: this.selectedCourseForVideos.id,
      title: '',
      description: '',
      videoUrl: '',
      thumbnailUrl: '',
      duration: '',
      type: 'PRACTICE',
      orderIndex: this.getNextVideoOrder()
    };
    this.videoFormError = '';
    this.showVideoModal = true;
    this.cdr.detectChanges();
  }

  openEditVideoModal(video: VideoResponse): void {
    if (!this.selectedCourseForVideos) return;

    this.editingVideo = video;
    this.videoForm = {
      courseId: this.selectedCourseForVideos.id,
      title: video.title,
      description: video.description || '',
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || '',
      duration: video.duration || '',
      type: video.type,
      orderIndex: video.orderIndex
    };
    this.videoFormError = '';
    this.showVideoModal = true;
    this.cdr.detectChanges();
  }

  closeVideoModal(): void {
    this.showVideoModal = false;
    this.editingVideo = null;
    this.cdr.detectChanges();
  }

  saveVideo(): void {
    if (!this.videoForm.title) {
      this.videoFormError = 'El título es requerido';
      this.cdr.detectChanges();
      return;
    }

    if (!this.videoForm.videoUrl) {
      this.videoFormError = 'La URL del video es requerida';
      this.cdr.detectChanges();
      return;
    }

    // Extraer ID de YouTube si es una URL completa
    this.videoForm.videoUrl = this.extractYoutubeId(this.videoForm.videoUrl);

    this.startLoading(this.editingVideo ? 'Actualizando video...' : 'Creando video...');
    this.videoFormError = '';

    const request = this.editingVideo
      ? this.adminService.updateVideo(this.editingVideo.id, this.videoForm)
      : this.adminService.createVideo(this.videoForm);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showSuccess(this.editingVideo ? 'Video actualizado' : 'Video creado');
        this.closeVideoModal();
        this.loadData();
      },
      error: (error) => {
        this.videoFormError = error.error?.message || 'Error al guardar video';
        this.stopLoading();
      }
    });
  }

  deleteVideo(video: VideoResponse): void {
    if (confirm(`¿Eliminar el video "${video.title}"? Esta acción no se puede deshacer.`)) {
      this.startLoading('Eliminando video...');

      this.adminService.deleteVideo(video.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('Video eliminado');
            this.loadData();
          },
          error: () => {
            this.stopLoading();
          }
        });
    }
  }

  /**
   * Extrae el ID de YouTube de una URL
   */
  extractYoutubeId(url: string): string {
    if (!url) return '';

    // Si ya es solo un ID (11 caracteres sin espacios ni /)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
      return url.trim();
    }

    // Patrones de URL de YouTube
    const patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Si no coincide con ningún patrón, devolver como está
    return url.trim();
  }

  /**
   * Genera thumbnail de YouTube
   */
  getYoutubeThumbnail(videoUrl: string): string {
    const videoId = this.extractYoutubeId(videoUrl);
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  /**
   * Obtiene el siguiente orden para un nuevo video
   */
  getNextVideoOrder(): number {
    if (!this.selectedCourseForVideos) return 0;
    const allVideos = [
      ...this.selectedCourseForVideos.theoryVideos,
      ...this.selectedCourseForVideos.practiceVideos
    ];
    if (allVideos.length === 0) return 0;
    return Math.max(...allVideos.map(v => v.orderIndex || 0)) + 1;
  }

  /**
   * Obtiene los videos del curso seleccionado
   */
  getVideosForSelectedCourse(): VideoResponse[] {
    if (!this.selectedCourseForVideos) return [];
    return [
      ...this.selectedCourseForVideos.theoryVideos,
      ...this.selectedCourseForVideos.practiceVideos
    ].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  // ==================== UTILIDADES ====================

  showSuccess(message: string): void {
    this.successMessage = message;
    this.stopLoading();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  getCourseName(courseId: number): string {
    const course = this.courses.find(c => c.id === courseId);
    return course ? course.title : 'Desconocido';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
