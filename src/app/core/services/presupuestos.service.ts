import { Injectable } from '@angular/core';
import { from, Observable, map, switchMap } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface PresupuestoItemGuardado {
  categoria_clave: string;
  categoria_nombre: string;
  subcategoria_nombre: string;
  rubro_id: number;
  rubro_codigo: string;
  rubro_descripcion: string;
  unidad_medida: string;
  costo_unitario: number;
  cantidad: number;
  total: number;
}

export interface PresupuestoResumen {
  id: number;
  nombre: string;
  total: number;
  creado_en: string;
}

export interface PresupuestoDetalle extends PresupuestoResumen {
  items: (PresupuestoItemGuardado & { id: number })[];
}

@Injectable({
  providedIn: 'root'
})
export class PresupuestosService {

  constructor(private supabaseService: SupabaseService) {}

  /** Crea la cabecera del presupuesto y guarda todos sus rubros seleccionados. */
  guardarPresupuesto(nombre: string, total: number, items: PresupuestoItemGuardado[]): Observable<number> {
    return from(
      this.supabaseService.supabase
        .from('presupuestos')
        .insert({ nombre, total })
        .select('id')
        .single()
    ).pipe(
      switchMap(({ data, error }: any) => {
        if (error) {
          console.error('Error al crear el presupuesto:', error);
          throw error;
        }

        const presupuestoId = data.id;
        const itemsConId = items.map(item => ({ ...item, presupuesto_id: presupuestoId }));

        return from(
          this.supabaseService.supabase
            .from('presupuesto_items')
            .insert(itemsConId)
        ).pipe(
          map(({ error: errorItems }: any) => {
            if (errorItems) {
              console.error('Error al guardar los rubros del presupuesto:', errorItems);
              throw errorItems;
            }
            return presupuestoId;
          })
        );
      })
    );
  }

  /** Lista los presupuestos ya guardados (para la pantalla de "Presupuestos guardados"). */
  listarPresupuestos(): Observable<PresupuestoResumen[]> {
    return from(
      this.supabaseService.supabase
        .from('presupuestos')
        .select('id, nombre, total, creado_en')
        .order('creado_en', { ascending: false })
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
      this.supabaseService.supabase
        .from('presupuestos')
        .select('id, nombre, total, creado_en')
        .eq('id', presupuestoId)
        .single()
    ).pipe(
      switchMap(({ data: presupuesto, error }: any) => {
        if (error) {
          console.error('Error al obtener el presupuesto:', error);
          throw error;
        }

        return from(
          this.supabaseService.supabase
            .from('presupuesto_items')
            .select('*')
            .eq('presupuesto_id', presupuestoId)
            .order('categoria_nombre', { ascending: true })
            .order('rubro_codigo', { ascending: true })
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

  /** Elimina un presupuesto guardado (y en cascada sus rubros). */
  eliminarPresupuesto(presupuestoId: number): Observable<void> {
    return from(
      this.supabaseService.supabase
        .from('presupuestos')
        .delete()
        .eq('id', presupuestoId)
    ).pipe(
      map(({ error }: any) => {
        if (error) {
          console.error('Error al eliminar el presupuesto:', error);
          throw error;
        }
      })
    );
  }
}
