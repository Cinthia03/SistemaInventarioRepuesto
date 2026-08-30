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

export interface RubroParaEditar {
  rubro: RubroBD;
  detalles: any[];
}

/**
 * Configuración de "sistema" (Obra Gris, Hidráulico, Eléctrico, Acabados).
 * Permite que ApuService trabaje contra tablas físicas distintas por sistema,
 * sin duplicar la lógica de negocio.
 */
export interface SistemaConfig {
  /** Nombre EXACTO tal cual está guardado en categorias.nombre */
  categoriaNombre: string;
  /** Tabla de rubros del sistema (ej. 'rubros', 'hidraulico_rubros') */
  tablaRubros: string;
  /** Tabla de detalle APU del sistema (ej. 'apu_detalles', 'hidraulico_apu_detalles') */
  tablaApuDetalles: string;
}

export const SISTEMA_OBRA_GRIS: SistemaConfig = {
  categoriaNombre: 'OBRA GRIS',
  tablaRubros: 'rubros',
  tablaApuDetalles: 'apu_detalles'
};

export const SISTEMA_HIDRAULICO: SistemaConfig = {
  categoriaNombre: 'HIDRAULICO',
  tablaRubros: 'hidraulico_rubros',
  tablaApuDetalles: 'hidraulico_apu_detalles'
};

export const SISTEMA_ELECTRICO: SistemaConfig = {
  categoriaNombre: 'ELECTRICO',
  tablaRubros: 'electrico_rubros',
  tablaApuDetalles: 'electrico_apu_detalles'
};

export const SISTEMA_ACABADOS: SistemaConfig = {
  categoriaNombre: 'ACABADOS',
  tablaRubros: 'acabados_rubros',
  tablaApuDetalles: 'acabados_apu_detalles'
};

