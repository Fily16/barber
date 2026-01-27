import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CourseResponse, UserCourseResponse } from '../models';

export interface UserResponse {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'STUDENT';
  active: boolean;
  createdAt: string;
  lastLogin: string;
  courses: UserCourseResponse[];
}

export interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
}

export interface AssignCourseRequest {
  userId: number;
  courseId: number;
  planType: 'UNLIMITED' | 'TEMPORAL';
  durationMonths?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly API_URL = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // ==================== ESTUDIANTES ====================

  getAllStudents(): Observable<ApiResponse<UserResponse[]>> {
    return this.http.get<ApiResponse<UserResponse[]>>(`${this.API_URL}/students`);
  }

  getStudent(id: number): Observable<ApiResponse<UserResponse>> {
    return this.http.get<ApiResponse<UserResponse>>(`${this.API_URL}/students/${id}`);
  }

  createStudent(data: CreateUserRequest): Observable<ApiResponse<UserResponse>> {
    return this.http.post<ApiResponse<UserResponse>>(`${this.API_URL}/students`, data);
  }

  updateStudent(id: number, data: CreateUserRequest): Observable<ApiResponse<UserResponse>> {
    return this.http.put<ApiResponse<UserResponse>>(`${this.API_URL}/students/${id}`, data);
  }

  deleteStudent(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/students/${id}`);
  }

  toggleStudentStatus(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API_URL}/students/${id}/toggle-status`, {});
  }

  resetPassword(id: number, password: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API_URL}/students/${id}/reset-password`, { password });
  }

  // ==================== CURSOS ====================

  getAllCourses(): Observable<ApiResponse<CourseResponse[]>> {
    return this.http.get<ApiResponse<CourseResponse[]>>(`${this.API_URL}/courses`);
  }

  // ==================== ASIGNACIÓN DE CURSOS ====================

  assignCourse(data: AssignCourseRequest): Observable<ApiResponse<UserCourseResponse>> {
    return this.http.post<ApiResponse<UserCourseResponse>>(`${this.API_URL}/assign-course`, data);
  }

  getStudentCourses(userId: number): Observable<ApiResponse<UserCourseResponse[]>> {
    return this.http.get<ApiResponse<UserCourseResponse[]>>(`${this.API_URL}/students/${userId}/courses`);
  }

  extendAccess(userCourseId: number, months: number): Observable<ApiResponse<UserCourseResponse>> {
    return this.http.patch<ApiResponse<UserCourseResponse>>(
      `${this.API_URL}/user-courses/${userCourseId}/extend`, 
      { months }
    );
  }

  revokeAccess(userCourseId: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API_URL}/user-courses/${userCourseId}/revoke`, {});
  }
}
