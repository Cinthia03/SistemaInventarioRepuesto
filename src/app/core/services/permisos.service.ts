import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { rolActual } from './rol';
import { MENU, ModuloMenu, OPCIONES_ADMIN, OpcionMenu, ROLES_ADMIN, TODAS_LAS_OPCIONES } from '../menu/menu.config';

/** Fila de la tabla `opciones` (catálogo mantenido en Mantenimiento > Opciones). */
interface OpcionBD {
  codigo: string;
  nombre: string;
  modulo: string;
  ruta: string;
  icono: string | null;
  orden: number;
  activo: boolean;
}

/**
 * Permisos del usuario conectado (Opciones x Rol).
 *
 * Lee de Supabase las opciones asignadas al rol del usuario (tablas roles,
 * opciones y rol_opciones). El catálogo `opciones` también define el nombre,
 * el ícono, el orden y si la opción está activa en el menú.
 * Si esas tablas aún no existen (no se ha ejecutado sql/MENU_ROLES_PERMISOS.sql),
 * el sistema funciona como antes: todas las opciones quedan visibles.
 */
@Injectable({ providedIn: 'root' })
export class PermisosService {
  private readonly supabase = inject(SupabaseService).supabase;

  /** Códigos de opción permitidos para el rol actual. */
  private readonly permitidas = signal<Set<string>>(new Set());
  /** Catálogo de opciones leído de la base (vacío si no existe la tabla). */
  private readonly catalogo = signal<OpcionBD[]>([]);
  /** true cuando las tablas de parametrización no existen todavía. */
  readonly sinParametrizar = signal(false);
  readonly cargado = signal(false);

  private rolCargado: string | null = null;
  private cargaEnCurso: Promise<void> | null = null;

  /** Menú filtrado según los permisos del rol y el catálogo de opciones. */
  readonly menu = computed<ModuloMenu[]>(() => {
    const ok = this.permitidas();
    const bd = new Map(this.catalogo().map(o => [o.codigo, o]));

    return MENU
      .map(m => {
        // Opciones del sistema, con nombre / ícono / orden del catálogo
        const delSistema: (OpcionMenu & { orden: number })[] = m.opciones.map((o, i) => {
          const f = bd.get(o.codigo);
          return {
            ...o,
            nombre: f?.nombre || o.nombre,
            icono: f?.icono || o.icono,
            orden: f?.orden ?? i
          };
        });
        // Opciones nuevas creadas en Mantenimiento > Opciones para este módulo
        const nuevas = this.catalogo()
          .filter(f => f.modulo === m.codigo && !m.opciones.some(o => o.codigo === f.codigo))
          .map(f => ({
            codigo: f.codigo, nombre: f.nombre, ruta: f.ruta, icono: f.icono || 'chevron_right',
            rutas: [f.ruta], orden: f.orden
          }));

        const opciones = [...delSistema, ...nuevas]
          .filter(o => ok.has(o.codigo))
          .sort((a, b) => a.orden - b.orden);
        return { ...m, opciones };
      })
      .filter(m => m.opciones.length > 0);
  });

  puede(codigo: string): boolean {
    return this.permitidas().has(codigo);
  }

  /** Carga (una vez por rol) las opciones permitidas. */
  cargar(forzar = false): Promise<void> {
    const rol = rolActual();
    if (!forzar && this.rolCargado === rol && this.cargado()) return Promise.resolve();
    if (!forzar && this.cargaEnCurso) return this.cargaEnCurso;

    this.cargaEnCurso = this.consultar(rol).finally(() => (this.cargaEnCurso = null));
    return this.cargaEnCurso;
  }

  /** Limpia los permisos (al cerrar sesión). */
  limpiar(): void {
    this.permitidas.set(new Set());
    this.catalogo.set([]);
    this.cargado.set(false);
    this.rolCargado = null;
    try { localStorage.removeItem('rol_solo_lectura'); } catch { /* sin storage */ }
  }

  private async consultar(rol: string): Promise<void> {
    const codigos = new Set<string>();

    const { data: rolBD, error: errRol } = await this.supabase
      .from('roles')
      .select('id, solo_lectura, activo')
      .eq('codigo', rol)
      .maybeSingle();

    if (errRol) {
      // Tablas de parametrización no creadas: se mantiene el comportamiento anterior.
      this.sinParametrizar.set(true);
      this.catalogo.set([]);
      TODAS_LAS_OPCIONES.forEach(o => codigos.add(o.codigo));
    } else {
      this.sinParametrizar.set(false);
      try {
        localStorage.setItem('rol_solo_lectura', rolBD?.solo_lectura ? '1' : '0');
      } catch { /* sin storage */ }

      const { data: cat } = await this.supabase
        .from('opciones')
        .select('codigo, nombre, modulo, ruta, icono, orden, activo');
      this.catalogo.set(((cat ?? []) as OpcionBD[]).filter(o => o.activo !== false));

      if (rolBD && rolBD.activo !== false) {
        const { data } = await this.supabase
          .from('rol_opciones')
          .select('opciones(codigo, activo)')
          .eq('rol_id', rolBD.id);

        (data ?? []).forEach((fila: any) => {
          const op = Array.isArray(fila.opciones) ? fila.opciones[0] : fila.opciones;
          if (op?.codigo && op.activo !== false) codigos.add(op.codigo);
        });
      }

      // Un administrador nunca pierde el acceso a la administración del sistema.
      if (ROLES_ADMIN.includes(rol)) OPCIONES_ADMIN.forEach(c => codigos.add(c));
    }

    // Inicio siempre disponible para cualquier usuario conectado.
    codigos.add('INICIO');

    this.permitidas.set(codigos);
    this.rolCargado = rol;
    this.cargado.set(true);
  }
}
