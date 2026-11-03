import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, delay, catchError, throwError } from 'rxjs';
import { ConfigService } from './config.service';
import { ENDPOINTS } from './endpoints';
import { EstadoViaje, Punto, TIPOS_DEFAULT, TipoVehiculo, Viaje } from './models';

/** Laravel suele envolver en { data: ... } (API Resources o paginación). */
export function unwrap<T = any>(r: any): T {
  if (r && typeof r === 'object' && 'data' in r) {
    const d = r.data;
    // paginado: { data: { data: [...] } }
    if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.data)) return d.data;
    return d;
  }
  return r;
}

export interface NuevoViaje {
  origen: Punto;
  destino: Punto;
  tipo: string;
  distancia_km: number;
  tarifa: number;
  metodo_pago: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private cfg = inject(ConfigService);

  private get demo() { return this.cfg.config().demo; }
  private url(p: string) { return this.cfg.baseUrl() + p; }

  /** Prueba de conexión: cualquier respuesta HTTP (incluso 401/404) = servidor vivo. */
  probarConexion(): Observable<{ ok: boolean; detalle: string }> {
    return this.http.get(this.url(ENDPOINTS.me), { observe: 'response' }).pipe(
      map(r => ({ ok: true, detalle: `Servidor respondió (${r.status})` })),
      catchError(err => of(err.status === 0
        ? { ok: false, detalle: 'Sin respuesta: IP/puerto incorrectos, otra red o CORS bloqueado.' }
        : { ok: true, detalle: `Servidor respondió (${err.status}). ¡Conexión OK!` })),
    );
  }

  tiposVehiculo(): Observable<TipoVehiculo[]> {
    if (this.demo) return of(TIPOS_DEFAULT);
    return this.http.get<any>(this.url(ENDPOINTS.tipos)).pipe(
      map(r => {
        const lista = unwrap<any[]>(r);
        if (!Array.isArray(lista) || !lista.length) return TIPOS_DEFAULT;
        return lista.map((t, i) => ({
          id: String(t.id ?? t.slug ?? i),
          nombre: t.nombre ?? t.name ?? 'Servicio',
          descripcion: t.descripcion ?? t.description ?? '',
          icono: t.icono ?? 'car-sport',
          base: Number(t.base ?? t.tarifa_base ?? 4500),
          porKm: Number(t.por_km ?? t.porKm ?? t.tarifa_km ?? 1300),
          asientos: Number(t.asientos ?? t.capacidad ?? 4),
        }));
      }),
      catchError(() => of(TIPOS_DEFAULT)), // si la ruta no existe, se usan los locales
    );
  }

  // ---------------- Pasajero ----------------

  crearViaje(v: NuevoViaje): Observable<Viaje> {
    if (this.demo) return this.demoCrear(v);
    const body = {
      origen_lat: v.origen.lat, origen_lng: v.origen.lng, origen_direccion: v.origen.direccion,
      destino_lat: v.destino.lat, destino_lng: v.destino.lng, destino_direccion: v.destino.direccion,
      tipo: v.tipo, tipo_vehiculo: v.tipo,
      distancia_km: v.distancia_km, tarifa: v.tarifa, precio: v.tarifa,
      metodo_pago: v.metodo_pago,
    };
    return this.http.post<any>(this.url(ENDPOINTS.viajes), body).pipe(map(r => this.normalizar(unwrap(r))));
  }

  historial(): Observable<Viaje[]> {
    if (this.demo) return of([...this.demoViajes].reverse()).pipe(delay(300));
    return this.http.get<any>(this.url(ENDPOINTS.viajes)).pipe(
      map(r => (unwrap<any[]>(r) || []).map(x => this.normalizar(x))),
    );
  }

  viaje(id: number | string): Observable<Viaje> {
    if (this.demo) {
      const v = this.demoViajes.find(x => x.id == id);
      return v ? of({ ...v }) : throwError(() => new Error('Viaje no encontrado'));
    }
    return this.http.get<any>(this.url(ENDPOINTS.viaje(id))).pipe(map(r => this.normalizar(unwrap(r))));
  }

  cancelar(id: number | string): Observable<Viaje> {
    if (this.demo) return this.demoEstado(id, 'cancelado');
    return this.http.put<any>(this.url(ENDPOINTS.cancelar(id)), {}).pipe(map(r => this.normalizar(unwrap(r))));
  }

  calificar(id: number | string, calificacion: number, comentario: string): Observable<unknown> {
    if (this.demo) {
      const v = this.demoViajes.find(x => x.id == id);
      if (v) v.calificacion = calificacion;
      return of(true).pipe(delay(300));
    }
    return this.http.post(this.url(ENDPOINTS.calificar(id)), { calificacion, comentario });
  }

  // ---------------- Conductor ----------------

  disponibles(): Observable<Viaje[]> {
    if (this.demo) return of(this.demoViajes.filter(v => v.estado === 'pendiente')).pipe(delay(300));
    return this.http.get<any>(this.url(ENDPOINTS.disponibles)).pipe(
      map(r => (unwrap<any[]>(r) || []).map(x => this.normalizar(x))),
    );
  }

