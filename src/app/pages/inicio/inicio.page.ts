import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  IonContent, IonIcon, IonButton, IonSpinner, IonInput, ActionSheetController, ToastController,
} from '@ionic/angular/standalone';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { MapaComponent } from '../../shared/mapa.component';
import { GeoService } from '../../core/geo.service';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Punto, TIPOS_DEFAULT, TipoVehiculo, Viaje } from '../../core/models';
import { mensajeError } from '../../core/interceptors';

type Paso = 'inicio' | 'buscar' | 'opciones';
type Campo = 'origen' | 'destino';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrl: './inicio.page.scss',
  imports: [FormsModule, CurrencyPipe, DecimalPipe, IonContent, IonIcon, IonButton, IonSpinner, IonInput, MapaComponent],
})
export class InicioPage implements OnInit {
  @ViewChild(MapaComponent) mapa!: MapaComponent;

  private geo = inject(GeoService);
  private api = inject(ApiService);
  private router = inject(Router);
  private actions = inject(ActionSheetController);
  private toast = inject(ToastController);
  auth = inject(AuthService);

  paso = signal<Paso>('inicio');
  campoActivo = signal<Campo>('destino');
  eligiendoEnMapa = signal(false);

  origen = signal<Punto | null>(null);
  destino = signal<Punto | null>(null);
  textoOrigen = '';
  textoDestino = '';
  resultados = signal<Punto[]>([]);
  buscando = signal(false);

  ruta = signal<{ km: number; min: number } | null>(null);
  tipos = signal<TipoVehiculo[]>(TIPOS_DEFAULT);
  tipoSel = signal<string>('uberx');
  pago = signal<'Efectivo' | 'Tarjeta' | 'Nequi'>('Efectivo');
  pidiendo = signal(false);
  recientes = signal<Punto[]>([]);

  readonly primerNombre = computed(() => (this.auth.usuario()?.name ?? '').split(' ')[0]);

  private busqueda$ = new Subject<string>();

  ngOnInit() {
    this.busqueda$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(t => { this.buscando.set(true); return this.geo.buscar(t, this.origen() ?? undefined); }),
    ).subscribe(r => { this.buscando.set(false); this.resultados.set(r); });

    this.api.tiposVehiculo().subscribe(t => this.tipos.set(t));
    this.cargarRecientes();
    this.ubicarme();
  }

  ionViewWillEnter() { this.cargarRecientes(); }

  async ubicarme() {
    const p = await this.geo.ubicacionActual();
    this.origen.set(p);
    this.textoOrigen = p.direccion;
    this.mapa?.marcarYo(p);
    this.mapa?.centrar(p);
  }

  // ---------- Paso 1 → 2 ----------
  abrirBusqueda(campo: Campo = 'destino') {
    this.campoActivo.set(campo);
    this.paso.set('buscar');
    this.resultados.set([]);
  }

  escribir(campo: Campo, texto: string) {
    this.campoActivo.set(campo);
    this.busqueda$.next(texto);
  }

  elegir(p: Punto) {
    if (this.campoActivo() === 'origen') {
      this.origen.set(p);
      this.textoOrigen = p.direccion;
      this.mapa.marcarOrigen(p);
      this.campoActivo.set('destino');
      this.resultados.set([]);
      if (!this.destino()) return;
    } else {
      this.destino.set(p);
      this.textoDestino = p.direccion;
    }
    this.calcularRuta();
  }

  activarSeleccionMapa() {
    this.eligiendoEnMapa.set(true);
    this.aviso(`Toca el mapa para elegir el ${this.campoActivo()}`);
  }

  async clickMapa(e: { lat: number; lng: number }) {
    if (!this.eligiendoEnMapa() && this.paso() !== 'inicio') return;
    if (this.paso() === 'inicio') { this.campoActivo.set('destino'); this.paso.set('buscar'); }
    this.eligiendoEnMapa.set(false);
    const direccion = await this.geo.direccionDe(e.lat, e.lng);
    this.elegir({ ...e, direccion });
  }

  // ---------- Paso 2 → 3 ----------
  private calcularRuta() {
    const o = this.origen(), d = this.destino();
    if (!o || !d) return;
    this.mapa.marcarYo(null);
    this.mapa.marcarOrigen(o);
    this.mapa.marcarDestino(d);
    this.geo.ruta(o, d).subscribe(r => {
      this.ruta.set({ km: r.km, min: r.min });
      this.mapa.dibujarRuta(r.coords);
      this.paso.set('opciones');
    });
  }

  precio(t: TipoVehiculo): number {
    const km = this.ruta()?.km ?? 0;
    return Math.round((t.base + t.porKm * km) / 100) * 100;
  }

  llegada(t: TipoVehiculo): string {
    const min = (this.ruta()?.min ?? 0) + (t.id === 'moto' ? 2 : 4);
    const d = new Date(Date.now() + min * 60000);
    return d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }

  get tipoActual(): TipoVehiculo {
    return this.tipos().find(t => t.id === this.tipoSel()) ?? this.tipos()[0];
  }

  async elegirPago() {
    const opciones: ('Efectivo' | 'Tarjeta' | 'Nequi')[] = ['Efectivo', 'Tarjeta', 'Nequi'];
    const sheet = await this.actions.create({
      header: 'Método de pago',
      buttons: [
        ...opciones.map(o => ({ text: o, handler: () => this.pago.set(o) })),
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    sheet.present();
  }

  confirmar() {
    const o = this.origen(), d = this.destino(), r = this.ruta();
    if (!o || !d || !r) return;
    this.pidiendo.set(true);
    this.api.crearViaje({
      origen: o, destino: d, tipo: this.tipoSel(),
      distancia_km: +r.km.toFixed(2), tarifa: this.precio(this.tipoActual), metodo_pago: this.pago(),
    }).subscribe({
      next: (v: Viaje) => {
        this.pidiendo.set(false);
        this.reiniciar();
        this.router.navigate(['/viaje', v.id]);
      },
      error: e => { this.pidiendo.set(false); this.aviso(mensajeError(e)); },
    });
  }

  // ---------- Navegación del sheet ----------
  atras() {
    if (this.paso() === 'opciones') { this.paso.set('buscar'); this.mapa.dibujarRuta(null); return; }
    this.reiniciar();
  }

  reiniciar() {
    this.paso.set('inicio');
    this.destino.set(null);
    this.textoDestino = '';
    this.ruta.set(null);
    this.resultados.set([]);
    this.eligiendoEnMapa.set(false);
    this.mapa?.dibujarRuta(null);
    this.mapa?.marcarOrigen(null);
    this.mapa?.marcarDestino(null);
    const o = this.origen();
    if (o) { this.mapa?.marcarYo(o); this.mapa?.centrar(o); }
  }

  private cargarRecientes() {
    this.api.historial().subscribe({
      next: vs => {
        const vistos = new Set<string>();
        const lista = vs.map(v => v.destino).filter(p => p.lat && !vistos.has(p.direccion) && vistos.add(p.direccion));
        this.recientes.set(lista.slice(0, 3));
      },
      error: () => this.recientes.set([]),
    });
  }

  private async aviso(message: string) {
    (await this.toast.create({ message, duration: 2500, position: 'top', color: 'dark' })).present();
  }
}
