/**
 * Estructura del menú principal.
 *
 * Cada opción tiene un "codigo" que coincide con la tabla `opciones` de Supabase.
 * En Parametrización > Opciones x Rol se decide qué códigos ve cada rol.
 * `rutas` son los prefijos de URL que pertenecen a esa opción (sirve para
 * proteger las pantallas internas, p. ej. /materiales pertenece a Inventario).
 */
export interface OpcionMenu {
  codigo: string;
  nombre: string;
  ruta: string;
  icono: string;
  descripcion?: string;
  rutas: string[];
}

export interface ModuloMenu {
  codigo: string;
  nombre: string;
  icono: string;
  opciones: OpcionMenu[];
}

export const MENU: ModuloMenu[] = [
  {
    codigo: 'INICIO',
    nombre: 'Inicio',
    icono: 'home',
    opciones: [
      { codigo: 'INICIO', nombre: 'Inicio', ruta: '/inicio', icono: 'home', rutas: ['/inicio'] }
    ]
  },
  {
    codigo: 'MANTENIMIENTO',
    nombre: 'Mantenimiento',
    icono: 'build',
    opciones: [
      {
        codigo: 'MANT_USUARIOS', nombre: 'Usuarios', ruta: '/mantenimiento/usuarios', icono: 'group',
        descripcion: 'Registro de usuarios del sistema', rutas: ['/mantenimiento/usuarios']
      },
      {
        codigo: 'MANT_ROLES', nombre: 'Roles', ruta: '/mantenimiento/roles', icono: 'badge',
        descripcion: 'Catálogo de roles y su nivel de acceso', rutas: ['/mantenimiento/roles']
      },
      {
        codigo: 'MANT_OPCIONES', nombre: 'Opciones', ruta: '/mantenimiento/opciones', icono: 'list_alt',
        descripcion: 'Catálogo de opciones del menú', rutas: ['/mantenimiento/opciones']
      }
    ]
  },
  {
    codigo: 'PARAMETRIZACION',
    nombre: 'Parametrización',
    icono: 'tune',
    opciones: [
      {
        codigo: 'PARAM_OPCIONES_ROL', nombre: 'Opciones x Rol', ruta: '/parametrizacion/opciones-rol', icono: 'rule',
        descripcion: 'Qué opciones del menú ve cada rol', rutas: ['/parametrizacion/opciones-rol']
      },
      {
        codigo: 'PARAM_USUARIOS_ROL', nombre: 'Usuarios x Rol', ruta: '/parametrizacion/usuarios-rol', icono: 'manage_accounts',
        descripcion: 'Asignación de rol a cada usuario', rutas: ['/parametrizacion/usuarios-rol']
      }
    ]
  },
  {
    codigo: 'PROCESOS',
    nombre: 'Procesos',
    icono: 'engineering',
    opciones: [
      {
        codigo: 'PROC_INVENTARIO', nombre: 'Inventario', ruta: '/inventario', icono: 'inventory_2',
        descripcion: 'Materiales, mano de obra y equipos',
        rutas: ['/inventario', '/materiales', '/mano-de-obra', '/equipos']
      },
      {
        codigo: 'PROC_CALCULO', nombre: 'Cálculo por rubro', ruta: '/calculo', icono: 'calculate',
        descripcion: 'Análisis de precios unitarios (APU)',
        rutas: ['/calculo', '/obra-gris', '/obra-de-acabados', '/sistema-hidraulico-sanitario',
                '/sistema-instalaciones-electricas', '/calculo-apu-component']
      },
      {
        codigo: 'PROC_PRESUPUESTO', nombre: 'Presupuesto', ruta: '/presupuesto', icono: 'request_quote',
        descripcion: 'Elaboración y control de presupuestos de obra', rutas: ['/presupuesto']
      },
      {
        codigo: 'PROC_PREDICTIVO', nombre: 'Modelos predictivos', ruta: '/modelos-predictivos', icono: 'query_stats',
        descripcion: 'Proyección de stock y precios del inventario', rutas: ['/modelos-predictivos']
      }
    ]
  },
  {
    codigo: 'REPORTES',
    nombre: 'Reportes',
    icono: 'bar_chart',
    opciones: [
      {
        codigo: 'REP_OPERACIONALES', nombre: 'Operacionales', ruta: '/reportes/operacionales', icono: 'assignment',
        descripcion: 'Stock, existencias y tarifas del día a día', rutas: ['/reportes/operacionales']
      },
      {
        codigo: 'REP_ESTRATEGICOS', nombre: 'Estratégicos', ruta: '/reportes/estrategicos', icono: 'insights',
        descripcion: 'Indicadores para la toma de decisiones', rutas: ['/reportes/estrategicos']
      },
      {
        codigo: 'REP_AUDITORIA', nombre: 'Auditoría', ruta: '/reportes/auditoria', icono: 'policy',
        descripcion: 'Bitácora de ingresos y cambios', rutas: ['/reportes/auditoria']
      }
    ]
  }
];

/** Todas las opciones en una lista plana. */
export const TODAS_LAS_OPCIONES: OpcionMenu[] = MENU.flatMap(m => m.opciones);

/** Devuelve el código de opción al que pertenece una URL (o null si es libre). */
export function opcionDeRuta(url: string): string | null {
  const limpia = url.split('?')[0].split('#')[0];
  for (const op of TODAS_LAS_OPCIONES) {
    if (op.rutas.some(r => limpia === r || limpia.startsWith(r + '/'))) return op.codigo;
  }
  return null;
}

/** Roles que siempre conservan acceso a la administración (evita quedar bloqueado). */
export const ROLES_ADMIN = ['admin', 'administrador'];

/** Opciones que un administrador nunca pierde, aunque se desactiven o se quiten. */
export const OPCIONES_ADMIN = ['INICIO', 'MANT_ROLES', 'MANT_OPCIONES', 'PARAM_OPCIONES_ROL', 'PARAM_USUARIOS_ROL'];

/** Códigos definidos en el sistema (sus rutas existen en la app y no se pueden borrar). */
export const CODIGOS_SISTEMA = new Set(TODAS_LAS_OPCIONES.map(o => o.codigo));

/** Módulos del menú (para listas desplegables). */
export const MODULOS_MENU = MENU.map(m => ({ codigo: m.codigo, nombre: m.nombre }));
