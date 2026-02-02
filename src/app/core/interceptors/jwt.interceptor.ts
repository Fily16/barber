import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// URLs externas que NO deben ser interceptadas
const EXCLUDED_URLS = [
  'bunnycdn.com',
  'b-cdn.net',
  'mediadelivery.net'
];

/**
 * Verifica si la URL debe ser excluida del interceptor
 */
function isExcludedUrl(url: string): boolean {
  return EXCLUDED_URLS.some(excluded => url.includes(excluded));
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // NO interceptar requests a servicios externos (Bunny CDN, etc.)
  if (isExcludedUrl(req.url)) {
    console.log('Skipping JWT interceptor for external URL:', req.url);
    return next(req);
  }

  const token = authService.getToken();

  // Clonar request y agregar token si existe
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('=== JWT INTERCEPTOR ERROR ===');
      console.log('Status:', error.status);
      console.log('Error body:', error.error);
      console.log('URL:', req.url);

      // Si es 401 y el mensaje indica sesión en otro dispositivo
      if (error.status === 401) {
        const errorBody = error.error;

        console.log('401 Error - checking for SESSION_INVALID');
        console.log('Error code:', errorBody?.code);
        console.log('Error message:', errorBody?.message);

        // Verificar si es por sesión en otro dispositivo
        if (errorBody?.code === 'SESSION_INVALID' ||
            errorBody?.message?.includes('otro dispositivo')) {
          console.log('SESSION_INVALID detected! Clearing auth...');
          authService.clearAuth();
          // Emitir error especial para que el componente lo maneje
          return throwError(() => ({
            ...error,
            sessionInvalid: true,
            message: 'Sesión iniciada en otro dispositivo'
          }));
        }

        // Token expirado o inválido
        console.log('Other 401 error - clearing auth');
        authService.clearAuth();
      }

      return throwError(() => error);
    })
  );
};
