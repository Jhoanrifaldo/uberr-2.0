import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input, output } from '@angular/core';
import * as L from 'leaflet';
import { Punto } from '../core/models';

/** Mapa Leaflet + OpenStreetMap con estilo claro tipo Uber. */
@Component({
  selector: 'app-mapa',
  template: `<div #el class="mapa"></div>`,
  styles: [`:host { display:block; position:absolute; inset:0; } .mapa { width:100%; height:100%; }`],
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('el', { static: true }) el!: ElementRef<HTMLDivElement>;
  centro = input<Punto | null>(null);
  clickMapa = output<{ lat: number; lng: number }>();

  private map?: L.Map;
  private capas: Record<string, L.Layer | undefined> = {};
  private ro?: ResizeObserver;

  ngAfterViewInit() {
    const c = this.centro() ?? { lat: 2.9273, lng: -75.2819 };
    this.map = L.map(this.el.nativeElement, { zoomControl: false, attributionControl: true })
      .setView([c.lat, c.lng], 15);
    // Teselas claras (CARTO Positron) — se parecen al mapa gris de Uber
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(this.map);
    L.control.zoom({ position: 'topright' }).addTo(this.map);
    this.map.on('click', e => this.clickMapa.emit({ lat: e.latlng.lat, lng: e.latlng.lng }));

    // Ionic monta la vista con animación: recalcular tamaño cuando cambie
    this.ro = new ResizeObserver(() => this.map?.invalidateSize());
    this.ro.observe(this.el.nativeElement);
    setTimeout(() => this.map?.invalidateSize(), 300);
  }

  ngOnDestroy() { this.ro?.disconnect(); this.map?.remove(); }

  centrar(p: { lat: number; lng: number }, zoom = 15) { this.map?.setView([p.lat, p.lng], zoom, { animate: true }); }

  marcarYo(p: Punto | null) { this.marcador('yo', p, 'yo'); }
  marcarOrigen(p: Punto | null) { this.marcador('origen', p, 'dot'); }
  marcarDestino(p: Punto | null) { this.marcador('destino', p, 'sq'); }
  marcarCarro(p: { lat: number; lng: number } | null) { this.marcador('carro', p, 'carro', '🚗'); }

  dibujarRuta(coords: [number, number][] | null) {
    this.quitar('ruta'); this.quitar('rutaBorde');
    if (!this.map || !coords?.length) return;
    this.capas['rutaBorde'] = L.polyline(coords, { color: '#fff', weight: 9, opacity: 1 }).addTo(this.map);
    this.capas['ruta'] = L.polyline(coords, { color: '#000', weight: 5, opacity: 1 }).addTo(this.map);
    this.map.fitBounds(L.latLngBounds(coords), { paddingTopLeft: [40, 40], paddingBottomRight: [40, 320] });
  }

  ajustar(puntos: { lat: number; lng: number }[]) {
    if (!this.map || !puntos.length) return;
    this.map.fitBounds(L.latLngBounds(puntos.map(p => [p.lat, p.lng] as [number, number])),
      { paddingTopLeft: [40, 40], paddingBottomRight: [40, 320], maxZoom: 16 });
  }

  private marcador(key: string, p: { lat: number; lng: number } | null, clase: string, contenido = '') {
    this.quitar(key);
    if (!this.map || !p) return;
    const size = clase === 'carro' ? 34 : 26;
    const icon = L.divIcon({
      className: 'u-pin', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      html: `<div class="${clase}">${contenido}</div>`,
    });
    this.capas[key] = L.marker([p.lat, p.lng], { icon, keyboard: false }).addTo(this.map);
  }

  private quitar(key: string) {
    const c = this.capas[key];
    if (c && this.map) this.map.removeLayer(c);
    this.capas[key] = undefined;
  }
}
