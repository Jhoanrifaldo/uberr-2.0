import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, map, catchError, delay } from 'rxjs';
import { ConfigService } from './config.service';
import { ENDPOINTS } from './endpoints';
import { Rol, Usuario } from './models';
import { unwrap } from './api.service';

const TOKEN_KEY = 'uber.token';
const USER_KEY = 'uber.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private cfg = inject(ConfigService);
  private router = inject(Router);

  readonly usuario = signal<Usuario | null>(this.leerUsuario());
  readonly logueado = computed(() => !!this.usuario() && !!this.token);
  readonly esConductor = computed(() => this.usuario()?.role === 'conductor');

  get token(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  login(email: string, password: string): Observable<Usuario> {
    if (this.cfg.config().demo) {
      const rol: Rol = email.toLowerCase().includes('conductor') ? 'conductor' : 'pasajero';
      return of({ token: 'demo-token', user: this.usuarioDemo(email, rol) }).pipe(
        delay(500), map(r => this.guardarSesion(r)));
    }
    return this.http.post<any>(this.url(ENDPOINTS.login), { email, password, device_name: 'ionic' })
      .pipe(map(r => this.guardarSesion(r)));
  }

  registrar(datos: { name: string; email: string; phone: string; password: string; role: Rol }): Observable<Usuario> {
    if (this.cfg.config().demo) {
      return of({ token: 'demo-token', user: this.usuarioDemo(datos.email, datos.role, datos.name) }).pipe(
        delay(500), map(r => this.guardarSesion(r)));
    }
    const body = { ...datos, password_confirmation: datos.password };
    return this.http.post<any>(this.url(ENDPOINTS.register), body).pipe(
      map(r => {
        // Algunos backends no devuelven token al registrarse
        if (this.extraerToken(r)) return this.guardarSesion(r);
        return { id: 0, name: datos.name, email: datos.email, role: datos.role } as Usuario;
      }),
    );
  }

  /** Vuelve a pedir el usuario autenticado al backend */
  refrescar(): Observable<Usuario | null> {
    if (this.cfg.config().demo || !this.token) return of(this.usuario());
    return this.http.get<any>(this.url(ENDPOINTS.me)).pipe(
      map(r => this.normalizarUsuario(unwrap(r))),
      tap(u => this.setUsuario(u)),
      catchError(() => of(this.usuario())),
    );
  }

  actualizarPerfil(cambios: Partial<Usuario>): Observable<Usuario> {
    const actual = this.usuario()!;
    if (this.cfg.config().demo) {
      const u = { ...actual, ...cambios };
      this.setUsuario(u);
      return of(u).pipe(delay(300));
    }
    return this.http.put<any>(this.url(ENDPOINTS.updateProfile), cambios).pipe(
      map(r => ({ ...actual, ...this.normalizarUsuario(unwrap(r)) })),
      tap(u => this.setUsuario(u)),
    );
  }

  logout() {
    const salir = () => {
      try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch { /* */ }
      this.usuario.set(null);
      this.router.navigateByUrl('/login', { replaceUrl: true });
    };
    if (this.cfg.config().demo || !this.token) return salir();
    this.http.post(this.url(ENDPOINTS.logout), {}).subscribe({ complete: salir, error: salir });
  }

  // ---------- helpers ----------

  private url(path: string) { return this.cfg.baseUrl() + path; }

  private guardarSesion(r: any): Usuario {
    const token = this.extraerToken(r);
    if (!token) throw new Error('El servidor no devolvió un token.');
    const datos = r?.data ?? r;
    const user = this.normalizarUsuario(datos.user ?? datos.usuario ?? datos);
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* */ }
    this.setUsuario(user);
    return user;
  }

  /** Acepta los formatos típicos de Laravel: token, access_token, plainTextToken... */
  private extraerToken(r: any): string | null {
    const d = r?.data ?? r ?? {};
    return d.token ?? d.access_token ?? d.plainTextToken ?? d.token?.plainTextToken ?? r?.token ?? null;
  }

  private normalizarUsuario(u: any): Usuario {
    const rolRaw = String(u?.role ?? u?.rol ?? u?.tipo ?? 'pasajero').toLowerCase();
    return {
      id: u?.id ?? 0,
      name: u?.name ?? u?.nombre ?? 'Usuario',
      email: u?.email ?? '',
      phone: u?.phone ?? u?.telefono ?? '',
      role: rolRaw.includes('conduc') || rolRaw.includes('driver') ? 'conductor' : 'pasajero',
      rating: u?.rating ?? u?.calificacion ?? 4.9,
      vehiculo: u?.vehiculo ?? (u?.placa ? { placa: u.placa, modelo: u.modelo, color: u.color } : undefined),
    };
  }

  private setUsuario(u: Usuario | null) {
    this.usuario.set(u);
    try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch { /* */ }
  }

  private leerUsuario(): Usuario | null {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  }

  private usuarioDemo(email: string, role: Rol, name?: string): Usuario {
    return {
      id: 1, email, role,
      name: name || (role === 'conductor' ? 'Carlos Conductor' : 'Jhoan Pasajero'),
      phone: '3001234567', rating: 4.9,
      vehiculo: role === 'conductor' ? { placa: 'ABC123', modelo: 'Chevrolet Spark', color: 'Gris' } : undefined,
    };
  }
}
