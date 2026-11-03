import { Routes } from '@angular/router';
import { authGuard, conductorGuard, invitadoGuard, pasajeroGuard } from './core/guards';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro/registro.page').then(m => m.RegistroPage),
  },
  {
    path: 'servidor',
    loadComponent: () => import('./pages/servidor/servidor.page').then(m => m.ServidorPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'inicio',
        canActivate: [pasajeroGuard],
        loadComponent: () => import('./pages/inicio/inicio.page').then(m => m.InicioPage),
      },
      {
        path: 'conductor',
        canActivate: [conductorGuard],
        loadComponent: () => import('./pages/conductor/conductor.page').then(m => m.ConductorPage),
      },
      {
        path: 'historial',
        loadComponent: () => import('./pages/historial/historial.page').then(m => m.HistorialPage),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  {
    path: 'viaje/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/viaje/viaje.page').then(m => m.ViajePage),
  },
  { path: '**', redirectTo: 'login' },
];
