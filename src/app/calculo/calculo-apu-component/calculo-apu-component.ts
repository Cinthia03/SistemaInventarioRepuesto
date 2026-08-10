import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { EquiposService, equipos } from '../../core/services/equipos.service';
import { ManoDeObraService, ManoObra } from '../../core/services/mano-de-obra.service';
import { MaterialeService, materiales } from '../../core/services/materiales.service';
import { ApuService, Subcategoria, ApuGuardado } from '../../core/services/apu.service';

export interface EquipoCalculo {
  id?: number;
  codigo?: string;
  descripcion: string;
  unidad?: string;
  stock: number;
  cantidad: number;
  tarifa: number;
  rendimiento: number;
  costoHora: number;
  costo: number;
}

export interface ManoObraCalculo {
  id?: number;
  codigo?: string;
  categoria?: string;
  descripcion: string;
  unidad?: string;
  cantidad: number;
  tarifa: number;
  rendimiento: number;
  costoHora: number;
  costo: number;
}

export interface MaterialesCalculo {
  id?: number;
  codigo?: string;
  descripcion: string;
  unidad?: string;
  stock: number;
  cantidad: number;
  unitario: number;
  costo: number;
}

@Component({
  selector: 'app-calculo-apu-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule
  ],
  templateUrl: './calculo-apu-component.html',
  styleUrl: './calculo-apu-component.css',
})
export class CalculoApuComponent implements OnInit {

  rubroCodigo: string = '';
  rubroDescripcion: string = '';
  categoriaActual: string = '';
  categoriaTitulo: string = '';

  subcategoriaId: number | null = null;
  subcategoriasList: Subcategoria[] = [];

  catalogoEquipos: equipos[] = [];
  catalogManoObra: ManoObra[] = [];
  catalogoMateriales: materiales[] = [];

  equiposList: EquipoCalculo[] = [];
  manoObraList: ManoObraCalculo[] = [];
  materialesList: MaterialesCalculo[] = [];
  transporteList: MaterialesCalculo[] = [];

  subtotalEquipos: number = 0;
  subtotalManoObra: number = 0;
  subtotalMateriales: number = 0;
  subtotalTransporte: number = 0;
  totalDirecto: number = 0;

  mensajeError: string = '';
  mensajeExito: string = '';
  cargandoEquipos: boolean = false;
  cargandoManoObra: boolean = false;
  cargandoMateriales: boolean = false;
  cargandoSubcategorias: boolean = false;

  constructor(
    private equiposService: EquiposService,
    private manoObraService: ManoDeObraService,
    private materialesService: MaterialeService,
    private apuService: ApuService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  get catalogoTransportes(): equipos[] {
    return this.catalogoEquipos.filter(
      equipo => equipo.descripcion?.toLowerCase().includes('transporte')
    );
  }

  ngOnInit(): void {
    this.categoriaActual = this.route.snapshot.paramMap.get('categoria') || this.extraerCategoriaDeRuta();
    this.categoriaTitulo = this.formatearTitulo(this.categoriaActual);

    this.cargarSubcategorias();
    this.cargarCatalogoEquipos();
    this.cargarCatalogoManoObra();
    this.cargarCatalogoMateriales();
  }

  private extraerCategoriaDeRuta(): string {
    const urlSegments = this.router.url.split('/');
    return urlSegments[urlSegments.length - 1] || 'obra-gris';
  }

  private formatearTitulo(categoria: string): string {
    if (!categoria) return '';
    return categoria
      .split('-')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  /* ==================== CARGA DINÁMICA DE SUBCATEGORÍAS ==================== */
  cargarSubcategorias(): void {
    this.cargandoSubcategorias = true;
    this.apuService.getSubcategoriasPorCategoria(this.categoriaActual).subscribe({
      next: (subcategorias) => {
        this.subcategoriasList = subcategorias;
        this.cargandoSubcategorias = false;
      },
      error: () => {
        this.cargandoSubcategorias = false;
        this.mostrarError('Error al cargar las subcategorías desde la base de datos.');
      }
    });
  }

  generarSiguienteCodigoRubro(): void {
    if (!this.subcategoriaId) {
      this.rubroCodigo = '';
      return;
    }

    const sub = this.subcategoriasList.find(s => s.id === Number(this.subcategoriaId));
    
    this.apuService.getUltimoCodigo(Number(this.subcategoriaId)).subscribe({
      next: (ultimoSecuencial: number) => {
        const siguienteNum = (ultimoSecuencial + 1).toString().padStart(2, '0');
        
        // Si la subcategoría define un prefijo personalizado usa ese, de lo contrario genera con su ID
        const prefix = sub?.codigo_prefix || `1.${this.subcategoriaId}`;
        this.rubroCodigo = `${prefix}.${siguienteNum}`;
      },
      error: () => {
        const prefix = sub?.codigo_prefix || `1.${this.subcategoriaId}`;
        this.rubroCodigo = `${prefix}.01`;
      }
    });
  }

  verCalculosGuardados(): void {
    this.router.navigate(['/calculos-guardados']);
  }

  irAlInicio(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ==================== MÉTODOS DE CARGA DE CATÁLOGOS ==================== */
  cargarCatalogoEquipos(): void {
    this.cargandoEquipos = true;
    this.equiposService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (!error && data) {
          this.catalogoEquipos = data.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
        }
        this.cargandoEquipos = false;
      },
      error: () => this.cargandoEquipos = false
    });
  }

