import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonSpinner, IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonLabel, IonButton,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ESTADOS, Viaje } from '../../core/models';
import { mensajeError } from '../../core/interceptors';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrl: './historial.page.scss',
  imports: [CurrencyPipe, DatePipe, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonSpinner,
    IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonLabel, IonButton],
})
export class HistorialPage {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  viajes = signal<Viaje[]>([]);
  cargando = signal(true);
  error = signal('');
  filtro = signal<'todos' | 'activos' | 'pasados'>('todos');
  readonly ESTADOS = ESTADOS;

  readonly lista = computed(() => {
    const activos = ['pendiente', 'aceptado', 'en_camino', 'en_curso'];
    const v = this.viajes();
    if (this.filtro() === 'activos') return v.filter(x => activos.includes(x.estado));
    if (this.filtro() === 'pasados') return v.filter(x => !activos.includes(x.estado));
    return v;
  });

  ionViewWillEnter() { this.cargar(); }

  cargar(ev?: CustomEvent) {
    if (!ev) this.cargando.set(true);
    this.api.historial().subscribe({
      next: v => {
        this.viajes.set([...v].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)));
        this.cargando.set(false); this.error.set('');
        (ev?.target as HTMLIonRefresherElement | undefined)?.complete();
      },
      error: e => {
        this.cargando.set(false); this.error.set(mensajeError(e));
        (ev?.target as HTMLIonRefresherElement | undefined)?.complete();
      },
    });
  }

  abrir(v: Viaje) { this.router.navigate(['/viaje', v.id]); }

  icono(tipo: string) {
    return tipo === 'moto' ? 'bicycle' : tipo === 'xl' ? 'bus' : 'car-sport';
  }
}
