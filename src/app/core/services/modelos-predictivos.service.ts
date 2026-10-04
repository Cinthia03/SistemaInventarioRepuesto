import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';

// ============================================================
//  MODELOS PREDICTIVOS DE INVENTARIO
// ------------------------------------------------------------
//  Este servicio hace dos cosas:
//
//  1) Persiste "fotografías" diarias (stock + precio) de cada ítem
//     en la tabla historial_inventario (ver sql/HISTORIAL_INVENTARIO_
//     MODELOS_PREDICTIVOS.sql). Cada fotografía es un punto más para
//     el modelo.
//
//  2) Calcula, con esas fotografías, una regresión lineal simple
//     (mínimos cuadrados) por ítem para proyectar:
//       - el stock esperado dentro de 30 días,
//       - los días que faltan para que el stock llegue a 0,
//       - la tendencia del precio a 30 días.
//
//  Es un modelo estadístico simple e interpretable (no una caja
//  negra): con pocos puntos históricos el sistema lo indica
//  claramente en vez de inventar una predicción.
// ============================================================

export type TipoInventario = 'materiales' | 'mano_obra' | 'equipos';

export type NivelRiesgo = 'critico' | 'alto' | 'medio' | 'bajo' | 'sin-datos';

export interface PuntoHistorico {
  fecha: string;            // 'YYYY-MM-DD'
  stock: number | null;     // null para ítems que no manejan stock (mano_obra)
  precio: number;
}

export interface ItemInventario {
  codigo: string;
  descripcion: string;
  categoria?: string;
  stock?: number | null;
  precio: number;
}

interface RegresionLineal {
  pendiente: number;
  interseccion: number;
  puntos: number;
}

export interface PrediccionItem {
  tipo: TipoInventario;
  codigo: string;
  descripcion: string;
  categoria?: string;

  stockActual: number | null;
  precioActual: number;

  puntosHistoricos: number;

  stockProyectado30: number | null;
  diasHastaAgotamiento: number | null;

  tendenciaPrecioPorcentaje: number | null;
  precioProyectado30: number;

  riesgo: NivelRiesgo;
}

@Injectable({
  providedIn: 'root'
})
export class ModelosPredictivosService {

  // Mínimo de fotografías en fechas distintas que exige el modelo
  // para calcular una tendencia (con menos, no hay suficiente
  // información para una regresión confiable).
  static readonly PUNTOS_MINIMOS_PARA_TENDENCIA = 2;

  constructor(
    private supabaseService: SupabaseService
  ) {}

  // ============================================================
  //  PERSISTENCIA DEL HISTORIAL
  // ============================================================

  /**
   * Toma el estado actual de un catálogo (materiales / mano_obra / equipos)
   * y guarda una fotografía de hoy para cada ítem. Si ya existe una
   * fotografía de hoy para ese ítem, la reemplaza (upsert).
   */
  registrarSnapshot(tipo: TipoInventario) {
    return from(this.registrarSnapshotAsync(tipo));
  }

  private async registrarSnapshotAsync(tipo: TipoInventario) {
    const { data, error } = await this.supabaseService.supabase
      .from(tipo)
      .select('*');

    if (error) {
      return { data: null, error };
    }

    const items = data ?? [];
    if (items.length === 0) {
      return { data: [], error: null };
    }

    const hoy = new Date().toISOString().slice(0, 10);

    const filas = items.map((item: any) => ({
      tipo,
      codigo: item.codigo,
      descripcion: item.descripcion ?? '',
      categoria: item.categoria ?? null,
      stock: item.stock ?? null,
      precio: Number(item.precio ?? 0),
      fecha: hoy
    }));

    return await this.supabaseService.supabase
      .from('historial_inventario')
      .upsert(filas, { onConflict: 'tipo,codigo,fecha' });
  }

  /**
   * Permite completar el historial manualmente con un dato de una
   * fecha pasada (por ejemplo, tomado de una factura antigua), para
   * que el modelo tenga más puntos sin esperar varios días.
   */
  registrarPuntoManual(
    tipo: TipoInventario,
    item: { codigo: string; descripcion: string; categoria?: string | null },
    fecha: string,
    stock: number | null,
    precio: number
  ) {
    return from(
      this.supabaseService.supabase
        .from('historial_inventario')
        .upsert(
          [{
            tipo,
            codigo: item.codigo,
            descripcion: item.descripcion,
            categoria: item.categoria ?? null,
            stock,
            precio,
            fecha
          }],
          { onConflict: 'tipo,codigo,fecha' }
        )
    );
  }

  /** Historial completo (todos los ítems) de un catálogo, ordenado por fecha. */
  obtenerHistorialCompleto(tipo: TipoInventario) {
    return from(
      this.supabaseService.supabase
        .from('historial_inventario')
        .select('codigo,fecha,stock,precio')
        .eq('tipo', tipo)
        .order('fecha', { ascending: true })
    );
  }

  // ============================================================
  //  MODELO: REGRESIÓN LINEAL SIMPLE (MÍNIMOS CUADRADOS)
  // ============================================================

