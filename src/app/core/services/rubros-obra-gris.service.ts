import { Injectable } from '@angular/core';
import { from, Observable, map, switchMap, forkJoin, of } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface DetalleApu {
  id: number;
  rubro_id: number;
  tipo_insumo: 'EQUIPO' | 'MANO_OBRA' | 'MATERIAL' | 'TRANSPORTE';
  insumo_id?: number;
  descripcion: string;
  unidad?: string;
  cantidad: number;
  rendimiento: number;
  costo_unitario: number;
  subtotal: number;
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
   * Resuelve el id de la categoría OBRA GRIS
   */
  private getCategoriaObraGrisId(): Observable<number> {
    return from(
      this.supabaseService.supabase
        .from('categorias')
        .select('id')
        .ilike('nombre', 'OBRA GRIS')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error al obtener categoría OBRA GRIS:', error);
          throw error;
        }
        return data.id;
      })
    );
  }

  /**
   * Subcategorías de Obra Gris, con su id (las necesitamos para filtrar rubros)
   */
  private getSubcategoriasConId(): Observable<{ id: number; nombre: string }[]> {
    return this.getCategoriaObraGrisId().pipe(
      switchMap(categoriaId =>
        from(
          this.supabaseService.supabase
            .from('subcategorias')
            .select('id, nombre')
            .eq('categoria_id', categoriaId)
            .order('id', { ascending: true })
        )
      ),
      map(({ data, error }: any) => {
        if (error) {
          console.error('Error al cargar subcategorías:', error);
          throw error;
        }
        return data || [];
      })
    );
  }

  getSubcategoriasObraGris(): Observable<string[]> {
    return this.getSubcategoriasConId().pipe(
      map(subs => subs.map(s => s.nombre))
    );
  }

  /**
   * Rubros de Obra Gris, filtrando por subcategoria_id (sin filtros anidados de 2 niveles)
   */
  getRubrosObraGris(): Observable<Rubro[]> {
    return this.getSubcategoriasConId().pipe(
      switchMap(subs => {
        if (subs.length === 0) {
          return of([] as any[]);
        }
        const subIds = subs.map(s => s.id);
        const nombrePorId = new Map(subs.map(s => [s.id, s.nombre]));

        return from(
          this.supabaseService.supabase
            .from('rubros')
            .select(`
              id,
              codigo,
              descripcion,
              unidad_medida,
              costo_directo_total,
              subcategoria_id,
              apu_detalles (
                id,
                rubro_id,
                tipo_insumo,
                insumo_id,
                descripcion,
                unidad,
                cantidad,
                rendimiento,
                costo_unitario,
                subtotal
              )
            `)
            .in('subcategoria_id', subIds)
            .order('codigo', { ascending: true })
        ).pipe(
          map(({ data, error }: any) => {
            if (error) {
              console.error('Error al consultar Supabase:', error);
              throw error;
            }
            return (data || []).map((item: any) => ({
              ...item,
              subcategoria_nombre: nombrePorId.get(item.subcategoria_id) || ''
            }));
          })
        );
      }),
      map((rows: any[]) =>
        rows.map((item: any) => {
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
            subcategoria_nombre: item.subcategoria_nombre,
            desplegado: false,
            equipos,
            manoObra,
            materiales,
            transporte,
            subtotalEquipos: equipos.reduce((acc, el) => acc + (Number(el.subtotal) || 0), 0),
            subtotalManoObra: manoObra.reduce((acc, el) => acc + (Number(el.subtotal) || 0), 0),
            subtotalMateriales: materiales.reduce((acc, el) => acc + (Number(el.subtotal) || 0), 0),
            subtotalTransporte: transporte.reduce((acc, el) => acc + (Number(el.subtotal) || 0), 0)
          };
        })
      )
    );
  }
}