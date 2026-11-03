import { Component, OnDestroy, ViewChild, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, IonButton, IonSpinner, IonTextarea, AlertController, NavController, ToastController,
} from '@ionic/angular/standalone';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { MapaComponent } from '../../shared/mapa.component';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { GeoService } from '../../core/geo.service';
import { ESTADOS, EstadoViaje, Viaje } from '../../core/models';
import { mensajeError } from '../../core/interceptors';

@Component({
  selector: 'app-viaje',
  templateUrl: './viaje.page.html',
  styleUrl: './viaje.page.scss',
  imports: [CurrencyPipe, DecimalPipe, UpperCasePipe, FormsModule, IonContent, IonIcon, IonButton, IonSpinner, IonTextarea, MapaComponent],
})
export class ViajePage implements OnDestroy {
  @ViewChild(MapaComponent) mapa!: MapaComponent;

  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private geo = inject(GeoService);
  private alert = inject(AlertController);
  private toast = inject(ToastController);
  private nav = inject(NavController);
  auth = inject(AuthService);

  viaje = signal<Viaje | null>(null);
  error = signal('');
  accion = signal(false);
  estrellas = signal(0);
  comentario = '';
  calificado = signal(false);

  readonly ESTADOS = ESTADOS;
  readonly pasos: EstadoViaje[] = ['pendiente', 'aceptado', 'en_camino', 'en_curso', 'finalizado'];
  readonly indice = computed(() => this.pasos.indexOf(this.viaje()?.estado ?? 'pendiente'));
  readonly activo = computed(() => {
    const e = this.viaje()?.estado;
    return e !== 'finalizado' && e !== 'cancelado';
  });
  readonly puedeCancelar = computed(() => ['pendiente', 'aceptado', 'en_camino'].includes(this.viaje()?.estado ?? ''));

  /** Acción siguiente que puede hacer el conductor */
  readonly siguienteConductor = computed<{ texto: string; estado: EstadoViaje } | null>(() => {
    switch (this.viaje()?.estado) {
      case 'aceptado': return { texto: 'Voy a recoger al pasajero', estado: 'en_camino' };
      case 'en_camino': return { texto: 'Iniciar viaje', estado: 'en_curso' };
      case 'en_curso': return { texto: 'Finalizar viaje', estado: 'finalizado' };
      default: return null;
    }
  });

  private sub?: Subscription;
  private rutaCoords: [number, number][] = [];
  private rutaDibujada = false;

  ionViewDidEnter() {
    const id = this.route.snapshot.paramMap.get('id')!;
    // Consulta el estado cada 4 s para ver cuando el conductor acepta, llega, etc.
    this.sub = interval(4000).pipe(startWith(0), switchMap(() => this.api.viaje(id))).subscribe({
      next: v => this.actualizar(v),
      error: e => this.error.set(mensajeError(e)),
    });
  }

  ionViewWillLeave() { this.sub?.unsubscribe(); }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  private actualizar(v: Viaje) {
    this.viaje.set(v);
    this.error.set('');
    if (!this.rutaDibujada && v.origen.lat && v.destino.lat) {
      this.rutaDibujada = true;
      this.mapa.marcarOrigen(v.origen);
      this.mapa.marcarDestino(v.destino);
      this.geo.ruta(v.origen, v.destino).subscribe(r => { this.rutaCoords = r.coords; this.mapa.dibujarRuta(r.coords); this.moverCarro(v); });
    } else {
      this.moverCarro(v);
    }
    if (!this.activo()) this.sub?.unsubscribe();
  }

  /** Posición aproximada del carro según el estado (visual). */
  private moverCarro(v: Viaje) {
    if (!this.rutaCoords.length) return;
    const c = this.rutaCoords;
    let p: [number, number] | null = null;
    if (v.estado === 'aceptado') p = [v.origen.lat + 0.006, v.origen.lng - 0.004];
    if (v.estado === 'en_camino') p = [v.origen.lat + 0.002, v.origen.lng - 0.0015];
    if (v.estado === 'en_curso') p = c[Math.floor(c.length / 2)];
    if (v.estado === 'finalizado') p = c[c.length - 1];
    this.mapa.marcarCarro(p ? { lat: p[0], lng: p[1] } : null);
  }

  inicial(nombre?: string) { return (nombre ?? '?').trim().charAt(0).toUpperCase(); }

  async cancelar() {
    const a = await this.alert.create({
      header: '¿Cancelar el viaje?',
      message: 'El conductor dejará de dirigirse a tu ubicación.',
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Sí, cancelar', role: 'destructive', handler: () => this.ejecutar(this.api.cancelar(this.viaje()!.id)) },
      ],
    });
    a.present();
  }

  avanzar(estado: EstadoViaje) { this.ejecutar(this.api.cambiarEstado(this.viaje()!.id, estado)); }

  private ejecutar(obs: ReturnType<ApiService['cancelar']>) {
    this.accion.set(true);
    obs.subscribe({
      next: v => { this.accion.set(false); this.actualizar({ ...this.viaje()!, ...v, origen: this.viaje()!.origen, destino: this.viaje()!.destino }); },
      error: async e => {
        this.accion.set(false);
        (await this.toast.create({ message: mensajeError(e), duration: 3000, position: 'top', color: 'dark' })).present();
      },
    });
  }

  enviarCalificacion() {
    if (!this.estrellas()) return;
    this.accion.set(true);
    this.api.calificar(this.viaje()!.id, this.estrellas(), this.comentario).subscribe({
      next: () => { this.accion.set(false); this.calificado.set(true); },
      error: () => { this.accion.set(false); this.calificado.set(true); },
    });
  }

  salir() {
    this.nav.navigateRoot(this.auth.esConductor() ? '/app/conductor' : '/app/inicio');
  }
}
