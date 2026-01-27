import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  
  if (user && user.role === 'ADMIN') {
    return true;
  }

  // Si no es admin, redirigir al home
  router.navigate(['/']);
  return false;
};
