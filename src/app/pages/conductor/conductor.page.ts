import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonSpinner, IonToggle,
  IonRefresher, IonRefresherContent, ToastController,
} from '@ionic/angular/standalone';
import { Subscription, interval, startWith, switchMap, catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Viaje } from '../../core/models';
import { mensajeError } from '../../core/interceptors';

@Component({
  selector: 'app-conductor',
  templateUrl: './conductor.page.html',
  styleUrl: './conductor.page.scss',
  imports: [CurrencyPipe, DecimalPipe, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonIcon,
    IonButton, IonSpinner, IonToggle, IonRefresher, IonRefresherContent],
})
export class ConductorPage {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastController);
  auth = inject(AuthService);

  enLinea = signal(this.leerEnLinea());
  solicitudes = signal<Viaje[]>([]);
  misViajes = signal<Viaje[]>([]);
  cargando = signal(false);
  aceptando = signal<number | null>(null);

  readonly activo = computed(() =>
    this.misViajes().find(v => ['aceptado', 'en_camino', 'en_curso'].includes(v.estado)) ?? null);
  readonly ganancias = computed(() => {
    const hoy = new Date().toDateString();
    const fin = this.misViajes().filter(v => v.estado === 'finalizado');
    return {
      hoy: fin.filter(v => new Date(v.created_at).toDateString() === hoy).reduce((s, v) => s + v.tarifa, 0),
      total: fin.reduce((s, v) => s + v.tarifa, 0),
      viajes: fin.length,
    };
  });

  private sub?: Subscription;

  ionViewWillEnter() {
    this.cargarMisViajes();
    if (this.enLinea()) this.escuchar();
  }

  ionViewWillLeave() { this.sub?.unsubscribe(); }

  cambiarEnLinea(v: boolean) {
    this.enLinea.set(v);
    try { localStorage.setItem('uber.enLinea', v ? '1' : '0'); } catch { /* */ }
    if (v) this.escuchar(); else { this.sub?.unsubscribe(); this.solicitudes.set([]); }
  }

  /** Revisa nuevas solicitudes cada 5 s mientras está en línea */
  private escuchar() {
    this.sub?.unsubscribe();
    this.cargando.set(true);
    this.sub = interval(5000).pipe(
      startWith(0),
      switchMap(() => this.api.disponibles().pipe(catchError(e => { this.aviso(mensajeError(e)); return of(null); }))),
    ).subscribe(lista => {
      this.cargando.set(false);
      if (lista) this.solicitudes.set(lista);
    });
  }

  refrescar(ev: CustomEvent) {
    this.cargarMisViajes();
    this.api.disponibles().subscribe({
      next: l => { this.solicitudes.set(l); (ev.target as HTMLIonRefresherElement).complete(); },
      error: () => (ev.target as HTMLIonRefresherElement).complete(),
    });
  }

  aceptar(v: Viaje) {
    this.aceptando.set(v.id);
    this.api.aceptar(v.id).subscribe({
      next: () => { this.aceptando.set(null); this.router.navigate(['/viaje', v.id]); },
      error: e => { this.aceptando.set(null); this.aviso(mensajeError(e)); },
    });
  }

  abrir(v: Viaje) { this.router.navigate(['/viaje', v.id]); }

  hace(fecha: string): string {
    const min = Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 60000));
    return min < 1 ? 'ahora' : min < 60 ? `hace ${min} min` : `hace ${Math.round(min / 60)} h`;
  }

  private cargarMisViajes() {
    this.api.historial().subscribe({ next: v => this.misViajes.set(v), error: () => {} });
  }

  private leerEnLinea() { try { return localStorage.getItem('uber.enLinea') === '1'; } catch { return false; } }

  private async aviso(message: string) {
    (await this.toast.create({ message, duration: 3000, position: 'top', color: 'dark' })).present();
  }
}
