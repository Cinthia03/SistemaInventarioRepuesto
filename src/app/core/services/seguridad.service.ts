import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Usuario {
  id?: number;
  usuario: string;
  nombre: string;
  password?: string;
  rol: string;
  activo?: boolean;
}

export interface Rol {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  solo_lectura: boolean;
  activo: boolean;
}

export interface Opcion {
  id: number;
  codigo: string;
  nombre: string;
  modulo: string;
  ruta: string;
  icono: string | null;
  orden: number;
  activo: boolean;
}

/**
 * Acceso a las tablas de seguridad: usuarios, roles, opciones y rol_opciones.
 * Usado por Mantenimiento > Usuarios y por Parametrización.
 */
@Injectable({ providedIn: 'root' })
export class SeguridadService {
  private readonly db = inject(SupabaseService).supabase;

  // ── Usuarios ────────────────────────────────
  listarUsuarios() {
    // La contraseña se descarta en la pantalla (no se muestra ni se reenvía)
    return this.db.from('usuarios').select('*').order('usuario');
  }

  crearUsuario(u: Usuario) {
    return this.db.from('usuarios').insert(u).select().single();
  }

  actualizarUsuario(id: number, cambios: Partial<Usuario>) {
    return this.db.from('usuarios').update(cambios).eq('id', id);
  }

  eliminarUsuario(id: number) {
    return this.db.from('usuarios').delete().eq('id', id);
  }

  async existeUsuario(usuario: string, excluirId?: number): Promise<boolean> {
    let q = this.db.from('usuarios').select('id').ilike('usuario', usuario);
    if (excluirId) q = q.neq('id', excluirId);
    const { data } = await q;
    return (data ?? []).length > 0;
  }

  // ── Roles ───────────────────────────────────
  listarRoles() {
    return this.db.from('roles').select('*').order('nombre');
  }

  crearRol(r: Rol) {
    return this.db.from('roles').insert(r).select().single();
  }

  actualizarRol(id: number, cambios: Partial<Rol>) {
    return this.db.from('roles').update(cambios).eq('id', id);
  }

  eliminarRol(id: number) {
    return this.db.from('roles').delete().eq('id', id);
  }

  /** Cantidad de usuarios por código de rol. */
  async usuariosPorRol(): Promise<Map<string, number>> {
    const { data } = await this.db.from('usuarios').select('rol');
    const m = new Map<string, number>();
    (data ?? []).forEach((u: any) => {
      const c = (u.rol || '').trim().toLowerCase();
      m.set(c, (m.get(c) || 0) + 1);
    });
    return m;
  }

  /** Cantidad de opciones asignadas por rol_id. */
  async opcionesPorRol(): Promise<Map<number, number>> {
    const { data } = await this.db.from('rol_opciones').select('rol_id');
    const m = new Map<number, number>();
    (data ?? []).forEach((f: any) => m.set(Number(f.rol_id), (m.get(Number(f.rol_id)) || 0) + 1));
    return m;
  }

  // ── Opciones (catálogo del menú) ────────────
  listarOpciones() {
    return this.db.from('opciones').select('*').order('orden');
  }

  crearOpcion(o: Omit<Opcion, 'id'>) {
    return this.db.from('opciones').insert(o).select().single();
  }

  actualizarOpcion(id: number, cambios: Partial<Opcion>) {
    return this.db.from('opciones').update(cambios).eq('id', id);
  }

  eliminarOpcion(id: number) {
    return this.db.from('opciones').delete().eq('id', id);
  }

  /** Cantidad de roles que tienen asignada cada opción (por opcion_id). */
  async rolesPorOpcion(): Promise<Map<number, number>> {
    const { data } = await this.db.from('rol_opciones').select('opcion_id');
    const m = new Map<number, number>();
    (data ?? []).forEach((f: any) => m.set(Number(f.opcion_id), (m.get(Number(f.opcion_id)) || 0) + 1));
    return m;
  }

  // ── Mi perfil ───────────────────────────────
  obtenerPerfil(usuario: string) {
    return this.db.from('usuarios').select('*').eq('usuario', usuario).maybeSingle();
  }

  /** Comprueba la contraseña actual del usuario conectado. */
  async verificarPassword(usuario: string, password: string): Promise<boolean> {
    const { data } = await this.db.from('usuarios').select('id').eq('usuario', usuario).eq('password', password).maybeSingle();
    return !!data;
  }

  /** Actualiza los datos del propio usuario (permitido incluso para roles de solo lectura). */
  actualizarPerfil(usuario: string, cambios: { nombre?: string; password?: string }) {
    return this.db.from('usuarios').update(cambios).eq('usuario', usuario);
  }

  // ── Opciones x Rol ──────────────────────────

  opcionesDeRol(rolId: number) {
    return this.db.from('rol_opciones').select('opcion_id').eq('rol_id', rolId);
  }

  async guardarOpcionesDeRol(rolId: number, agregar: number[], quitar: number[]) {
    if (quitar.length) {
      const { error } = await this.db.from('rol_opciones').delete().eq('rol_id', rolId).in('opcion_id', quitar);
      if (error) return { error };
    }
    if (agregar.length) {
      const { error } = await this.db
        .from('rol_opciones')
        .insert(agregar.map(opcion_id => ({ rol_id: rolId, opcion_id })));
      if (error) return { error };
    }
    return { error: null };
  }
}
