import { Routes } from '@angular/router';
import { authGuard } from './auth-guard';
import { clienteGuard } from './cliente-guard';
import { profesorGuard } from './profesor-guard';

export const routes: Routes = [
  {
    path: 'inicio',
    loadComponent: () => import('./pages/inicio/inicio').then(m => m.Inicio)
  },
  {
    path: 'formulario',
    loadComponent: () => import('./formulario/formulario').then(m => m.FormularioComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then(m => m.AdminComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pagos/registro',
    loadComponent: () =>
      import('./pages/pagos/registro-pago/registro-pago')
        .then(m => m.RegistroPagoComponent)
  },
  {
    path: 'pagos/validacion',
    loadComponent: () =>
      import('./pages/pagos/validacion-pagos/validacion-pagos')
        .then(m => m.ValidacionPagosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'rendimiento',
    loadComponent: () =>
      import('./pages/rendimiento/rendimiento').then(m => m.RendimientoComponent)
  },
  {
    path: 'vista-cliente',
    loadComponent: () => import('./pages/vista-cliente/vista-cliente').then(m => m.VistaClienteComponent),
    canActivate: [clienteGuard]
  },
  {
    path: 'vista-profesor',
    loadComponent: () => import('./pages/vista-profesor/vista-profesor').then(m => m.VistaProfesorComponent),
    canActivate: [profesorGuard]
  },
  {
    path: 'registrar/:token',
    loadComponent: () => import('./ficha-temporada/ficha-temporada').then(m => m.FichaTemporadaComponent)
  },
  {
    path: 'activar-cuenta/:token',
    loadComponent: () => import('./activar-cuenta/activar-cuenta').then(m => m.ActivarCuentaComponent)
  },
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];