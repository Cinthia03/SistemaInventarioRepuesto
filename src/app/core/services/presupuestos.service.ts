import { Injectable } from '@angular/core';
import { from, Observable, map, switchMap, of } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface PresupuestoItemGuardado {
  categoria_clave: string;
  categoria_nombre: string;
  categoria_codigo?: string | null;     // '1.0' (formato Excel)
  subcategoria_nombre: string;
  subcategoria_codigo?: string | null;  // '1.1'
  rubro_id: number | null;              // null para rubros personalizados o sin APU en BD
  rubro_codigo: string;
  rubro_descripcion: string;
  unidad_medida: string;
  costo_unitario: number;
  cantidad: number;
  total: number;
  es_personalizado?: boolean;
}

/** Datos de cabecera del formato: PROYECTO, Nº TRÁMITE, FECHA, ÁREA, % INDIRECTOS. */
export interface PresupuestoCabecera {
  nombre: string;                       // "PROYECTO DE CONSTRUCCIÓN DE"
  numero_tramite: string | null;
  fecha_presupuesto: string | null;     // yyyy-mm-dd
  area_construccion: number | null;
  porcentaje_indirecto: number;         // 0.20 = 20 %
  costo_directo: number;
  costo_indirecto: number;
  total: number;
}

export interface PresupuestoResumen {
  id: number;
  nombre: string;
  total: number;
  creado_en: string;
  numero_tramite?: string | null;
  fecha_presupuesto?: string | null;
  area_construccion?: number | null;
  porcentaje_indirecto?: number | null;
  costo_directo?: number | null;
  costo_indirecto?: number | null;
}

export interface PresupuestoDetalle extends PresupuestoResumen {
  items: (PresupuestoItemGuardado & { id: number })[];
}

/** Material que consume un presupuesto (descontado de materiales.stock). */
export interface ConsumoMaterial {
  material_id: number;
  cantidad: number;
}

/** Stock actual de un material del inventario. */
export interface MaterialStock {
  id: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  stock: number;
}

/** Error al guardar: stock insuficiente o falta ejecutar el SQL en Supabase. */
export class ErrorPresupuesto extends Error {
  constructor(public tipo: 'stock' | 'migracion' | 'otro', mensaje: string) {
    super(mensaje);
  }
}

/** PostgREST: la función RPC no existe (no se ejecutó sql/PRESUPUESTO_STOCK.sql). */
const esFuncionInexistente = (error: any) =>
  !!error && (error.code === 'PGRST202' || error.code === '42883');

const traducirError = (error: any): ErrorPresupuesto => {
  const msg: string = error?.message || String(error || '');
  if (msg.includes('STOCK_INSUFICIENTE')) {
    return new ErrorPresupuesto('stock', msg.replace(/^.*STOCK_INSUFICIENTE:\s*/, ''));
  }
  if (esFuncionInexistente(error)) {
    return new ErrorPresupuesto('migracion',
      'Falta ejecutar sql/PRESUPUESTO_STOCK.sql en Supabase (funciones presupuesto_guardar / presupuesto_eliminar).');
  }
  // Se muestra el detalle real de Supabase para poder diagnosticar
  const extra = [error?.details, error?.hint, error?.code ? `código ${error.code}` : '']
    .filter(Boolean).join(' · ');
  return new ErrorPresupuesto('otro', [msg || 'Error desconocido', extra].filter(Boolean).join(' — '));
};

