import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CourseResponse, UserCourseResponse, VideoResponse } from '../models';

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
  durationDays?: number;
  // Campos de pago
  amount?: number;
  currency?: 'PEN' | 'USD';
}

export interface ExtendAccessRequest {
  userCourseId: number;
  durationDays?: number;
  durationMonths?: number;
  amount?: number;
  currency?: 'PEN' | 'USD';
}

export interface CreateVideoRequest {
  courseId: number;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: string;
  type: 'THEORY' | 'PRACTICE';
  orderIndex?: number;
}

// ==================== DASHBOARD INTERFACES ====================

export interface DashboardStats {
  totalSalesAllTime: number;
  totalSalesThisMonth: number;
  totalPaymentsThisMonth: number;
  newSubscriptionsThisMonth: number;
  renewalsThisMonth: number;
  bunnyCosts: BunnyCostsInfo;
  netProfitThisMonth: number;
  developerShare: number;
  barberShare: number;
  developerPercentage: number;
  barberPercentage: number;
  isBunnyCostCovered: boolean;
  remainingAfterBunny: number;
  exchangeRateUsdToPen: number;
  exchangeRateLastUpdate: string;
  recentPayments: PaymentSummary[];
  currentMonth: number;
  currentYear: number;
  monthName: string;
}

export interface BunnyCostsInfo {
  storageUsedBytes: number;
  storageUsedGb: number;
  videoCount: number;
  storageCostUsd: number;
  storageCostPen: number;
  estimatedBandwidthCostUsd: number;
  estimatedBandwidthCostPen: number;
  totalCostUsd: number;
  totalCostPen: number;
  minimumMonthlyUsd: number;
  minimumMonthlyPen: number;
}

export interface PaymentSummary {
  id: number;
  studentName: string;
  courseName: string;
  amount: number;
  currency: string;
  amountInPen: number;
  paymentType: string;
  planDescription: string;
  paymentDate: string;
}

export interface ExchangeRateInfo {
  usdToPen: number;
  lastUpdate: string;
  source: string;
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

  getCourse(id: number): Observable<ApiResponse<CourseResponse>> {
    return this.http.get<ApiResponse<CourseResponse>>(`${this.API_URL}/courses/${id}`);
  }

  // ==================== VIDEOS ====================

  createVideo(data: CreateVideoRequest): Observable<ApiResponse<VideoResponse>> {
    return this.http.post<ApiResponse<VideoResponse>>(`${this.API_URL}/videos`, data);
  }

  updateVideo(id: number, data: CreateVideoRequest): Observable<ApiResponse<VideoResponse>> {
    return this.http.put<ApiResponse<VideoResponse>>(`${this.API_URL}/videos/${id}`, data);
  }

  deleteVideo(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/videos/${id}`);
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

  extendAccessWithPayment(data: ExtendAccessRequest): Observable<ApiResponse<UserCourseResponse>> {
    return this.http.post<ApiResponse<UserCourseResponse>>(
      `${this.API_URL}/user-courses/extend-with-payment`,
      data
    );
  }

  revokeAccess(userCourseId: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API_URL}/user-courses/${userCourseId}/revoke`, {});
  }

  // ==================== DASHBOARD ====================

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.API_URL}/dashboard/stats`);
  }

  getPaymentHistory(year?: number, month?: number): Observable<PaymentSummary[]> {
    let url = `${this.API_URL}/dashboard/payments`;
    if (year && month) {
      url += `?year=${year}&month=${month}`;
    }
    return this.http.get<PaymentSummary[]>(url);
  }

  getExchangeRate(): Observable<ExchangeRateInfo> {
    return this.http.get<ExchangeRateInfo>(`${this.API_URL}/dashboard/exchange-rate`);
  }
}
