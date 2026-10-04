import { Routes } from '@angular/router'
import { accesoGuard } from './core/guards/acceso.guard'

const rutasSistema: Routes = [
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
    path: 'modelos-predictivos',
    loadComponent: () =>
      import('./features/inventario/modelos-predictivos/modelos-predictivos')
        .then(m => m.ModelosPredictivos)
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
    path: 'presupuesto',
    loadComponent: () =>
      import('./presupuesto/presupuesto')
        .then(m => m.Presupuesto)
  },

  // ── MANTENIMIENTO ──────────────────────────────
  {
    path: 'mantenimiento/usuarios',
    loadComponent: () =>
      import('./features/mantenimiento/usuarios/usuarios')
        .then(m => m.UsuariosComponent)
  },
  {
    path: 'mantenimiento/roles',
    loadComponent: () =>
      import('./features/mantenimiento/roles/roles')
        .then(m => m.RolesComponent)
  },
  {
    path: 'mantenimiento/opciones',
    loadComponent: () =>
      import('./features/mantenimiento/opciones/opciones')
        .then(m => m.OpcionesComponent)
  },

  // ── MI PERFIL (disponible para todo usuario con sesión) ──
  {
    path: 'perfil',
    loadComponent: () =>
      import('./features/perfil/perfil')
        .then(m => m.PerfilComponent)
  },

  // ── PARAMETRIZACIÓN ────────────────────────────
  {
    path: 'parametrizacion/opciones-rol',
    loadComponent: () =>
      import('./features/parametrizacion/opciones-rol/opciones-rol')
        .then(m => m.OpcionesRolComponent)
  },
  {
    path: 'parametrizacion/usuarios-rol',
    loadComponent: () =>
      import('./features/parametrizacion/usuarios-rol/usuarios-rol')
        .then(m => m.UsuariosRolComponent)
  },

  // ── REPORTES ───────────────────────────────────
  {
    path: 'reportes/operacionales',
    loadComponent: () =>
      import('./features/reportes/operacionales/operacionales')
        .then(m => m.ReportesOperacionalesComponent)
  },
  {
    path: 'reportes/estrategicos',
    loadComponent: () =>
      import('./features/reportes/estrategicos/estrategicos')
        .then(m => m.ReportesEstrategicosComponent)
  },
  {
    path: 'reportes/auditoria',
    loadComponent: () =>
      import('./features/reportes/auditoria/auditoria')
        .then(m => m.ReportesAuditoriaComponent)
  }
]

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

  // Todas las pantallas del sistema exigen sesión y permiso (Opciones x Rol)
  ...rutasSistema.map(r => ({ ...r, canActivate: [accesoGuard] })),

  // Cualquier otra dirección: página "no encontrada"
  {
    path: '**',
    data: { sinMarco: true },   // se muestra sin menú ni pie de página
    loadComponent: () =>
      import('./features/no-encontrado/no-encontrado')
        .then(m => m.NoEncontradoComponent)
  }
]
