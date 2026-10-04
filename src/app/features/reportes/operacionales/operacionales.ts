import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../../core/services/supabase.service';
import { descargarCsv, hoyIso } from '../../../shared/utilidades/exportar';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador';
import { Paginacion } from '../../../shared/components/paginador/paginacion';

type Pestana = 'materiales' | 'equipos' | 'mano_obra';

interface Item {
  codigo: string;
  descripcion: string;
  unidad: string;
  categoria?: string;
  precio: number;
  stock: number | null;
}

/** Igual que el panel de Inventario: menos de 10 unidades es stock bajo. */
const STOCK_BAJO = 10;

@Component({
  selector: 'app-reportes-operacionales',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PaginadorComponent],
  templateUrl: './operacionales.html',
  styleUrls: ['../../../shared/estilos/pagina-admin.css']
})
export class ReportesOperacionalesComponent implements OnInit {
  /** Paginación de la tabla (lado cliente). */
  readonly pag = new Paginacion();

  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly db = inject(SupabaseService).supabase;

  readonly pestanas: { id: Pestana; nombre: string; icono: string }[] = [
    { id: 'materiales', nombre: 'Existencias de materiales', icono: 'inventory' },
    { id: 'equipos',    nombre: 'Existencias de equipos',    icono: 'construction' },
    { id: 'mano_obra',  nombre: 'Tarifas de mano de obra',   icono: 'engineering' }
  ];

  pestana: Pestana = 'materiales';
  datos: Record<Pestana, Item[]> = { materiales: [], equipos: [], mano_obra: [] };
  cargando = true;
  error = '';

  busqueda = '';
  filtroEstado: '' | 'agotado' | 'bajo' | 'normal' = '';
  filtroCategoria = '';
  readonly fechaReporte = new Date();

  async ngOnInit() {
    try {
      const [m, e, o] = await Promise.all([
        this.db.from('materiales').select('*').order('codigo'),
        this.db.from('equipos').select('*').order('codigo'),
        this.db.from('mano_obra').select('*').order('codigo')
      ]);
      this.cargando = false;
      const err = m.error || e.error || o.error;
      if (err) this.error = err.message;

      const mapear = (filas: any[] | null, conStock: boolean): Item[] => (filas ?? []).map(f => ({
        codigo: f.codigo,
        descripcion: f.descripcion,
        unidad: f.unidad,
        categoria: f.categoria,
        precio: Number(f.precio || 0),
        stock: conStock ? Number(f.stock || 0) : null
      }));
      this.datos = {
        materiales: mapear(m.data, true),
        equipos: mapear(e.data, true),
        mano_obra: mapear(o.data, false)
      };
    } finally {
      this.cdr.markForCheck();
    }
  }

  get conStock(): boolean {
    return this.pestana !== 'mano_obra';
  }

  get categorias(): string[] {
    return Array.from(new Set(this.datos[this.pestana].map(i => i.categoria).filter(Boolean) as string[])).sort();
  }

  get filas(): Item[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.datos[this.pestana].filter(i =>
      (!q || i.codigo?.toLowerCase().includes(q) || i.descripcion?.toLowerCase().includes(q)) &&
      (!this.filtroCategoria || i.categoria === this.filtroCategoria) &&
      (!this.filtroEstado || !this.conStock || this.estado(i) === this.filtroEstado)
    );
  }

  get totalValor(): number {
    return this.filas.reduce((s, i) => s + (i.stock ?? 0) * i.precio, 0);
  }

  contar(estado: 'agotado' | 'bajo' | 'normal'): number {
    return this.datos[this.pestana].filter(i => this.estado(i) === estado).length;
  }

  estado(i: Item): 'agotado' | 'bajo' | 'normal' {
    const s = i.stock ?? 0;
    return s <= 0 ? 'agotado' : s < STOCK_BAJO ? 'bajo' : 'normal';
  }

  cambiar(p: Pestana) {
    this.pestana = p;
    this.pag.reiniciar();
    this.filtroCategoria = '';
    this.filtroEstado = '';
  }

  exportar() {
    const conStock = this.conStock;
    descargarCsv(`reporte-${this.pestana}-${hoyIso()}`, [
      { titulo: 'Código', valor: i => i.codigo },
      { titulo: 'Descripción', valor: i => i.descripcion },
      { titulo: 'Categoría', valor: i => i.categoria ?? '' },
      { titulo: 'Unidad', valor: i => i.unidad },
      { titulo: 'Precio', valor: i => i.precio.toFixed(2) },
      ...(conStock ? [
        { titulo: 'Stock', valor: (i: Item) => i.stock ?? 0 },
        { titulo: 'Valor', valor: (i: Item) => ((i.stock ?? 0) * i.precio).toFixed(2) },
        { titulo: 'Estado', valor: (i: Item) => this.estado(i) }
      ] : [])
    ], this.filas);
  }

  imprimir() {
    // Se imprimen todas las filas, no solo la página visible
    const { tamano, pagina } = this.pag;
    this.pag.tamano = Number.MAX_SAFE_INTEGER;
    this.pag.pagina = 1;
    this.cdr.detectChanges();
    window.print();
    this.pag.tamano = tamano;
    this.pag.pagina = pagina;
    this.cdr.markForCheck();
  }
}
