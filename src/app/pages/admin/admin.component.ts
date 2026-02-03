import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, UserResponse, CreateUserRequest, AssignCourseRequest, CreateVideoRequest } from '../../core/services/admin.service';
import { BunnyService, UploadProgress } from '../../core/services/bunny.service';
import { CourseResponse, UserCourseResponse, VideoResponse } from '../../core/models';
import { BunnyUploadUrlResponse } from '../../core/models/bunny.model';

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

  // ==================== BUNNY UPLOAD ====================
  selectedVideoFile: File | null = null;
  selectedThumbnailFile: File | null = null;
  thumbnailPreview: string | null = null;
  uploadProgress: UploadProgress = {
    state: 'pending',
    progress: 0,
    message: ''
  };
  isUploading = false;
  bunnyUploadData: BunnyUploadUrlResponse | null = null;

  // Estado para iOS
  isIOS = false;

  // Mensajes
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private bunnyService: BunnyService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Detectar iOS
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    console.log('[Admin] Dispositivo iOS detectado:', this.isIOS);

    // Configurar listener de visibilidad para iOS
    if (this.isIOS) {
      this.setupVisibilityListener();
    }

    // Verificar si ya está autenticado como admin
    const user = this.authService.getCurrentUser();
    if (user && user.role === 'ADMIN') {
      this.isAuthenticated = true;
      this.loadData();
    }

    // Suscribirse al progreso de upload
    this.bunnyService.getUploadProgress()
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.uploadProgress = progress;
        this.cdr.detectChanges();
      });
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

  // ==================== GESTIÓN DE VIDEOS CON BUNNY ====================

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
    this.selectedVideoFile = null;
    this.selectedThumbnailFile = null;
    this.thumbnailPreview = null;
    this.bunnyUploadData = null;
    this.bunnyService.resetProgress();
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
    this.selectedVideoFile = null;
    this.selectedThumbnailFile = null;
    this.thumbnailPreview = video.thumbnailUrl || null;
    this.bunnyUploadData = null;
    this.bunnyService.resetProgress();
    this.showVideoModal = true;
    this.cdr.detectChanges();
  }

  closeVideoModal(): void {
    if (this.isUploading) {
      if (!confirm('Hay un video subiendo. ¿Seguro que quieres cancelar?')) {
        return;
      }
    }
    this.showVideoModal = false;
    this.editingVideo = null;
    this.selectedVideoFile = null;
    this.selectedThumbnailFile = null;
    this.thumbnailPreview = null;
    this.bunnyUploadData = null;
    this.isUploading = false;
    this.bunnyService.resetProgress();
    this.cdr.detectChanges();
  }

  /**
   * Maneja la selección de archivo de video
   */
  onVideoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    console.log('[FileSelect] Evento change disparado');
    console.log('[FileSelect] input.files:', input.files);
    console.log('[FileSelect] input.files.length:', input.files?.length);

    if (!input.files || input.files.length === 0) {
      console.log('[FileSelect] No se seleccionó ningún archivo o fue cancelado');
      this.cdr.detectChanges();
      return;
    }

    const file = input.files[0];
    console.log('[FileSelect] Archivo recibido:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Validar que el archivo tenga tamaño (en iOS a veces viene vacío)
    if (file.size === 0) {
      console.error('[FileSelect] Archivo con tamaño 0 - posible error de iOS');
      this.videoFormError = 'El archivo parece estar vacío. Intenta seleccionarlo desde la app Archivos.';
      this.selectedVideoFile = null;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    // Validar tipo de archivo - más permisivo para iOS
    const extension = file.name.toLowerCase().split('.').pop() || '';
    const validExtensions = ['mp4', 'webm', 'mov', 'avi', 'm4v', 'mkv', '3gp'];

    // En iOS, el tipo MIME puede venir vacío o incorrecto para videos
    const isValidByExtension = validExtensions.includes(extension);
    const isValidByType = !file.type || file.type.startsWith('video/');

    if (!isValidByExtension && !isValidByType) {
      this.videoFormError = 'Formato no válido. Usa MP4, WebM, MOV o AVI.';
      this.selectedVideoFile = null;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    // Validar tamaño (max 15GB)
    const maxSize = 15 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      this.videoFormError = 'El archivo es muy grande. Máximo 15GB.';
      this.selectedVideoFile = null;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    // Info del tamaño
    const fileSizeGB = file.size / (1024 * 1024 * 1024);
    const fileSizeMB = file.size / (1024 * 1024);

    // Advertencia para archivos grandes
    if (fileSizeGB > 2) {
      console.warn('[FileSelect] Archivo grande:', fileSizeGB.toFixed(2), 'GB');
      this.videoFormError = `⚠️ Archivo grande (${fileSizeGB.toFixed(1)} GB). La subida puede tardar varios minutos.`;
    } else {
      this.videoFormError = '';
    }

    this.selectedVideoFile = file;

    // Si no hay título, usar nombre del archivo
    if (!this.videoForm.title) {
      this.videoForm.title = file.name.replace(/\.[^/.]+$/, '');
    }

    console.log('[FileSelect] ✅ Archivo procesado exitosamente:', file.name, `(${fileSizeMB.toFixed(1)} MB)`);
    this.cdr.detectChanges();
  }

  /**
   * Abre el selector de archivos
   */
  openFileSelector(inputElement: HTMLInputElement): void {
    console.log('[FileSelector] Abriendo selector');

    // Resetear el input para permitir seleccionar el mismo archivo
    inputElement.value = '';
    this.videoFormError = '';

    // Click en el input
    inputElement.click();
  }

  /**
   * Detecta cuando la app vuelve al foco (para debugging)
   */
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[Visibility] App visible de nuevo');
        // Forzar detección de cambios por si iOS no lo hizo
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Maneja la selección de thumbnail
   */
  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.videoFormError = 'Formato de imagen no válido. Usa JPG, PNG o WebP.';
        this.cdr.detectChanges();
        return;
      }

      // Validar tamaño (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.videoFormError = 'La imagen es muy grande. Máximo 5MB.';
        this.cdr.detectChanges();
        return;
      }

      this.selectedThumbnailFile = file;
      this.videoFormError = '';

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.thumbnailPreview = e.target?.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remueve el thumbnail seleccionado
   */
  removeThumbnail(): void {
    this.selectedThumbnailFile = null;
    this.thumbnailPreview = null;
    this.videoForm.thumbnailUrl = '';
    this.cdr.detectChanges();
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Guarda el video (crear nuevo o actualizar existente)
   */
  async saveVideo(): Promise<void> {
    // Validaciones
    if (!this.videoForm.title) {
      this.videoFormError = 'El título es requerido';
      this.cdr.detectChanges();
      return;
    }

    // Para nuevo video, necesita archivo
    if (!this.editingVideo && !this.selectedVideoFile) {
      this.videoFormError = 'Selecciona un archivo de video';
      this.cdr.detectChanges();
      return;
    }

    this.videoFormError = '';

    if (this.editingVideo) {
      // Actualizar video existente
      this.updateExistingVideo();
    } else {
      // Crear nuevo video con upload a Bunny
      await this.createNewVideoWithBunny();
    }
  }

  /**
   * Crea un nuevo video subiendo a Bunny
   */
  private async createNewVideoWithBunny(): Promise<void> {
    if (!this.selectedVideoFile) return;

    this.isUploading = true;
    this.videoFormError = '';

    try {
      // 1. Crear video en Bunny y obtener URL de upload
      this.bunnyService.createVideo(this.videoForm.title)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (uploadData) => {
            console.log('Bunny upload data:', uploadData);
            this.bunnyUploadData = uploadData;

            // 2. Subir archivo a Bunny CDN
            this.bunnyService.uploadVideoToBunny(this.selectedVideoFile!, uploadData)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (progress) => {
                  this.uploadProgress = progress;
                  this.cdr.detectChanges();

                  if (progress.state === 'completed') {
                    // 3. Guardar en backend con el videoId de Bunny
                    this.saveVideoToBackend(uploadData);
                  }
                },
                error: (error) => {
                  console.error('Error uploading to Bunny:', error);
                  this.videoFormError = 'Error al subir el video. Intenta de nuevo.';
                  this.isUploading = false;
                  this.cdr.detectChanges();
                }
              });
          },
          error: (error) => {
            console.error('Error creating video in Bunny:', error);
            this.videoFormError = error.error?.message || 'Error al crear el video en Bunny';
            this.isUploading = false;
            this.cdr.detectChanges();
          }
        });
    } catch (error) {
      console.error('Error in createNewVideoWithBunny:', error);
      this.videoFormError = 'Error inesperado. Intenta de nuevo.';
      this.isUploading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Guarda el video en el backend después de subirlo a Bunny
   */
  private saveVideoToBackend(uploadData: BunnyUploadUrlResponse): void {
    // Preparar datos para el backend
    const videoData: CreateVideoRequest = {
      courseId: this.videoForm.courseId,
      title: this.videoForm.title,
      description: this.videoForm.description,
      videoUrl: uploadData.videoId, // Guardamos el videoId de Bunny
      thumbnailUrl: uploadData.thumbnailUrl,
      duration: this.videoForm.duration,
      type: this.videoForm.type,
      orderIndex: this.videoForm.orderIndex
    };

    this.adminService.createVideo(videoData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('¡Video subido y guardado exitosamente!');
          this.isUploading = false;
          this.closeVideoModal();
          this.loadData();
        },
        error: (error) => {
          console.error('Error saving video to backend:', error);
          this.videoFormError = error.error?.message || 'Error al guardar el video';
          this.isUploading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Actualiza un video existente (solo metadatos)
   */
  private updateExistingVideo(): void {
    if (!this.editingVideo) return;

    this.startLoading('Actualizando video...');

    // Si hay nuevo archivo, primero subirlo
    if (this.selectedVideoFile) {
      this.isUploading = true;
      this.stopLoading();

      this.bunnyService.createVideo(this.videoForm.title)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (uploadData) => {
            this.bunnyUploadData = uploadData;

            this.bunnyService.uploadVideoToBunny(this.selectedVideoFile!, uploadData)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (progress) => {
                  this.uploadProgress = progress;
                  this.cdr.detectChanges();

                  if (progress.state === 'completed') {
                    // Actualizar con nuevo videoId
                    this.videoForm.videoUrl = uploadData.videoId;
                    this.videoForm.thumbnailUrl = uploadData.thumbnailUrl;
                    this.performVideoUpdate();
                  }
                },
                error: (error) => {
                  console.error('Error uploading new video:', error);
                  this.videoFormError = 'Error al subir el nuevo video';
                  this.isUploading = false;
                  this.cdr.detectChanges();
                }
              });
          },
          error: (error) => {
            this.videoFormError = error.error?.message || 'Error al crear video en Bunny';
            this.isUploading = false;
            this.cdr.detectChanges();
          }
        });
    } else {
      // Solo actualizar metadatos
      this.performVideoUpdate();
    }
  }

  /**
   * Realiza la actualización del video en el backend
   */
  private performVideoUpdate(): void {
    if (!this.editingVideo) return;

    const videoData: CreateVideoRequest = {
      courseId: this.videoForm.courseId,
      title: this.videoForm.title,
      description: this.videoForm.description,
      videoUrl: this.videoForm.videoUrl,
      thumbnailUrl: this.videoForm.thumbnailUrl,
      duration: this.videoForm.duration,
      type: this.videoForm.type,
      orderIndex: this.videoForm.orderIndex
    };

    this.adminService.updateVideo(this.editingVideo.id, videoData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Video actualizado');
          this.isUploading = false;
          this.closeVideoModal();
          this.loadData();
        },
        error: (error) => {
          this.videoFormError = error.error?.message || 'Error al actualizar video';
          this.isUploading = false;
          this.stopLoading();
        }
      });
  }

  deleteVideo(video: VideoResponse): void {
    if (confirm(`¿Eliminar el video "${video.title}"? Esta acción no se puede deshacer.`)) {
      this.startLoading('Eliminando video...');

      // Primero eliminar de Bunny si tiene videoId
      if (video.videoUrl && !video.videoUrl.includes('youtube')) {
        this.bunnyService.deleteVideo(video.videoUrl)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Luego eliminar del backend
              this.deleteVideoFromBackend(video.id);
            },
            error: (error) => {
              console.warn('Error deleting from Bunny (continuing):', error);
              // Continuar eliminando del backend aunque falle Bunny
              this.deleteVideoFromBackend(video.id);
            }
          });
      } else {
        this.deleteVideoFromBackend(video.id);
      }
    }
  }

  private deleteVideoFromBackend(videoId: number): void {
    this.adminService.deleteVideo(videoId)
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

  /**
   * Genera thumbnail de Bunny o placeholder
   */
  getVideoThumbnail(video: VideoResponse): string {
    if (video.thumbnailUrl) {
      return video.thumbnailUrl;
    }
    // Placeholder si no hay thumbnail
    return 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
        <rect fill="#1a1a1a" width="320" height="180"/>
        <polygon fill="#333" points="160,70 200,90 160,110" />
      </svg>
    `);
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
