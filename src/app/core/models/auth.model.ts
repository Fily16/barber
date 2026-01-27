export interface LoginRequest {
  username: string;
  password: string;
  forceLogin?: boolean; // Si es true, cierra la sesión anterior
}

export interface AuthResponse {
  token: string | null;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'STUDENT';
  message: string;
  hasActiveSession: boolean; // Indica si hay sesión activa en otro dispositivo
}

export interface AuthUser {
  token: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'STUDENT';
}
