import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ServidorConfig {
  host: string;
  port: number;
  prefix: string;
  /** true = las peticiones van a /api y `ionic serve` las reenvía (evita CORS) */
  usarProxy: boolean;
  /** true = no llama al backend; usa datos de ejemplo */
  demo: boolean;
}

const KEY = 'uber.servidor';

/** Guarda y expone la dirección del backend (IP, puerto, prefijo). */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly defaults: ServidorConfig = {
    host: environment.apiHost,
    port: environment.apiPort,
    prefix: environment.apiPrefix,
    usarProxy: false,
    demo: false,
  };

  readonly config = signal<ServidorConfig>(this.leer());

  /** URL base final, ej. http://20.20.1.51:8000/api */
  readonly baseUrl = computed(() => {
    const c = this.config();
    if (c.usarProxy) return c.prefix;
    const host = c.host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `http://${host}:${c.port}${c.prefix}`;
  });

  guardar(c: ServidorConfig) {
    this.config.set(c);
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* sin storage */ }
  }

  restablecer() {
    try { localStorage.removeItem(KEY); } catch { /* sin storage */ }
    this.config.set({ ...this.defaults });
  }

  private leer(): ServidorConfig {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...this.defaults, ...JSON.parse(raw) };
    } catch { /* sin storage */ }
    return { ...this.defaults };
  }
}
