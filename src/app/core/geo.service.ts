import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { Punto } from './models';

/** Búsqueda de direcciones y rutas con servicios gratuitos de OpenStreetMap. */
@Injectable({ providedIn: 'root' })
export class GeoService {
  private http = inject(HttpClient);

  /** Centro por defecto si el navegador no da ubicación (Neiva, Huila). */
  readonly centroDefecto: Punto = { lat: 2.9273, lng: -75.2819, direccion: 'Neiva, Huila' };

  ubicacionActual(): Promise<Punto> {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(this.centroDefecto);
      navigator.geolocation.getCurrentPosition(
        async p => {
          const lat = p.coords.latitude, lng = p.coords.longitude;
          const direccion = await this.direccionDe(lat, lng);
          resolve({ lat, lng, direccion });
        },
        () => resolve(this.centroDefecto),
        { enableHighAccuracy: true, timeout: 6000 },
      );
    });
  }

  buscar(texto: string, cerca?: Punto): Observable<Punto[]> {
    if (!texto || texto.trim().length < 3) return of([]);
    let url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=co&accept-language=es&q=${encodeURIComponent(texto)}`;
    if (cerca) {
      const d = 0.4;
      url += `&viewbox=${cerca.lng - d},${cerca.lat + d},${cerca.lng + d},${cerca.lat - d}`;
    }
    return this.http.get<any[]>(url).pipe(
      map(r => r.map(x => ({ lat: +x.lat, lng: +x.lon, direccion: this.acortar(x.display_name) }))),
      catchError(() => of([])),
    );
  }

  async direccionDe(lat: number, lng: number): Promise<string> {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&accept-language=es&lat=${lat}&lon=${lng}`);
      const j = await r.json();
      return this.acortar(j.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  /** Ruta por calles (OSRM). Si falla, línea recta. */
  ruta(a: Punto, b: Punto): Observable<{ coords: [number, number][]; km: number; min: number }> {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    return this.http.get<any>(url).pipe(
      map(r => {
        const route = r.routes[0];
        return {
          coords: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
          km: route.distance / 1000,
          min: Math.max(1, Math.round(route.duration / 60)),
        };
      }),
      catchError(() => {
        const km = this.distanciaKm(a, b) * 1.3;
        return of({ coords: [[a.lat, a.lng], [b.lat, b.lng]] as [number, number][], km, min: Math.max(1, Math.round(km * 2.5)) });
      }),
    );
  }

  distanciaKm(a: Punto, b: Punto): number {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  private acortar(s: string): string {
    return s.split(',').slice(0, 3).join(',').trim();
  }
}
