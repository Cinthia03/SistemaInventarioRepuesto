import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { usuarioActual } from './rol';

export type AccionAuditoria = 'INGRESO' | 'SALIDA' | 'CREAR' | 'EDITAR' | 'ELIMINAR' | 'PERMISOS';

export interface RegistroAuditoria {
  id: number;
  fecha: string;
  usuario: string | null;
  accion: AccionAuditoria | string;
  modulo: string | null;
  detalle: string | null;
}

/**
 * Bitácora de auditoría (tabla `auditoria`).
 * Registrar nunca interrumpe el flujo: si falla (p. ej. la tabla no existe), se ignora.
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly supabase = inject(SupabaseService).supabase;

  async registrar(accion: AccionAuditoria, modulo: string, detalle = '', usuario = usuarioActual()): Promise<void> {
    try {
      await this.supabase.from('auditoria').insert({ accion, modulo, detalle, usuario: usuario || null });
    } catch {
      /* la auditoría no debe bloquear la operación principal */
    }
  }

  listar(filtro: { desde?: string; hasta?: string; usuario?: string; accion?: string; modulo?: string }, limite = 500) {
    let q = this.supabase
      .from('auditoria')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(limite);

    if (filtro.desde)   q = q.gte('fecha', filtro.desde);
    if (filtro.hasta)   q = q.lte('fecha', filtro.hasta + 'T23:59:59');
    if (filtro.usuario) q = q.ilike('usuario', `%${filtro.usuario}%`);
    if (filtro.accion)  q = q.eq('accion', filtro.accion);
    if (filtro.modulo)  q = q.eq('modulo', filtro.modulo);
    return q;
  }
}