@Injectable({
  providedIn: 'root'
})
export class ApuService {

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Obtiene las subcategorías asociadas a una categoría dinámica desde la BD.
   * @param nombreCategoria Nombre EXACTO de categorias.nombre (ej. 'HIDRAULICO').
   */
  getSubcategoriasPorCategoria(nombreCategoria: string): Observable<Subcategoria[]> {
    return from(
      this.supabaseService.supabase
        .from('subcategorias')
        .select('*, categorias!inner(nombre)')
        .ilike('categorias.nombre', nombreCategoria)
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
   * Obtiene el último número secuencial registrado para una subcategoría,
   * dentro de la tabla de rubros del sistema indicado.
   */
  getUltimoCodigo(subcategoriaId: number, tablaRubros: string = 'rubros'): Observable<number> {
    return from(
      this.supabaseService.supabase
        .from(tablaRubros)
        .select('codigo')
        .eq('subcategoria_id', subcategoriaId)
        .order('id', { ascending: false })
        .limit(1)
    ).pipe(
      map(({ data, error }) => {
        if (error || !data || data.length === 0) return 0;

        const partes = data[0].codigo.split('.');
        const ultimoNumero = parseInt(partes[partes.length - 1], 10);
        return isNaN(ultimoNumero) ? 0 : ultimoNumero;
      })
    );
  }

  /**
   * Trae un rubro existente junto con todas sus líneas de detalle,
   * para precargar el formulario de "Calcular" en modo edición.
   */
  obtenerRubroParaEditar(id: number, sistema: SistemaConfig = SISTEMA_OBRA_GRIS): Observable<RubroParaEditar> {
    return from(
      (async () => {
        const { data: rubro, error: rubroError } = await this.supabaseService.supabase
          .from(sistema.tablaRubros)
          .select('*')
          .eq('id', id)
          .single();

        if (rubroError) throw rubroError;

        const { data: detalles, error: detallesError } = await this.supabaseService.supabase
          .from(sistema.tablaApuDetalles)
          .select('*')
          .eq('rubro_id', id);

        if (detallesError) throw detallesError;

        return { rubro, detalles: detalles || [] };
      })()
    );
  }

  /**
   * Arma las filas de apu_detalles a partir del payload del formulario.
   * Compartido entre crear (guardar) y editar (actualizar) para no duplicar la lógica.
   */
  private construirDetalles(rubroId: number, payload: ApuGuardado): any[] {
    const detalles: any[] = [];

    payload.equipos?.forEach(item => {
      if (item.id) {
        detalles.push({
          rubro_id: rubroId,
          tipo_insumo: 'EQUIPO',
          insumo_id: item.id,
          cantidad: item.cantidad,
          rendimiento: item.rendimiento,
          costo_unitario: item.tarifa,
          subtotal: item.costo,
          descripcion: item.descripcion,
          unidad: item.unidad
        });
      }
    });

    payload.manoObra?.forEach(item => {
      if (item.id) {
        detalles.push({
          rubro_id: rubroId,
          tipo_insumo: 'MANO_OBRA',
          insumo_id: item.id,
          cantidad: item.cantidad,
          rendimiento: item.rendimiento,
          costo_unitario: item.tarifa,
          subtotal: item.costo,
          descripcion: item.descripcion,
          unidad: item.unidad
        });
      }
    });

    payload.materiales?.forEach(item => {
      if (item.id) {
        detalles.push({
          rubro_id: rubroId,
          tipo_insumo: 'MATERIAL',
          insumo_id: item.id,
          cantidad: item.cantidad,
          rendimiento: 0,
          costo_unitario: item.unitario,
          subtotal: item.costo,
          descripcion: item.descripcion,
          unidad: item.unidad
        });
      }
    });

    payload.transporte?.forEach(item => {
      if (item.id) {
        detalles.push({
          rubro_id: rubroId,
          tipo_insumo: 'TRANSPORTE',
          insumo_id: item.id,
          cantidad: item.cantidad,
          rendimiento: 0,
          costo_unitario: item.unitario,
          subtotal: item.costo,
          descripcion: item.descripcion,
          unidad: item.unidad
        });
      }
    });

    return detalles;
  }

  /**
   * Guarda el rubro y su APU en Supabase (crea un rubro NUEVO),
   * apuntando a las tablas del sistema indicado (por defecto, Obra Gris).
   */
  guardar(payload: ApuGuardado, sistema: SistemaConfig = SISTEMA_OBRA_GRIS): Observable<any> {
    return from(
      (async () => {
        const { data: rubroData, error: rubroError } = await this.supabaseService.supabase
          .from(sistema.tablaRubros)
          .insert({
            subcategoria_id: payload.subcategoriaId,
            codigo: payload.rubroCodigo,
            descripcion: payload.rubroDescripcion,
            costo_directo_total: payload.totalDirecto
          })
          .select()
          .single();

        if (rubroError) throw rubroError;

        const detalles = this.construirDetalles(rubroData.id, payload);

        if (detalles.length > 0) {
          const { error: detallesError } = await this.supabaseService.supabase
            .from(sistema.tablaApuDetalles)
            .insert(detalles);

          if (detallesError) throw detallesError;
        }

        return rubroData;
      })()
    );
  }

  /**
   * Actualiza un rubro EXISTENTE (modo edición): actualiza los datos del
   * rubro y reemplaza por completo su detalle APU (borra el anterior e
   * inserta el actual), que es más simple y seguro que calcular diffs.
   */
  actualizar(id: number, payload: ApuGuardado, sistema: SistemaConfig = SISTEMA_OBRA_GRIS): Observable<any> {
    return from(
      (async () => {
        const { data: rubroData, error: rubroError } = await this.supabaseService.supabase
          .from(sistema.tablaRubros)
          .update({
            subcategoria_id: payload.subcategoriaId,
            codigo: payload.rubroCodigo,
            descripcion: payload.rubroDescripcion,
            costo_directo_total: payload.totalDirecto
          })
          .eq('id', id)
          .select()
          .single();

        if (rubroError) throw rubroError;

        const { error: deleteError } = await this.supabaseService.supabase
          .from(sistema.tablaApuDetalles)
          .delete()
          .eq('rubro_id', id);

        if (deleteError) throw deleteError;

        const detalles = this.construirDetalles(id, payload);

        if (detalles.length > 0) {
          const { error: detallesError } = await this.supabaseService.supabase
            .from(sistema.tablaApuDetalles)
            .insert(detalles);

          if (detallesError) throw detallesError;
        }

        return rubroData;
      })()
    );
  }

  obtenerTodos(tablaRubros: string = 'rubros', tablaApuDetalles: string = 'apu_detalles'): Observable<any> {
    return from(
      this.supabaseService.supabase
        .from(tablaRubros)
        .select(`*, ${tablaApuDetalles}(*)`)
        .order('created_at', { ascending: false })
    );
  }

  eliminar(id: number, tablaRubros: string = 'rubros'): Observable<any> {
    return from(
      this.supabaseService.supabase
        .from(tablaRubros)
        .delete()
        .eq('id', id)
    );
  }
}