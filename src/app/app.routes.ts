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
      import('./features/login/login')
        .then(m => m.Login)
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/inicio/inicio')
        .then(m => m.InicioComponent)
  },
  {
    path: 'inventario',
    loadComponent: () =>
      import('./features/inventario/inventario')
        .then(m => m.InventarioComponent)
  },
  {
    path: 'materiales',
    loadComponent: () =>
      import('./features/inventario/materiales/materiales')
        .then(m => m.Materiales)
  },
  {
    path: 'mano-de-obra',
    loadComponent: () =>
      import('./features/inventario/mano-de-obra/mano-de-obra')
        .then(m => m.ManoDeObra)
  },
  {
    path: 'equipos',
    loadComponent: () =>
      import('./features/inventario/equipos/equipos')
        .then(m => m.Equipos)
  },
  {
    path: 'materiales/editar/:id',
    loadComponent: () =>
      import('./features/inventario/materiales/materiales')
        .then(m => m.Materiales)
  },
  {
    path: 'calculo',
    loadComponent: () =>
      import('./calculo/calculo')
        .then(m => m.Calculo)
  },
  {
    path: 'obra-gris',
    loadComponent: () =>
      import('./calculo/obra-gris/obra-gris')
        .then(m => m.ObraGris)
  },
  {
    path: 'obra-de-acabados',
    loadComponent: () =>
      import('./calculo/obra-de-acabados/obra-de-acabados')
        .then(m => m.ObraDeAcabados)
  },
  {
    path: 'sistema-hidraulico-sanitario',
    loadComponent: () =>
      import('./calculo/sistema-hidraulico-sanitario/sistema-hidraulico-sanitario')
        .then(m => m.SistemaHidraulicoSanitario)
  },
  {
    path: 'sistema-instalaciones-electricas',
    loadComponent: () =>
      import('./calculo/sistema-instalaciones-electricas/sistema-instalaciones-electricas')
        .then(m => m.SistemaInstalacionesElectricas)
  },
  {
    path: 'calculo-apu-component/:categoria',
    loadComponent: () =>
      import('./calculo/calculo-apu-component/calculo-apu-component')
        .then(m => m.CalculoApuComponent)
  },
  {
    path: 'calculos-generados',
    loadComponent: () =>
      import('./calculo/calculos-generados/calculos-generados')
        .then(m => m.CalculosGenerados)
  },
  {
    path: 'presupuesto',
    loadComponent: () =>
      import('./presupuesto/presupuesto')
        .then(m => m.Presupuesto)
  }
]