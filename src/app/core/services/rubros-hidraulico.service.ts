import { Injectable } from '@angular/core';
import { from, Observable, map, switchMap, of } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Rubro, DetalleApu } from './rubros-obra-gris.service';

// Se reexportan para no romper componentes que ya importaban estos nombres
// desde este archivo (p. ej. sistema-hidraulico-sanitario.ts).
export type { Rubro };
export type RubroHidraulico = Rubro;

@Injectable({
  providedIn: 'root'
})
export class RubrosHidraulicoService {

  private readonly NOMBRE_CATEGORIA = 'HIDRAULICO';

  constructor(private supabaseService: SupabaseService) {}

  private getCategoriaHidraulicoId(): Observable<number> {
    return from(
      this.supabaseService.supabase
        .from('categorias')
        .select('id')
        .ilike('nombre', this.NOMBRE_CATEGORIA)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error al obtener categoría HIDRAULICO:', error);
          throw error;
        }
        return data.id;
      })
    );
  }

  private getSubcategoriasConId(): Observable<{ id: number; nombre: string }[]> {
    return this.getCategoriaHidraulicoId().pipe(
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
          console.error('Error al cargar subcategorías de Hidráulico:', error);
          throw error;
        }
        return data || [];
      })
    );
  }

  getSubcategoriasHidraulico(): Observable<string[]> {
    return this.getSubcategoriasConId().pipe(
      map(subs => subs.map(s => s.nombre))
    );
  }

  getRubrosHidraulico(): Observable<Rubro[]> {
    return this.getSubcategoriasConId().pipe(
      switchMap(subs => {
        if (subs.length === 0) {
          return of([] as any[]);
        }
        const subIds = subs.map(s => s.id);
        const nombrePorId = new Map(subs.map(s => [s.id, s.nombre]));

        return from(
          this.supabaseService.supabase
            .from('hidraulico_rubros')
            .select(`
              id,
              codigo,
              descripcion,
              unidad_medida,
              costo_directo_total,
              subcategoria_id,
              hidraulico_apu_detalles (
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
              console.error('Error al consultar hidraulico_rubros:', error);
              throw error;
            }
            return (data || []).map((item: any) => ({
              ...item,
              apu_detalles: item.hidraulico_apu_detalles,
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

  // ---- Compatibilidad con el nombre de métodos que ya usaba el componente ----
  getRubros(): Observable<Rubro[]> {
    return this.getRubrosHidraulico();
  }

  getCategorias(): Observable<string[]> {
    return this.getSubcategoriasHidraulico();
  }
}
