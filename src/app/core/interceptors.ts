import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** Añade el token Bearer y los headers que Laravel espera para responder JSON. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  let token: string | null = null;
  try { token = localStorage.getItem('uber.token'); } catch { /* */ }

  const esBackend = !/nominatim|router\.project-osrm|openstreetmap/.test(req.url);
  if (!esBackend) return next(req);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token && token !== 'demo-token') headers['Authorization'] = `Bearer ${token}`;

  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.endsWith('/login')) {
        try { localStorage.removeItem('uber.token'); localStorage.removeItem('uber.user'); } catch { /* */ }
        router.navigateByUrl('/login', { replaceUrl: true });
      }
      return throwError(() => err);
    }),
  );
};

/** Convierte cualquier error HTTP en un mensaje legible en español. */
export function mensajeError(err: any): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No hay conexión con el servidor. Revisa la IP, que estés en la misma red y que Laravel permita CORS.';
    }
    const e = err.error;
    if (e?.errors) {
      const primero = Object.values(e.errors)[0] as string[] | string;
      return Array.isArray(primero) ? primero[0] : String(primero);
    }
    if (e?.message) return e.message;
    if (err.status === 401) return 'Correo o contraseña incorrectos.';
    if (err.status === 404) return 'Ruta no encontrada en el backend (404). Revisa src/app/core/endpoints.ts.';
    if (err.status === 422) return 'Datos inválidos.';
    if (err.status >= 500) return 'Error interno del servidor.';
    return `Error ${err.status}`;
  }
  return err?.message ?? 'Ocurrió un error inesperado.';
}
