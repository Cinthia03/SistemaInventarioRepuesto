import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../../core/services/supabase.service';
import { descargarCsv, hoyIso } from '../../../shared/utilidades/exportar';

export interface Barra {
  etiqueta: string;
  valor: number;
  detalle?: string;
}

/** Tablas de APU de cada sistema constructivo. */
const SISTEMAS = [
  { tabla: 'apus_rubros',            nombre: 'Obra gris' },
  { tabla: 'acabados_apus_rubros',   nombre: 'Acabados' },
  { tabla: 'hidraulico_apus_rubros', nombre: 'Hidráulico sanitario' },
  { tabla: 'electrico_apus_rubros',  nombre: 'Instalaciones eléctricas' }
];

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-reportes-estrategicos',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './estrategicos.html',
  styleUrls: ['../../../shared/estilos/pagina-admin.css', './estrategicos.css']
})
export class ReportesEstrategicosComponent implements OnInit {
  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly db = inject(SupabaseService).supabase;

  cargando = true;
  readonly fechaReporte = new Date();

  // KPIs
  valorMateriales = 0;
  valorEquipos = 0;
  numPresupuestos = 0;
  montoPresupuestos = 0;
  rubrosConApu = 0;
  pctStockSaludable = 0;

  // Gráficos
  topMateriales: Barra[] = [];
  inventarioPorCategoria: Barra[] = [];
  apuPorSistema: Barra[] = [];
  presupuestosPorMes: Barra[] = [];

  async ngOnInit() {
    try {
      const [mat, eq, pres, ...apus] = await Promise.all([
        this.db.from('materiales').select('descripcion, categoria, precio, stock'),
        this.db.from('equipos').select('descripcion, precio, stock'),
        this.db.from('presupuestos').select('nombre, total, creado_en, fecha_presupuesto'),
        ...SISTEMAS.map(s => this.db.from(s.tabla).select('total_directo'))
      ]);

      // ── Inventario ───────────────────────────
      const materiales = (mat.data ?? []).map((m: any) => ({
        ...m, valor: Number(m.stock || 0) * Number(m.precio || 0)
      }));
      this.valorMateriales = materiales.reduce((s, m) => s + m.valor, 0);
      this.valorEquipos = (eq.data ?? []).reduce((s: number, e: any) => s + Number(e.stock || 0) * Number(e.precio || 0), 0);
      this.pctStockSaludable = materiales.length
        ? Math.round(materiales.filter(m => Number(m.stock || 0) >= 10).length * 100 / materiales.length)
        : 0;

      this.topMateriales = materiales
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10)
        .map(m => ({ etiqueta: m.descripcion, valor: m.valor, detalle: `${m.stock} u × $${Number(m.precio).toFixed(2)}` }));

      const porCat = new Map<string, number>();
      materiales.forEach(m => porCat.set(m.categoria || 'Sin categoría', (porCat.get(m.categoria || 'Sin categoría') || 0) + m.valor));
      this.inventarioPorCategoria = [...porCat.entries()]
        .map(([etiqueta, valor]) => ({ etiqueta, valor }))
        .sort((a, b) => b.valor - a.valor);

      // ── Presupuestos ─────────────────────────
      const presupuestos = (pres.data ?? []) as any[];
      this.numPresupuestos = presupuestos.length;
      this.montoPresupuestos = presupuestos.reduce((s, p) => s + Number(p.total || 0), 0);

      const hoy = new Date();
      const meses: Barra[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const delMes = presupuestos.filter(p => {
          const f = new Date(p.fecha_presupuesto || p.creado_en);
          return f.getFullYear() === d.getFullYear() && f.getMonth() === d.getMonth();
        });
        meses.push({
          etiqueta: `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          valor: delMes.reduce((s, p) => s + Number(p.total || 0), 0),
          detalle: `${delMes.length} presupuesto(s)`
        });
      }
      this.presupuestosPorMes = meses;

      // ── APU por sistema ──────────────────────
      this.apuPorSistema = SISTEMAS.map((s, i) => {
        const filas = (apus[i].data ?? []) as any[];
        const total = filas.reduce((acc, f) => acc + Number(f.total_directo || 0), 0);
        return {
          etiqueta: s.nombre,
          valor: filas.length ? total / filas.length : 0,
          detalle: `${filas.length} rubro(s) con APU`
        };
      });
      this.rubrosConApu = SISTEMAS.reduce((s, _x, i) => s + (apus[i].data?.length ?? 0), 0);

      this.cargando = false;
    } finally {
      this.cdr.markForCheck();
    }
  }

  get valorInventario(): number {
    return this.valorMateriales + this.valorEquipos;
  }

  get promedioPresupuesto(): number {
    return this.numPresupuestos ? this.montoPresupuestos / this.numPresupuestos : 0;
  }

  maximo(barras: Barra[]): number {
    return Math.max(1, ...barras.map(b => b.valor));
  }

  ancho(b: Barra, barras: Barra[]): number {
    return Math.max(b.valor > 0 ? 1.5 : 0, (b.valor / this.maximo(barras)) * 100);
  }

  exportar() {
    const filas = [
      { seccion: 'Indicadores', concepto: 'Valor total del inventario', valor: this.valorInventario },
      { seccion: 'Indicadores', concepto: 'Valor de materiales', valor: this.valorMateriales },
      { seccion: 'Indicadores', concepto: 'Valor de equipos', valor: this.valorEquipos },
      { seccion: 'Indicadores', concepto: 'Presupuestos elaborados', valor: this.numPresupuestos },
      { seccion: 'Indicadores', concepto: 'Monto total presupuestado', valor: this.montoPresupuestos },
      { seccion: 'Indicadores', concepto: 'Promedio por presupuesto', valor: this.promedioPresupuesto },
      { seccion: 'Indicadores', concepto: '% materiales con stock saludable', valor: this.pctStockSaludable },
      ...this.inventarioPorCategoria.map(b => ({ seccion: 'Inventario por categoría', concepto: b.etiqueta, valor: b.valor })),
      ...this.topMateriales.map(b => ({ seccion: 'Top materiales por valor', concepto: b.etiqueta, valor: b.valor })),
      ...this.apuPorSistema.map(b => ({ seccion: 'Costo directo promedio APU', concepto: b.etiqueta, valor: b.valor })),
      ...this.presupuestosPorMes.map(b => ({ seccion: 'Presupuestado por mes', concepto: b.etiqueta, valor: b.valor }))
    ];
    descargarCsv(`reporte-estrategico-${hoyIso()}`, [
      { titulo: 'Sección', valor: f => f.seccion },
      { titulo: 'Concepto', valor: f => f.concepto },
      { titulo: 'Valor', valor: f => Number(f.valor).toFixed(2) }
    ], filas);
  }

  imprimir() {
    window.print();
  }
}
