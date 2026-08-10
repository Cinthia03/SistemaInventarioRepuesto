import { Injectable } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface DetalleApu {
  id: number;
  rubro_id: number;
  tipo_insumo: 'EQUIPO' | 'MANO_OBRA' | 'MATERIAL' | 'TRANSPORTE';
  codigo_insumo?: string;
  descripcion: string;
  unidad?: string;
  cantidad: number;
  tarifa_unitario: number;
  rendimiento: number;
  costo_hora: number;
  costo_total: number;
}

export interface Rubro {
  id: number;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  costo_directo_total: number;
  subcategoria_nombre: string;
  desplegado?: boolean;
  equipos: DetalleApu[];
  manoObra: DetalleApu[];
  materiales: DetalleApu[];
  transporte: DetalleApu[];
  subtotalEquipos: number;
  subtotalManoObra: number;
  subtotalMateriales: number;
  subtotalTransporte: number;
}

@Injectable({
  providedIn: 'root'
})
export class RubrosObraGrisService {

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Obtiene la lista de subcategorías pertenecientes a Obra Gris
   */
  getSubcategoriasObraGris(): Observable<string[]> {
    return from(
      this.supabaseService.supabase
        .from('subcategorias')
        .select('nombre, categorias!inner(nombre)')
        .ilike('categorias.nombre', 'OBRA GRIS')
        .order('id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error al cargar subcategorías:', error);
          throw error;
        }
        return (data || []).map(item => item.nombre);
      })
    );
  }

  /**
   * Obtiene los rubros haciendo un LEFT JOIN implícito en apu_detalles
   * para que muestre los rubros aunque la tabla apu_detalles esté vacía.
   */
  getRubrosObraGris(): Observable<Rubro[]> {
    return from(
      this.supabaseService.supabase
        .from('rubros')
        .select(`
          id,
          codigo,
          descripcion,
          unidad_medida,
          costo_directo_total,
          subcategorias!inner (
            nombre,
            categorias!inner ( nombre )
          ),
          apu_detalles (
            id,
            rubro_id,
            tipo_insumo,
            codigo_insumo,
            descripcion,
            unidad,
            cantidad,
            tarifa_unitario,
            rendimiento,
            costo_hora,
            costo_total
          )
        `)
        .ilike('subcategorias.categorias.nombre', 'OBRA GRIS')
        .order('codigo', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error al consultar Supabase:', error);
          throw error;
        }

        return (data || []).map((item: any) => {
          // Si apu_detalles está vacío/null, se asigna un array vacío
          const detalles: DetalleApu[] = item.apu_detalles || [];
          
          const equipos = detalles.filter(d => d.tipo_insumo === 'EQUIPO');
          const manoObra = detalles.filter(d => d.tipo_insumo === 'MANO_OBRA');
          const materiales = detalles.filter(d => d.tipo_insumo === 'MATERIAL');
          const transporte = detalles.filter(d => d.tipo_insumo === 'TRANSPORTE');

          return {
            id: item.id,
            codigo: item.codigo,
            descripcion: item.descripcion,
            unidad_medida: item.unidad_medida || 'u',
            costo_directo_total: Number(item.costo_directo_total) || 0,
            subcategoria_nombre: item.subcategorias?.nombre || '',
            desplegado: false,
            equipos,
            manoObra,
            materiales,
            transporte,
            subtotalEquipos: equipos.reduce((acc, el) => acc + (Number(el.costo_total) || 0), 0),
            subtotalManoObra: manoObra.reduce((acc, el) => acc + (Number(el.costo_total) || 0), 0),
            subtotalMateriales: materiales.reduce((acc, el) => acc + (Number(el.costo_total) || 0), 0),
            subtotalTransporte: transporte.reduce((acc, el) => acc + (Number(el.costo_total) || 0), 0)
          };
        });
      })
    );
  }
}