  cargarCatalogoManoObra(): void {
    this.cargandoManoObra = true;
    this.manoObraService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (!error && data) {
          this.catalogManoObra = data.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
        }
        this.cargandoManoObra = false;
      },
      error: () => this.cargandoManoObra = false
    });
  }

  cargarCatalogoMateriales(): void {
    this.cargandoMateriales = true;
    this.materialesService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (!error && data) {
          this.catalogoMateriales = data.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
        }
        this.cargandoMateriales = false;
      },
      error: () => this.cargandoMateriales = false
    });
  }

  /* ==================== AGREGAR / ELIMINAR FILAS ==================== */
  agregarEquipo(): void {
    this.equiposList.push({ descripcion: '', stock: 0, cantidad: 1, tarifa: 0, rendimiento: 0, costoHora: 0, costo: 0.00 });
  }

  agregarManoObra(): void {
    this.manoObraList.push({ descripcion: '', cantidad: 1, tarifa: 0, rendimiento: 0, costoHora: 0, costo: 0.00 });
  }

  agregarMaterial(): void {
    this.materialesList.push({ descripcion: '', unidad: '', cantidad: 1, stock: 0, unitario: 0, costo: 0.00 });
  }

  agregarTransporte(): void {
    this.transporteList.push({ descripcion: '', unidad: '', cantidad: 1, stock: 0, unitario: 0, costo: 0.00 });
  }

  eliminarEquipo(index: number): void { this.equiposList.splice(index, 1); this.calcularTodo(); }
  eliminarManoObra(index: number): void { this.manoObraList.splice(index, 1); this.calcularTodo(); }
  eliminarMaterial(index: number): void { this.materialesList.splice(index, 1); this.calcularTodo(); }
  eliminarTransporte(index: number): void { this.transporteList.splice(index, 1); this.calcularTodo(); }

  /* ==================== MÉTODOS DE SELECCIÓN ==================== */
  seleccionarEquipo(item: EquipoCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const eq = this.catalogoEquipos.find(e => e.id === id);
    if (eq) {
      Object.assign(item, {
        id: eq.id,
        codigo: eq.codigo,
        descripcion: eq.descripcion,
        unidad: eq.unidad,
        tarifa: eq.precio, 
        stock: eq.stock
      });
      this.validarStock(item);
    }
  }

  seleccionarManoObra(item: ManoObraCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const mo = this.catalogManoObra.find(e => e.id === id);
    if (mo) {
      Object.assign(item, {
        id: mo.id,
        codigo: mo.codigo,
        descripcion: mo.descripcion,
        unidad: mo.unidad,
        tarifa: mo.precio 
      });
      this.calcularTodo();
    }
  }

  seleccionarMateriales(item: MaterialesCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const mat = this.catalogoMateriales.find(e => e.id === id);
    if (mat) {
      Object.assign(item, {
        id: mat.id,
        codigo: mat.codigo,
        descripcion: mat.descripcion,
        unidad: mat.unidad,
        unitario: mat.precio, 
        stock: mat.stock
      });
      this.validarStockMat(item);
    }
  }

  seleccionarTransporte(item: MaterialesCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const tr = this.catalogoEquipos.find(e => e.id === id);
    if (tr) {
      Object.assign(item, {
        id: tr.id,
        codigo: tr.codigo,
        descripcion: tr.descripcion,
        unidad: tr.unidad,
        unitario: tr.precio, 
        stock: tr.stock
      });
      this.validarStockMat(item);
    }
  }

  /* ==================== VALIDACIONES Y CÁLCULOS APU ==================== */
  validarStock(item: EquipoCalculo): void {
    if ((item.stock !== undefined) && (item.cantidad || 0) > item.stock) {
      this.mostrarError(`Stock insuficiente para ${item.descripcion}. Máximo disponible: (${item.stock})`);
      item.cantidad = item.stock;
    }
    this.calcularTodo();
  }

  validarStockMat(item: MaterialesCalculo): void {
    if ((item.stock !== undefined) && (item.cantidad || 0) > item.stock) {
      this.mostrarError(`Stock insuficiente para ${item.descripcion}. Máximo disponible: (${item.stock})`);
      item.cantidad = item.stock;
    }
    this.calcularTodo();
  }

  private mostrarError(msj: string): void {
    this.mensajeError = msj;
    this.irAlInicio();
    setTimeout(() => this.mensajeError = '', 3500);
  }

  calcularTodo(): void {
    this.subtotalEquipos = this.equiposList.reduce((acc, e) => {
      e.costoHora = (e.cantidad || 0) * (e.tarifa || 0);
      e.costo = e.costoHora * (e.rendimiento || 0);
      return acc + e.costo;
    }, 0);

    this.subtotalManoObra = this.manoObraList.reduce((acc, mo) => {
      mo.costoHora = (mo.cantidad || 0) * (mo.tarifa || 0);
      mo.costo = mo.costoHora * (mo.rendimiento || 0);
      return acc + mo.costo;
    }, 0);

    this.subtotalMateriales = this.materialesList.reduce((acc, m) => {
      m.costo = (m.cantidad || 0) * (m.unitario || 0);
      return acc + m.costo;
    }, 0);

    this.subtotalTransporte = this.transporteList.reduce((acc, t) => {
      t.costo = (t.cantidad || 0) * (t.unitario || 0);
      return acc + t.costo;
    }, 0);

    this.totalDirecto = this.subtotalEquipos + this.subtotalManoObra + this.subtotalMateriales + this.subtotalTransporte;
  }

  limpiarCalculos(): void {
    this.subcategoriaId = null;
    this.rubroCodigo = '';
    this.rubroDescripcion = '';
    this.equiposList = [];
    this.manoObraList = [];
    this.materialesList = [];
    this.transporteList = [];
    this.subtotalEquipos = 0;
    this.subtotalManoObra = 0;
    this.subtotalMateriales = 0;
    this.subtotalTransporte = 0;
    this.totalDirecto = 0;
  }

  guardarCalculo(): void {
    if (!this.subcategoriaId) {
      this.mostrarError('Debe seleccionar una subcategoría.');
      return;
    }

    if (!this.rubroCodigo || !this.rubroDescripcion) {
      this.mostrarError('Debe ingresar el código y la descripción del rubro antes de guardar.');
      return;
    }

    const payload: ApuGuardado = {
      subcategoriaId: Number(this.subcategoriaId),
      rubroCodigo: this.rubroCodigo,
      rubroDescripcion: this.rubroDescripcion,
      categoria: this.categoriaActual,
      equipos: this.equiposList,
      manoObra: this.manoObraList,
      materiales: this.materialesList,
      transporte: this.transporteList,
      subtotalEquipos: this.subtotalEquipos,
      subtotalManoObra: this.subtotalManoObra,
      subtotalMateriales: this.subtotalMateriales,
      subtotalTransporte: this.subtotalTransporte,
      totalDirecto: this.totalDirecto,
      fecha: new Date().toISOString()
    };

    this.apuService.guardar(payload).subscribe({
      next: () => {
        this.mensajeExito = 'Cálculo APU y Rubro guardados exitosamente en la base de datos.';
        this.limpiarCalculos();
        this.irAlInicio();
        setTimeout(() => this.mensajeExito = '', 3500);
      },
      error: () => this.mostrarError('Ocurrió un error al intentar guardar en la base de datos.')
    });
  }
}