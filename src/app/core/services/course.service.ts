import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CourseResponse, UserCourseResponse, VideoResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private readonly API_URL = `${environment.apiUrl}/student`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene un curso por su slug (verifica acceso del usuario)
   */
  getCourse(slug: string): Observable<ApiResponse<CourseResponse>> {
    return this.http.get<ApiResponse<CourseResponse>>(`${this.API_URL}/courses/${slug}`);
  }

  /**
   * Obtiene los cursos asignados al estudiante actual
   */
  getMyCourses(): Observable<ApiResponse<UserCourseResponse[]>> {
    return this.http.get<ApiResponse<UserCourseResponse[]>>(`${this.API_URL}/my-courses`);
  }

  /**
   * Obtiene el video de portada de un curso (endpoint público, sin autenticación)
   */
  getCourseCover(slug: string): Observable<ApiResponse<VideoResponse>> {
    return this.http.get<ApiResponse<VideoResponse>>(`${environment.apiUrl}/public/courses/${slug}/cover`);
  }
}