  aceptar(id: number | string): Observable<Viaje> {
    if (this.demo) return this.demoEstado(id, 'aceptado');
    return this.http.put<any>(this.url(ENDPOINTS.aceptar(id)), {}).pipe(map(r => this.normalizar(unwrap(r))));
  }

  cambiarEstado(id: number | string, estado: EstadoViaje): Observable<Viaje> {
    if (this.demo) return this.demoEstado(id, estado);
    return this.http.put<any>(this.url(ENDPOINTS.estado(id)), { estado }).pipe(map(r => this.normalizar(unwrap(r))));
  }

  // ---------------- Normalización ----------------

  /** Acepta campos planos (origen_lat...) o anidados (origen: {lat...}). */
  normalizar(x: any): Viaje {
    const punto = (pref: 'origen' | 'destino'): Punto => {
      const o = typeof x?.[pref] === 'object' && x[pref] ? x[pref] : {};
      return {
        lat: Number(o.lat ?? x?.[`${pref}_lat`] ?? x?.[`${pref}_latitud`] ?? 0),
        lng: Number(o.lng ?? o.lon ?? x?.[`${pref}_lng`] ?? x?.[`${pref}_longitud`] ?? 0),
        direccion: o.direccion ?? x?.[`${pref}_direccion`] ?? (typeof x?.[pref] === 'string' ? x[pref] : 'Sin dirección'),
      };
    };
    const estadoRaw = String(x?.estado ?? x?.status ?? 'pendiente').toLowerCase().replace(/\s+/g, '_');
    const validos: EstadoViaje[] = ['pendiente', 'aceptado', 'en_camino', 'en_curso', 'finalizado', 'cancelado'];
    return {
      id: x?.id ?? 0,
      estado: (validos.includes(estadoRaw as EstadoViaje) ? estadoRaw : 'pendiente') as EstadoViaje,
      origen: punto('origen'),
      destino: punto('destino'),
      tipo: x?.tipo ?? x?.tipo_vehiculo ?? 'uberx',
      distancia_km: Number(x?.distancia_km ?? x?.distancia ?? 0),
      tarifa: Number(x?.tarifa ?? x?.precio ?? x?.valor ?? 0),
      created_at: x?.created_at ?? new Date().toISOString(),
      pasajero: x?.pasajero ?? x?.passenger ?? x?.user,
      conductor: x?.conductor ?? x?.driver,
      calificacion: x?.calificacion,
    };
  }

  // ---------------- Modo demo (sin backend) ----------------

  private demoViajes: Viaje[] = [
    {
      id: 101, estado: 'finalizado', tipo: 'uberx', distancia_km: 6.2, tarifa: 12560,
      created_at: new Date(Date.now() - 864e5 * 2).toISOString(), calificacion: 5,
      origen: { lat: 2.9345, lng: -75.2809, direccion: 'Parque Santander, Neiva' },
      destino: { lat: 2.9420, lng: -75.2950, direccion: 'C.C. San Pedro Plaza, Neiva' },
      conductor: { name: 'Carlos Ramírez', rating: 4.8, vehiculo: { placa: 'ABC123', modelo: 'Chevrolet Spark', color: 'Gris' } },
    },
    {
      id: 102, estado: 'pendiente', tipo: 'comfort', distancia_km: 3.4, tarifa: 11780,
      created_at: new Date().toISOString(),
      origen: { lat: 2.9273, lng: -75.2819, direccion: 'Malecón del Río Magdalena, Neiva' },
      destino: { lat: 2.9480, lng: -75.2890, direccion: 'Estadio Guillermo Plazas Alcid' },
      pasajero: { name: 'Laura Gómez', rating: 4.9 },
    },
  ];

  private demoCrear(v: NuevoViaje): Observable<Viaje> {
    const nuevo: Viaje = {
      id: Date.now(), estado: 'pendiente', origen: v.origen, destino: v.destino, tipo: v.tipo,
      distancia_km: v.distancia_km, tarifa: v.tarifa, created_at: new Date().toISOString(),
    };
    this.demoViajes.push(nuevo);
    // Simula que un conductor acepta y avanza el viaje
    const pasos: [EstadoViaje, number][] = [['aceptado', 4000], ['en_camino', 8000], ['en_curso', 14000], ['finalizado', 22000]];
    for (const [estado, ms] of pasos) {
      setTimeout(() => {
        if (nuevo.estado === 'cancelado') return;
        nuevo.estado = estado;
        nuevo.conductor = { name: 'Carlos Ramírez', rating: 4.8, phone: '3109876543',
          vehiculo: { placa: 'ABC123', modelo: 'Chevrolet Spark', color: 'Gris' } };
      }, ms);
    }
    return of({ ...nuevo }).pipe(delay(600));
  }

  private demoEstado(id: number | string, estado: EstadoViaje): Observable<Viaje> {
    const v = this.demoViajes.find(x => x.id == id);
    if (!v) return throwError(() => new Error('Viaje no encontrado'));
    v.estado = estado;
    return of({ ...v }).pipe(delay(300));
  }
}
