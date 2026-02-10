import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ==================== INTERFACES ====================

export interface EmailConfig {
  configured?: boolean;
  hasAppPassword?: boolean;
  senderEmail: string;
  appPassword?: string;
  senderName: string;
  enabled: boolean;
  logoUrl: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonUrl: string;
  welcomeSubject: string;
  welcomeTitle: string;
  welcomeMessage: string;
  welcomeButtonText: string;
  expiringSubject: string;
  expiringTitle: string;
  expiringMessage: string;
  expiringButtonText: string;
  expiredSubject: string;
  expiredTitle: string;
  expiredMessage: string;
  expiredButtonText: string;
}

export interface NotificationSettings {
  id?: number;
  adminWhatsApp: string;
  emailOnWelcome: boolean;
  emailOnExpiringSoon: boolean;
  emailDaysBeforeExpiry: number;
  emailOnExpired: boolean;
  whatsappOnWelcome: boolean;
  whatsappOnExpiringSoon: boolean;
  whatsappDaysBeforeExpiry: number;
  whatsappOnExpired: boolean;
  whatsappWelcomeTemplate: string;
  whatsappExpiringTemplate: string;
  whatsappExpiredTemplate: string;
  whatsappMassiveTemplate: string;
}

export interface MassiveEmailRequest {
  userIds: number[] | null;
  subject: string;
  message: string;
}

export interface WhatsAppLinksRequest {
  userIds: number[] | null;
  message: string;
}

export interface WhatsAppLink {
  userId: number;
  fullName: string;
  phone: string;
  whatsappLink: string;
}

export interface UserCourseExpiry {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  courseName: string;
  daysLeft: number;
  expiresAt: string;
}

export interface MassiveEmailResult {
  success: boolean;
  sent: number;
  failed: number;
  failedEmails: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/admin/notifications`;

  constructor(private http: HttpClient) {}

  // ==================== EMAIL CONFIG ====================

  getEmailConfig(): Observable<EmailConfig> {
    return this.http.get<EmailConfig>(`${this.apiUrl}/email/config`);
  }

  saveEmailConfig(config: EmailConfig): Observable<any> {
    return this.http.post(`${this.apiUrl}/email/config`, config);
  }

  sendTestEmail(toEmail: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/email/test?toEmail=${encodeURIComponent(toEmail)}`, {});
  }

  // ==================== NOTIFICATION SETTINGS ====================

  getSettings(): Observable<NotificationSettings> {
    return this.http.get<NotificationSettings>(`${this.apiUrl}/settings`);
  }

  saveSettings(settings: NotificationSettings): Observable<any> {
    return this.http.post(`${this.apiUrl}/settings`, settings);
  }

  // ==================== MASSIVE EMAIL ====================

  sendMassiveEmail(request: MassiveEmailRequest): Observable<MassiveEmailResult> {
    return this.http.post<MassiveEmailResult>(`${this.apiUrl}/email/massive`, request);
  }

  // ==================== WHATSAPP ====================

  generateWhatsAppLinks(request: WhatsAppLinksRequest): Observable<{ success: boolean; totalLinks: number; links: WhatsAppLink[] }> {
    return this.http.post<{ success: boolean; totalLinks: number; links: WhatsAppLink[] }>(`${this.apiUrl}/whatsapp/links`, request);
  }

  // ==================== EXPIRING COURSES ====================

  getExpiringCourses(days: number = 7): Observable<{ total: number; users: UserCourseExpiry[] }> {
    return this.http.get<{ total: number; users: UserCourseExpiry[] }>(`${this.apiUrl}/expiring?days=${days}`);
  }

  getExpiredCourses(): Observable<{ total: number; users: UserCourseExpiry[] }> {
    return this.http.get<{ total: number; users: UserCourseExpiry[] }>(`${this.apiUrl}/expired`);
  }

  notifyExpiringCourses(days: number = 7): Observable<{ success: boolean; usersFound: number; emailsSent: number }> {
    return this.http.post<{ success: boolean; usersFound: number; emailsSent: number }>(`${this.apiUrl}/expiring/notify?days=${days}`, {});
  }
}
