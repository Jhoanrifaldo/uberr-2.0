export type Rol = 'pasajero' | 'conductor';

export type EstadoViaje =
  | 'pendiente'
  | 'aceptado'
  | 'en_camino'
  | 'en_curso'
  | 'finalizado'
  | 'cancelado';

export interface Usuario {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: Rol;
  rating?: number;
  vehiculo?: { placa?: string; modelo?: string; color?: string };
}

export interface Punto {
  lat: number;
  lng: number;
  direccion: string;
}

export interface TipoVehiculo {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  base: number;      // tarifa base (COP)
  porKm: number;     // COP por km
  asientos: number;
}

export interface Viaje {
  id: number;
  estado: EstadoViaje;
  origen: Punto;
  destino: Punto;
  tipo: string;
  distancia_km: number;
  tarifa: number;
  created_at: string;
  pasajero?: Partial<Usuario>;
  conductor?: Partial<Usuario>;
  calificacion?: number;
}

export const ESTADOS: Record<EstadoViaje, { texto: string; color: string }> = {
  pendiente: { texto: 'Buscando conductor', color: 'warning' },
  aceptado: { texto: 'Conductor asignado', color: 'tertiary' },
  en_camino: { texto: 'Conductor en camino', color: 'tertiary' },
  en_curso: { texto: 'En viaje', color: 'success' },
  finalizado: { texto: 'Finalizado', color: 'medium' },
  cancelado: { texto: 'Cancelado', color: 'danger' },
};

export const TIPOS_DEFAULT: TipoVehiculo[] = [
  { id: 'uberx', nombre: 'UberX', descripcion: 'Viajes económicos', icono: 'car-sport', base: 4500, porKm: 1300, asientos: 4 },
  { id: 'comfort', nombre: 'Comfort', descripcion: 'Carros nuevos y espaciosos', icono: 'car', base: 6000, porKm: 1700, asientos: 4 },
  { id: 'xl', nombre: 'UberXL', descripcion: 'Para grupos de hasta 6', icono: 'bus', base: 8000, porKm: 2200, asientos: 6 },
  { id: 'moto', nombre: 'Moto', descripcion: 'Rápido entre el tráfico', icono: 'bicycle', base: 2500, porKm: 800, asientos: 1 },
];
