import { Injectable } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Subcategoria {
  id: number;
  categoria_id: number;
  nombre: string;
  codigo_prefix?: string;
}

export interface RubroBD {
  id?: number;
  subcategoria_id: number;
  codigo: string;
  descripcion: string;
  unidad_medida?: string;
  costo_directo_total?: number;
  created_at?: string;
}

export interface ApuGuardado {
  id?: number;
  rubroCodigo: string;
  rubroDescripcion: string;
  categoria: string;
  subcategoriaId?: number;
  equipos?: any[];
  manoObra?: any[];
  materiales?: any[];
  transporte?: any[];
  subtotalEquipos: number;
  subtotalManoObra: number;
  subtotalMateriales: number;
  subtotalTransporte: number;
  totalDirecto: number;
  fecha: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApuService {

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Obtiene las subcategorías asociadas a una categoría dinámica desde la BD.
   */
  getSubcategoriasPorCategoria(nombreCategoria: string): Observable<Subcategoria[]> {
    return from(
      this.supabaseService.supabase
        .from('subcategorias')
        .select('*, categorias!inner(nombre)')
        .ilike('categorias.nombre', nombreCategoria.replace('-', ' '))
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []).map(item => ({
          id: item.id,
          categoria_id: item.categoria_id,
          nombre: item.nombre,
          codigo_prefix: item.codigo_prefix
        }));
      })
    );
  }

  /**
   * Obtiene el último número secuencial registrado para una subcategoría.
   */
  getUltimoCodigo(subcategoriaId: number): Observable<number> {
    return from(
      this.supabaseService.supabase
        .from('rubros')
        .select('codigo')
        .eq('subcategoria_id', subcategoriaId)
        .order('id', { ascending: false })
        .limit(1)
    ).pipe(
      map(({ data, error }) => {
        if (error || !data || data.length === 0) return 0;
        
        // Extrae el último segmento numérico (Ej: '1.1.04' -> 4)
        const partes = data[0].codigo.split('.');
        const ultimoNumero = parseInt(partes[partes.length - 1], 10);
        return isNaN(ultimoNumero) ? 0 : ultimoNumero;
      })
    );
  }

  /**
   * Guarda el rubro y su APU en Supabase usando una transacción lógica.
   */
  guardar(payload: ApuGuardado): Observable<any> {
    return from(
      (async () => {
        // 1. Insertar el rubro en la tabla 'rubros'
        const { data: rubroData, error: rubroError } = await this.supabaseService.supabase
          .from('rubros')
          .insert({
            subcategoria_id: payload.subcategoriaId,
            codigo: payload.rubroCodigo,
            descripcion: payload.rubroDescripcion,
            costo_directo_total: payload.totalDirecto
          })
          .select()
          .single();

        if (rubroError) throw rubroError;

        // 2. Mapear e insertar detalles en 'apu_detalles'
        const detalles: any[] = [];

        payload.equipos?.forEach(item => {
          if (item.id) {
            detalles.push({
              rubro_id: rubroData.id,
              tipo_insumo: 'EQUIPO',
              insumo_id: item.id,
              cantidad: item.cantidad,
              rendimiento: item.rendimiento,
              costo_unitario: item.tarifa,
              subtotal: item.costo
            });
          }
        });

        payload.manoObra?.forEach(item => {
          if (item.id) {
            detalles.push({
              rubro_id: rubroData.id,
              tipo_insumo: 'MANO_OBRA',
              insumo_id: item.id,
              cantidad: item.cantidad,
              rendimiento: item.rendimiento,
              costo_unitario: item.tarifa,
              subtotal: item.costo
            });
          }
        });

        payload.materiales?.forEach(item => {
          if (item.id) {
            detalles.push({
              rubro_id: rubroData.id,
              tipo_insumo: 'MATERIAL',
              insumo_id: item.id,
              cantidad: item.cantidad,
              rendimiento: 0,
              costo_unitario: item.unitario,
              subtotal: item.costo
            });
          }
        });

        payload.transporte?.forEach(item => {
          if (item.id) {
            detalles.push({
              rubro_id: rubroData.id,
              tipo_insumo: 'TRANSPORTE',
              insumo_id: item.id,
              cantidad: item.cantidad,
              rendimiento: 0,
              costo_unitario: item.unitario,
              subtotal: item.costo
            });
          }
        });

        if (detalles.length > 0) {
          const { error: detallesError } = await this.supabaseService.supabase
            .from('apu_detalles')
            .insert(detalles);

          if (detallesError) throw detallesError;
        }

        return rubroData;
      })()
    );
  }

  obtenerTodos(): Observable<any> {
    return from(
      this.supabaseService.supabase
        .from('rubros')
        .select('*, apu_detalles(*)')
        .order('created_at', { ascending: false })
    );
  }

  eliminar(id: number): Observable<any> {
    return from(
      this.supabaseService.supabase
        .from('rubros')
        .delete()
        .eq('id', id)
    );
  }
}