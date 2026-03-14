import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login')
        .then(m => m.Login)
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./inicio/inicio')
        .then(m => m.InicioComponent)
  },
  {
    path: 'inventario',
    loadComponent: () =>
      import('./inventario/inventario')
        .then(m => m.InventarioComponent)
  },
  {
    path: 'materiales',
    loadComponent: () =>
      import('./inventario/materiales/materiales')
        .then(m => m.Materiales)
  },
  {
    path: 'mano-de-obra',
    loadComponent: () =>
      import('./inventario/mano-de-obra/mano-de-obra')
        .then(m => m.ManoDeObra)
  },
  {
    path: 'equipos',
    loadComponent: () =>
      import('./inventario/equipos/equipos')
        .then(m => m.Equipos)
  },
  /*{
    path: 'acerovarilla',
    loadComponent: () =>
      import('./inventario/materiales/acerovarilla/acerovarilla')
        .then(m => m.Acerovarilla)
  },*/
  {
    path: 'materiales/editar/:id',
    loadComponent: () =>
      import('./inventario/materiales/materiales')
        .then(m => m.Materiales)
  }
]
