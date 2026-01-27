import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, UserResponse, CreateUserRequest, AssignCourseRequest } from '../../core/services/admin.service';
import { CourseResponse, UserCourseResponse } from '../../core/models';

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
  currentView: 'students' | 'courses' = 'students';

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

  // Mensajes
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
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
  }

  // ==================== LOGIN ====================

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
              return;
            }

            // Verificar rol de admin
            if (response.data.role === 'ADMIN') {
              this.isAuthenticated = true;
              this.loadData();
            } else {
              this.loginError = 'No tienes permisos de administrador';
              this.authService.clearAuth();
              this.isLoading = false;
            }
          } else {
            this.loginError = response.message || 'Error al iniciar sesión';
            this.isLoading = false;
          }
        },
        error: (error) => {
          this.isLoading = false;
          if (error.sessionInvalid) {
            this.loginError = 'Sesión cerrada. Se inició sesión en otro dispositivo.';
          } else if (error.status === 401) {
            this.loginError = 'Credenciales incorrectas';
          } else {
            this.loginError = 'Error de conexión';
          }
        }
      });
  }

  confirmForceLogin(): void {
    this.login(true);
  }

  cancelForceLogin(): void {
    this.showSessionModal = false;
    this.isLoading = false;
  }

  logout(): void {
    this.authService.logout().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isAuthenticated = false;
        this.username = '';
        this.password = '';
      },
      error: () => {
        this.authService.clearAuth();
        this.isAuthenticated = false;
      }
    });
  }

  // ==================== CARGA DE DATOS ====================

  loadData(): void {
    this.isLoading = true;

    forkJoin({
      students: this.adminService.getAllStudents(),
      courses: this.adminService.getAllCourses()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.students = result.students.data || [];
        this.courses = result.courses.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
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
  }

  closeStudentModal(): void {
    this.showStudentModal = false;
    this.editingStudent = null;
  }

  saveStudent(): void {
    if (!this.studentForm.username || !this.studentForm.fullName) {
      this.studentFormError = 'Usuario y nombre son requeridos';
      return;
    }

    if (!this.editingStudent && !this.studentForm.password) {
      this.studentFormError = 'La contraseña es requerida';
      return;
    }

    this.isLoading = true;
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
        this.isLoading = false;
      }
    });
  }

  toggleStatus(student: UserResponse): void {
    this.adminService.toggleStudentStatus(student.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Estudiante ${student.active ? 'desactivado' : 'activado'}`);
          this.loadData();
        }
      });
  }

  deleteStudent(student: UserResponse): void {
    if (confirm(`¿Eliminar a ${student.fullName}? Esta acción no se puede deshacer.`)) {
      this.adminService.deleteStudent(student.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('Estudiante eliminado');
            this.loadData();
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
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.passwordStudent = null;
  }

  savePassword(): void {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (!this.passwordStudent) return;

    this.isLoading = true;
    this.adminService.resetPassword(this.passwordStudent.id, this.newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Contraseña actualizada');
          this.closePasswordModal();
          this.isLoading = false;
        },
        error: (error) => {
          this.passwordError = error.error?.message || 'Error al cambiar contraseña';
          this.isLoading = false;
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
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedStudent = null;
  }

  assignCourse(): void {
    if (!this.assignForm.courseId) {
      this.assignFormError = 'Selecciona un curso';
      return;
    }

    this.isLoading = true;
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
          this.isLoading = false;
        }
      });
  }

  revokeAccess(userCourse: UserCourseResponse): void {
    if (confirm(`¿Revocar acceso al curso ${userCourse.courseTitle}?`)) {
      this.adminService.revokeAccess(userCourse.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('Acceso revocado');
            this.loadData();
          }
        });
    }
  }

  // ==================== UTILIDADES ====================

  showSuccess(message: string): void {
    this.successMessage = message;
    this.isLoading = false;
    setTimeout(() => this.successMessage = '', 3000);
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