  private static regresionLineal(puntos: { x: number; y: number }[]): RegresionLineal | null {
    const n = puntos.length;
    if (n < ModelosPredictivosService.PUNTOS_MINIMOS_PARA_TENDENCIA) {
      return null;
    }

    const sumaX = puntos.reduce((s, p) => s + p.x, 0);
    const sumaY = puntos.reduce((s, p) => s + p.y, 0);
    const sumaXY = puntos.reduce((s, p) => s + p.x * p.y, 0);
    const sumaX2 = puntos.reduce((s, p) => s + p.x * p.x, 0);

    const denominador = n * sumaX2 - sumaX * sumaX;
    if (denominador === 0) {
      // Todos los puntos caen en la misma fecha: no hay variación en el
      // tiempo, así que no se puede estimar una pendiente.
      return null;
    }

    const pendiente = (n * sumaXY - sumaX * sumaY) / denominador;
    const interseccion = (sumaY - pendiente * sumaX) / n;

    return { pendiente, interseccion, puntos: n };
  }

  private static proyectar(regresion: RegresionLineal, x: number): number {
    return regresion.pendiente * x + regresion.interseccion;
  }

  // ============================================================
  //  CONSTRUCCIÓN DE LA PREDICCIÓN DE UN ÍTEM
  // ============================================================

  static construirPrediccion(
    tipo: TipoInventario,
    item: ItemInventario,
    historial: PuntoHistorico[]
  ): PrediccionItem {

    const prediccion: PrediccionItem = {
      tipo,
      codigo: item.codigo,
      descripcion: item.descripcion,
      categoria: item.categoria,
      stockActual: item.stock ?? null,
      precioActual: Number(item.precio ?? 0),
      puntosHistoricos: historial.length,
      stockProyectado30: null,
      diasHastaAgotamiento: null,
      tendenciaPrecioPorcentaje: null,
      precioProyectado30: Number(item.precio ?? 0),
      riesgo: 'sin-datos'
    };

    if (historial.length < ModelosPredictivosService.PUNTOS_MINIMOS_PARA_TENDENCIA) {
      // Sin suficiente historial todavía: se clasifica solo por el
      // stock actual, para no dejar la pantalla vacía mientras se
      // acumulan fotografías.
      if (item.stock !== undefined && item.stock !== null) {
        prediccion.riesgo = Number(item.stock) < 10 ? 'medio' : 'bajo';
      }
      return prediccion;
    }

    const historialOrdenado = [...historial].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    const origenMs = new Date(historialOrdenado[0].fecha).getTime();
    const unDiaMs = 1000 * 60 * 60 * 24;
    const aX = (fecha: string) =>
      Math.round((new Date(fecha).getTime() - origenMs) / unDiaMs);

    const ultimoX = aX(historialOrdenado[historialOrdenado.length - 1].fecha);

    // ---------------- TENDENCIA DE PRECIO ----------------
    const puntosPrecio = historialOrdenado.map(h => ({ x: aX(h.fecha), y: Number(h.precio) }));
    const regPrecio = ModelosPredictivosService.regresionLineal(puntosPrecio);

    if (regPrecio) {
      const precioProyectado = ModelosPredictivosService.proyectar(regPrecio, ultimoX + 30);
      prediccion.precioProyectado30 = Math.max(0, precioProyectado);
      prediccion.tendenciaPrecioPorcentaje = prediccion.precioActual > 0
        ? ((prediccion.precioProyectado30 - prediccion.precioActual) / prediccion.precioActual) * 100
        : 0;
    }

    // ---------------- PROYECCIÓN DE STOCK ----------------
    const manejaStock = item.stock !== undefined && item.stock !== null;
    const historialConStock = historialOrdenado.filter(
      h => h.stock !== null && h.stock !== undefined
    );

    if (manejaStock && historialConStock.length >= ModelosPredictivosService.PUNTOS_MINIMOS_PARA_TENDENCIA) {
      const puntosStock = historialConStock.map(h => ({ x: aX(h.fecha), y: Number(h.stock) }));
      const regStock = ModelosPredictivosService.regresionLineal(puntosStock);

      if (regStock) {
        const stockProyectado = ModelosPredictivosService.proyectar(regStock, ultimoX + 30);
        prediccion.stockProyectado30 = Math.max(0, Math.round(stockProyectado));

        if (regStock.pendiente < 0) {
          // x donde la recta cruza y = 0 (stock = 0)
          const xAgotamiento = -regStock.interseccion / regStock.pendiente;
          const dias = Math.round(xAgotamiento - ultimoX);
          prediccion.diasHastaAgotamiento = dias > 0 ? dias : 0;
        }
      }
    }

    // ---------------- CLASIFICACIÓN DE RIESGO ----------------
    if (prediccion.diasHastaAgotamiento !== null) {
      if (prediccion.diasHastaAgotamiento <= 7) prediccion.riesgo = 'critico';
      else if (prediccion.diasHastaAgotamiento <= 15) prediccion.riesgo = 'alto';
      else if (prediccion.diasHastaAgotamiento <= 30) prediccion.riesgo = 'medio';
      else prediccion.riesgo = 'bajo';
    } else if (manejaStock) {
      prediccion.riesgo = Number(item.stock) < 10 ? 'medio' : 'bajo';
    } else {
      // Ítems sin stock (mano de obra): el "riesgo" se basa en si el
      // precio proyectado sube con fuerza.
      prediccion.riesgo = (prediccion.tendenciaPrecioPorcentaje ?? 0) > 15 ? 'medio' : 'bajo';
    }

    return prediccion;
  }
}
