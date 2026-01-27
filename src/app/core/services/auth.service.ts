import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthResponse, AuthUser, LoginRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'ralph_cuts_token';
  private readonly USER_KEY = 'ralph_cuts_user';

  // Intervalo de verificación de sesión (30 segundos)
  private readonly SESSION_CHECK_INTERVAL = 30000;

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  // Subject para notificar cuando la sesión es invalidada
  private sessionInvalidSubject = new BehaviorSubject<boolean>(false);
  public sessionInvalid$ = this.sessionInvalidSubject.asObservable();

  // Subscription para el polling
  private sessionCheckSubscription: Subscription | null = null;

  constructor(private http: HttpClient) {
    console.log('=== AUTH SERVICE INIT ===');
    console.log('Stored token exists:', !!this.getToken());

    // Validar token al iniciar (sin borrar automáticamente)
    this.validateStoredToken();

    // Iniciar verificación periódica si hay token
    if (this.getToken()) {
      this.startSessionCheck();
    }
  }

  ngOnDestroy(): void {
    this.stopSessionCheck();
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    console.log('=== LOGIN CALLED ===');
    console.log('Credentials:', credentials.username, 'forceLogin:', credentials.forceLogin);

    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          console.log('Login response:', response);
          // Solo guardar si el login fue exitoso Y tiene token (no es hasActiveSession)
          if (response.success && response.data && response.data.token && !response.data.hasActiveSession) {
            console.log('Storing auth...');
            this.storeAuth(response.data);
            this.sessionInvalidSubject.next(false);
            this.startSessionCheck();
          } else {
            console.log('NOT storing auth - hasActiveSession:', response.data?.hasActiveSession);
          }
        }),
        catchError(error => {
          console.log('Login error:', error);
          if (error.error?.code === 'SESSION_INVALID') {
            this.clearAuth();
            return throwError(() => ({
              sessionInvalid: true,
              message: 'Sesión cerrada. Se inició sesión en otro dispositivo.'
            }));
          }
          return throwError(() => error);
        })
      );
  }

  logout(): Observable<ApiResponse<void>> {
    this.stopSessionCheck();
    return this.http.post<ApiResponse<void>>(`${this.API_URL}/logout`, {})
      .pipe(
        tap(() => this.clearAuth())
      );
  }

  /**
   * Valida el token con el backend
   * Retorna true si es válido, false si no
   */
  validateToken(): Observable<ApiResponse<AuthResponse>> {
    console.log('=== VALIDATE TOKEN CALLED ===');
    return this.http.get<ApiResponse<AuthResponse>>(`${this.API_URL}/validate`);
  }

  /**
   * Verifica si la sesión sigue siendo válida
   * Si no es válida, emite evento y limpia auth
   */
  checkSession(): void {
    const token = this.getToken();
    if (!token) {
      return;
    }

    console.log('=== CHECK SESSION ===');
    this.validateToken().subscribe({
      next: (response) => {
        console.log('Session check: VALID');
        // Sesión válida, no hacer nada
      },
      error: (error) => {
        console.log('Session check ERROR:', error.status, error.error);

        // Verificar si es error de sesión inválida
        const errorBody = error.error;
        const isSessionInvalid =
          error.status === 401 &&
          (errorBody?.code === 'SESSION_INVALID' ||
           errorBody?.message?.includes('otro dispositivo'));

        if (isSessionInvalid) {
          console.log('SESSION INVALID DETECTED - Notifying and clearing');
          this.sessionInvalidSubject.next(true);
          this.clearAuth();
          this.stopSessionCheck();
        }
        // Para otros errores 401 (token expirado, etc), también limpiar
        else if (error.status === 401) {
          console.log('Token expired or invalid - clearing');
          this.clearAuth();
          this.stopSessionCheck();
        }
      }
    });
  }

  /**
   * Inicia la verificación periódica de sesión
   */
  private startSessionCheck(): void {
    this.stopSessionCheck(); // Limpiar si ya existe

    console.log('Starting session check interval');
    this.sessionCheckSubscription = interval(this.SESSION_CHECK_INTERVAL)
      .subscribe(() => {
        this.checkSession();
      });
  }

  /**
   * Detiene la verificación periódica
   */
  private stopSessionCheck(): void {
    if (this.sessionCheckSubscription) {
      console.log('Stopping session check interval');
      this.sessionCheckSubscription.unsubscribe();
      this.sessionCheckSubscription = null;
    }
  }

  private validateStoredToken(): void {
    const token = this.getToken();
    console.log('=== VALIDATE STORED TOKEN ===');
    console.log('Token exists:', !!token);

    if (token) {
      console.log('Calling validateToken API...');
      this.validateToken().subscribe({
        next: (response) => {
          console.log('Token validation SUCCESS:', response);
          // Token válido, mantener auth
        },
        error: (error) => {
          console.log('Token validation FAILED:', error.status, error.error);

          // Solo limpiar si es error de sesión inválida o token expirado
          const errorBody = error.error;
          const isSessionInvalid =
            error.status === 401 &&
            (errorBody?.code === 'SESSION_INVALID' ||
             errorBody?.message?.includes('otro dispositivo'));

          if (isSessionInvalid) {
            console.log('Session invalid on startup - clearing and notifying');
            this.sessionInvalidSubject.next(true);
            this.clearAuth();
          } else if (error.status === 401) {
            // Token expirado o inválido
            console.log('Token invalid/expired on startup - clearing');
            this.clearAuth();
          }
          // Para otros errores (network, etc), NO limpiar el token
        }
      });
    } else {
      console.log('No token to validate');
    }
  }

  storeAuth(auth: AuthResponse): void {
    console.log('=== STORE AUTH ===');
    if (!auth.token) {
      console.log('No token to store!');
      return;
    }

    const user: AuthUser = {
      token: auth.token,
      username: auth.username,
      fullName: auth.fullName,
      role: auth.role
    };
    localStorage.setItem(this.TOKEN_KEY, auth.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    console.log('Auth stored successfully');
  }

  clearAuth(): void {
    console.log('=== CLEAR AUTH CALLED ===');
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): AuthUser | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }
}
