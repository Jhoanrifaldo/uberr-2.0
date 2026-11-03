import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.logueado() ? true : inject(Router).parseUrl('/login');
};

export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.logueado()) return true;
  return inject(Router).parseUrl(auth.esConductor() ? '/app/conductor' : '/app/inicio');
};

export const conductorGuard: CanActivateFn = () =>
  inject(AuthService).esConductor() ? true : inject(Router).parseUrl('/app/inicio');

export const pasajeroGuard: CanActivateFn = () =>
  !inject(AuthService).esConductor() ? true : inject(Router).parseUrl('/app/conductor');
