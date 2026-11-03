/**
 * TODAS las rutas del backend Laravel están aquí.
 * Si el profesor usa otros nombres (ej. /trips en vez de /viajes),
 * solo cambias este archivo y el resto de la app sigue funcionando.
 */
export const ENDPOINTS = {
  // Autenticación (Laravel Sanctum / Passport)
  login: '/login',                 // POST {email, password}
  register: '/register',           // POST {name, email, phone, password, password_confirmation, role}
  logout: '/logout',               // POST
  me: '/user',                     // GET  -> usuario autenticado
  updateProfile: '/user',          // PUT  {name, phone}

  // Viajes (pasajero)
  viajes: '/viajes',                                   // GET historial | POST crear
  viaje: (id: number | string) => `/viajes/${id}`,     // GET detalle
  cancelar: (id: number | string) => `/viajes/${id}/cancelar`, // PUT
  calificar: (id: number | string) => `/viajes/${id}/calificar`, // POST {calificacion, comentario}

  // Conductor
  disponibles: '/viajes/disponibles',                  // GET solicitudes pendientes
  aceptar: (id: number | string) => `/viajes/${id}/aceptar`,   // PUT
  estado: (id: number | string) => `/viajes/${id}/estado`,     // PUT {estado}

  // Tipos de servicio (opcional; si no existe se usan los locales)
  tipos: '/tipos-vehiculo',        // GET
};
