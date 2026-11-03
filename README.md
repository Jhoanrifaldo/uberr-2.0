# Uber Front — Ionic + Angular

Front-end estilo Uber. El backend Laravel del profesor se conecta por IP: **`http://20.20.1.51:8000/api`**.

## Cómo correrlo

```bash
npm install
ionic serve          # o: npm start
```

Abre `http://localhost:8100`. Si no tienes el CLI de Ionic: `npm install -g @ionic/cli`.

## Cambiar la IP del backend

Dos formas (la segunda tiene prioridad):

1. **En el código:** `src/environments/environment.ts` → `apiHost`.
2. **Desde la app:** en el login toca el botón con la IP (arriba a la derecha) → pantalla *Servidor* → escribe la IP → *Probar conexión* → *Guardar*.

## Si sale "No hay conexión con el servidor"

- Debes estar en la **misma red** que el servidor del profesor (20.20.1.51).
- **CORS:** el navegador bloquea peticiones de `localhost:8100` a otra IP si Laravel no lo permite.
  - Solución rápida sin tocar el backend: en *Servidor* activa **Usar proxy de desarrollo** (usa `proxy.conf.json`, solo funciona con `ionic serve`).
  - O pídele al profesor que en `config/cors.php` tenga `'paths' => ['api/*']` y `'allowed_origins' => ['*']`.

## Modo demo

En *Servidor* activa **Modo demo** para mostrar toda la app sin backend (datos de ejemplo, el conductor "acepta" el viaje solo). Entra con cualquier correo; si el correo contiene `conductor`, entras como conductor.

## Rutas del backend

Todas están en **`src/app/core/endpoints.ts`**. Si el profesor usa otros nombres (por ejemplo `/trips` en vez de `/viajes`), cámbialos solo ahí.

| Acción | Método y ruta | Body |
|---|---|---|
| Login | `POST /login` | `email, password` → espera `token` + `user` |
| Registro | `POST /register` | `name, email, phone, password, password_confirmation, role` |
| Usuario actual | `GET /user` | — |
| Editar perfil | `PUT /user` | `name, phone` |
| Cerrar sesión | `POST /logout` | — |
| Pedir viaje | `POST /viajes` | `origen_lat, origen_lng, origen_direccion, destino_lat, destino_lng, destino_direccion, tipo, distancia_km, tarifa, metodo_pago` |
| Historial | `GET /viajes` | — |
| Detalle | `GET /viajes/{id}` | — |
| Cancelar | `PUT /viajes/{id}/cancelar` | — |
| Calificar | `POST /viajes/{id}/calificar` | `calificacion, comentario` |
| Solicitudes (conductor) | `GET /viajes/disponibles` | — |
| Aceptar (conductor) | `PUT /viajes/{id}/aceptar` | — |
| Cambiar estado (conductor) | `PUT /viajes/{id}/estado` | `estado` |

- El token se envía como `Authorization: Bearer <token>` (Sanctum). Acepta respuestas con `token`, `access_token` o `plainTextToken`.
- Acepta respuestas envueltas en `{ data: ... }` (API Resources / paginación).
- Estados de viaje: `pendiente → aceptado → en_camino → en_curso → finalizado` (o `cancelado`).
- El rol se lee de `role`, `rol` o `tipo` del usuario (`pasajero` / `conductor`).

## Estructura

```
src/app/
  core/         config del servidor, auth, api, interceptor, guards, modelos, endpoints
  shared/       mapa (Leaflet + OpenStreetMap)
  pages/
    login, registro, servidor
    tabs/       barra inferior
    inicio/     mapa + pedir viaje (pasajero)
    conductor/  en línea, ganancias, solicitudes
    viaje/      viaje en curso (pasajero y conductor), calificar
    historial/  actividad
    perfil/     cuenta
```

Mapas: teselas de CARTO/OpenStreetMap; búsqueda de direcciones con Nominatim; rutas con OSRM (necesitan internet).