@Injectable({
  providedIn: 'root'
})
export class PresupuestosService {

  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.supabase;
  }

  /**
   * Crea (id = null) o actualiza un presupuesto con sus rubros y mueve el stock de
   * materiales en una sola transacción (función presupuesto_guardar en Supabase):
   * devuelve al inventario lo descontado antes, valida y descuenta el nuevo consumo.
   * Si algún material no alcanza no se guarda nada y llega un ErrorPresupuesto('stock').
   */
  guardarPresupuesto(
    id: number | null,
    cabecera: PresupuestoCabecera,
    items: PresupuestoItemGuardado[],
    consumo: ConsumoMaterial[],
  ): Observable<number> {
    return from(
      this.db.rpc('presupuesto_guardar', {
        p_id: id,
        p_cabecera: cabecera,
        p_items: items,
        p_consumo: consumo,
      })
    ).pipe(
      map(({ data, error }: any) => {
        if (error) {
          console.error('Error al guardar el presupuesto:', error);
          throw traducirError(error);
        }
        return Number(data);
      })
    );
  }

  /** Lista los presupuestos ya guardados (para la pantalla de "Presupuestos guardados"). */
  listarPresupuestos(): Observable<PresupuestoResumen[]> {
    return from(
      this.db.from('presupuestos').select('*').order('creado_en', { ascending: false })
    ).pipe(
      map(({ data, error }: any) => {
        if (error) {
          console.error('Error al listar presupuestos:', error);
          throw error;
        }
        return data || [];
      })
    );
  }

  /** Trae el detalle (cabecera + rubros) de un presupuesto guardado. */
  obtenerDetalle(presupuestoId: number): Observable<PresupuestoDetalle> {
    return from(
      this.db.from('presupuestos').select('*').eq('id', presupuestoId).single()
    ).pipe(
      switchMap(({ data: presupuesto, error }: any) => {
        if (error) {
          console.error('Error al obtener el presupuesto:', error);
          throw error;
        }

        return from(
          this.db.from('presupuesto_items').select('*').eq('presupuesto_id', presupuestoId)
        ).pipe(
          map(({ data: items, error: errorItems }: any) => {
            if (errorItems) {
              console.error('Error al obtener los rubros del presupuesto:', errorItems);
              throw errorItems;
            }
            return { ...presupuesto, items: items || [] } as PresupuestoDetalle;
          })
        );
      })
    );
  }

  /** Lo que un presupuesto guardado descontó del inventario (vacío si no hay registro). */
  obtenerConsumo(presupuestoId: number): Observable<ConsumoMaterial[]> {
    return from(
      this.db.from('presupuesto_consumo').select('material_id, cantidad').eq('presupuesto_id', presupuestoId)
    ).pipe(
      map(({ data, error }: any) => {
        if (error) {
          console.warn('No se pudo leer el consumo del presupuesto (¿falta PRESUPUESTO_STOCK.sql?):', error);
          return [];
        }
        return (data || []).map((c: any) => ({ material_id: Number(c.material_id), cantidad: Number(c.cantidad) || 0 }));
      })
    );
  }

  /** Stock actual de todos los materiales del inventario. */
  listarStockMateriales(): Observable<MaterialStock[]> {
    return from(
      this.db.from('materiales').select('id, codigo, descripcion, unidad, stock')
    ).pipe(
      map(({ data, error }: any) => {
        if (error) {
          console.error('Error al leer el stock de materiales:', error);
          throw error;
        }
        return (data || []).map((m: any) => ({ ...m, id: Number(m.id), stock: Number(m.stock) || 0 }));
      })
    );
  }

  /**
   * Elimina un presupuesto guardado devolviendo al inventario lo que había descontado.
   * Si la función SQL todavía no existe, lo elimina sin mover stock (comportamiento anterior).
   */
  eliminarPresupuesto(presupuestoId: number): Observable<void> {
    return from(this.db.rpc('presupuesto_eliminar', { p_id: presupuestoId })).pipe(
      switchMap(({ error }: any) => {
        if (esFuncionInexistente(error)) {
          console.warn('presupuesto_eliminar no existe; se elimina sin devolver stock.', error);
          return from(this.db.from('presupuestos').delete().eq('id', presupuestoId));
        }
        return of({ error });
      }),
      map(({ error }: any) => {
        if (error) {
          console.error('Error al eliminar el presupuesto:', error);
          throw traducirError(error);
        }
      })
    );
  }
}
