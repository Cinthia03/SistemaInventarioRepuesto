import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { EquiposService, equipos } from '../../core/services/equipos.service';
import { ManoDeObraService, ManoObra } from '../../core/services/mano-de-obra.service';
import { MaterialeService, materiales } from '../../core/services/materiales.service';
import {
  ApuService,
  Subcategoria,
  ApuGuardado,
  SistemaConfig,
  SISTEMA_OBRA_GRIS,
  SISTEMA_HIDRAULICO,
  SISTEMA_ELECTRICO,
  SISTEMA_ACABADOS
} from '../../core/services/apu.service';

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
  busqueda?: string;
  mostrarOpciones?: boolean;
  opcionesFiltradas?: any[];
  estiloLista?: { [propiedad: string]: string };
  inputRef?: HTMLInputElement;
  /** Cantidad actualmente descontada del stock del catálogo para esta fila. */
  cantidadReservada?: number;
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
  busqueda?: string;
  mostrarOpciones?: boolean;
  opcionesFiltradas?: any[];
  estiloLista?: { [propiedad: string]: string };
  inputRef?: HTMLInputElement;
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
  busqueda?: string;
  mostrarOpciones?: boolean;
  opcionesFiltradas?: any[];
  estiloLista?: { [propiedad: string]: string };
  inputRef?: HTMLInputElement;
  /** Cantidad actualmente descontada del stock del catálogo para esta fila. */
  cantidadReservada?: number;
}

/**
 * Mapa: segmento de ruta (":categoria") -> configuración de tablas del sistema.
 * Único lugar a tocar si en el futuro agregas un sistema nuevo.
 */
const SISTEMAS_POR_RUTA: Record<string, SistemaConfig> = {
  'obra-gris': SISTEMA_OBRA_GRIS,
  'sistema-hidraulico-sanitario': SISTEMA_HIDRAULICO,
  'sistema-instalaciones-electricas': SISTEMA_ELECTRICO,
  'obra-de-acabados': SISTEMA_ACABADOS
};

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

  /** Configuración de tablas (rubros / apu_detalles) resuelta para la categoría actual de la ruta */
  sistemaActual: SistemaConfig = SISTEMA_OBRA_GRIS;

  /** Modo edición: viene de ?rubroId=... en la URL (botón "Editar" de la pantalla "Ver Rubros") */
  modoEdicion: boolean = false;
  rubroIdEdicion: number | null = null;
  cargandoRubroEdicion: boolean = false;

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
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  get catalogoTransportes(): equipos[] {
    return this.catalogoEquipos.filter(
      equipo => equipo.descripcion?.toLowerCase().includes('transporte')
    );
  }

  ngOnInit(): void {
    this.categoriaActual = this.route.snapshot.paramMap.get('categoria') || this.extraerCategoriaDeRuta();
    this.categoriaTitulo = this.formatearTitulo(this.categoriaActual);

    // Resuelve a qué tablas (rubros/apu_detalles) apuntar según la categoría de la ruta.
    this.sistemaActual = SISTEMAS_POR_RUTA[this.categoriaActual] || SISTEMA_OBRA_GRIS;

    // ¿Venimos del botón "Editar" de la pantalla "Ver Rubros"? (/calculo-apu-component/<categoria>?rubroId=123)
    const rubroIdParam = this.route.snapshot.queryParamMap.get('rubroId');
    this.rubroIdEdicion = rubroIdParam ? Number(rubroIdParam) : null;
    this.modoEdicion = this.rubroIdEdicion !== null && !isNaN(this.rubroIdEdicion);

    this.cargarSubcategorias();
    this.cargarCatalogoEquipos();
    this.cargarCatalogoManoObra();
    this.cargarCatalogoMateriales();

    if (this.modoEdicion && this.rubroIdEdicion) {
      this.cargarRubroParaEditar(this.rubroIdEdicion);
    }
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

  /* ==================== MODO EDICIÓN ==================== */
  cargarRubroParaEditar(id: number): void {
    this.cargandoRubroEdicion = true;
    this.apuService.obtenerRubroParaEditar(id, this.sistemaActual).subscribe({
      next: ({ rubro, detalles }) => {
        this.subcategoriaId = rubro.subcategoria_id ?? null;
        this.rubroCodigo = rubro.codigo || '';
        this.rubroDescripcion = rubro.descripcion || '';

        this.equiposList = detalles
          .filter(d => d.tipo_insumo === 'EQUIPO')
          .map(d => this.detalleAEquipo(d));

        this.manoObraList = detalles
          .filter(d => d.tipo_insumo === 'MANO_OBRA')
          .map(d => this.detalleAManoObra(d));

        this.materialesList = detalles
          .filter(d => d.tipo_insumo === 'MATERIAL')
          .map(d => this.detalleAMaterial(d));

        this.transporteList = detalles
          .filter(d => d.tipo_insumo === 'TRANSPORTE')
          .map(d => this.detalleAMaterial(d));

        this.calcularTodo();
        this.cargandoRubroEdicion = false;
        this.cdr.detectChanges(); // fuerza el repintado: los datos de Supabase llegan fuera de la zona de Angular
      },
      error: () => {
        this.cargandoRubroEdicion = false;
        this.mostrarError('No se pudo cargar el rubro seleccionado para editar.');
        this.cdr.detectChanges();
      }
    });
  }

  private detalleAEquipo(d: any): EquipoCalculo {
    const cantidad = Number(d.cantidad) || 0;
    return {
      id: d.insumo_id,
      descripcion: d.descripcion || '',
      unidad: d.unidad || '',
      stock: 0, // se refresca solo si el usuario vuelve a elegir el insumo en el combo
      cantidad,
      tarifa: Number(d.costo_unitario) || 0,
      rendimiento: Number(d.rendimiento) || 0,
      costoHora: cantidad * (Number(d.costo_unitario) || 0),
      costo: Number(d.subtotal) || 0,
      busqueda: d.descripcion || '',
      // esta cantidad ya fue descontada del stock cuando se guardó el rubro por primera vez
      cantidadReservada: cantidad
    };
  }

  private detalleAManoObra(d: any): ManoObraCalculo {
    return {
      id: d.insumo_id,
      descripcion: d.descripcion || '',
      unidad: d.unidad || '',
      cantidad: Number(d.cantidad) || 0,
      tarifa: Number(d.costo_unitario) || 0,
      rendimiento: Number(d.rendimiento) || 0,
      costoHora: (Number(d.cantidad) || 0) * (Number(d.costo_unitario) || 0),
      costo: Number(d.subtotal) || 0,
      busqueda: d.descripcion || ''
    };
  }

  private detalleAMaterial(d: any): MaterialesCalculo {
    const cantidad = Number(d.cantidad) || 0;
    return {
      id: d.insumo_id,
      descripcion: d.descripcion || '',
      unidad: d.unidad || '',
      stock: 0,
      cantidad,
      unitario: Number(d.costo_unitario) || 0,
      costo: Number(d.subtotal) || 0,
      busqueda: d.descripcion || '',
      // esta cantidad ya fue descontada del stock cuando se guardó el rubro por primera vez
      cantidadReservada: cantidad
    };
  }

  /* ==================== CARGA DINÁMICA DE SUBCATEGORÍAS ==================== */
  cargarSubcategorias(): void {
    this.cargandoSubcategorias = true;
    this.apuService.getSubcategoriasPorCategoria(this.sistemaActual.categoriaNombre).subscribe({
      next: (subcategorias) => {
        this.subcategoriasList = subcategorias;
        this.cargandoSubcategorias = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoSubcategorias = false;
        this.mostrarError('Error al cargar las subcategorías desde la base de datos.');
        this.cdr.detectChanges();
      }
    });
  }

  generarSiguienteCodigoRubro(): void {
    // En modo edición no se autogenera un código nuevo: se respeta el código ya cargado.
    if (this.modoEdicion) {
      return;
    }

    if (!this.subcategoriaId) {
      this.rubroCodigo = '';
      return;
    }

    const sub = this.subcategoriasList.find(s => s.id === Number(this.subcategoriaId));

    this.apuService.getUltimoCodigo(Number(this.subcategoriaId), this.sistemaActual.tablaRubros).subscribe({
      next: (ultimoSecuencial: number) => {
        const siguienteNum = (ultimoSecuencial + 1).toString().padStart(2, '0');
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
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoEquipos = false; this.cdr.detectChanges(); }
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
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoManoObra = false; this.cdr.detectChanges(); }
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
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoMateriales = false; this.cdr.detectChanges(); }
    });
  }

  /* ==================== AGREGAR / ELIMINAR FILAS ==================== */
  agregarEquipo(): void {
    this.equiposList.push({ descripcion: '', stock: 0, cantidad: 1, tarifa: 0, rendimiento: 0, costoHora: 0, costo: 0.00, busqueda: '', mostrarOpciones: false, opcionesFiltradas: [] });
  }

  agregarManoObra(): void {
    this.manoObraList.push({ descripcion: '', cantidad: 1, tarifa: 0, rendimiento: 0, costoHora: 0, costo: 0.00, busqueda: '', mostrarOpciones: false, opcionesFiltradas: [] });
  }

  agregarMaterial(): void {
    this.materialesList.push({ descripcion: '', unidad: '', cantidad: 1, stock: 0, unitario: 0, costo: 0.00, busqueda: '', mostrarOpciones: false, opcionesFiltradas: [] });
  }

  agregarTransporte(): void {
    this.transporteList.push({ descripcion: '', unidad: '', cantidad: 1, stock: 0, unitario: 0, costo: 0.00, busqueda: '', mostrarOpciones: false, opcionesFiltradas: [] });
  }

  eliminarEquipo(index: number): void {
    const item = this.equiposList[index];
    this.devolverStockEquipo(item.id, item.cantidadReservada);
    this.equiposList.splice(index, 1);
    this.calcularTodo();
  }

  eliminarManoObra(index: number): void { this.manoObraList.splice(index, 1); this.calcularTodo(); }

  eliminarMaterial(index: number): void {
    const item = this.materialesList[index];
    this.devolverStockMaterial(item.id, item.cantidadReservada);
    this.materialesList.splice(index, 1);
    this.calcularTodo();
  }

  eliminarTransporte(index: number): void {
    const item = this.transporteList[index];
    this.devolverStockEquipo(item.id, item.cantidadReservada);
    this.transporteList.splice(index, 1);
    this.calcularTodo();
  }

  /* ==================== DESCUENTO DE STOCK EN BASE DE DATOS ====================
     Al elegir un insumo se reserva (descuenta) su cantidad del stock real en Supabase;
     si luego cambia la cantidad, se elimina la fila o se cancela el cálculo, la reserva
     se ajusta o se devuelve. Al guardar el cálculo, la reserva queda como consumo definitivo. */
  private devolverStockEquipo(id: number | undefined, cantidad: number | undefined): void {
    if (!id || !cantidad) return;
    const eq = this.catalogoEquipos.find(e => e.id === id);
    if (!eq) return;
    eq.stock = (eq.stock || 0) + cantidad;
    this.equiposService.actualizarStock(id, eq.stock).subscribe();
  }

  private devolverStockMaterial(id: number | undefined, cantidad: number | undefined): void {
    if (!id || !cantidad) return;
    const mat = this.catalogoMateriales.find(m => m.id === id);
    if (!mat) return;
    mat.stock = (mat.stock || 0) + cantidad;
    this.materialesService.actualizarStock(id, mat.stock).subscribe();
  }

  /* ==================== AUTOCOMPLETADO (equipo / mano de obra / materiales / transporte) ==================== */
  private filtrarCatalogo<T extends { descripcion: string }>(texto: string, catalogo: T[]): T[] {
    const t = (texto || '').toLowerCase().trim();
    if (!t) return catalogo;
    return catalogo.filter(o => (o.descripcion || '').toLowerCase().includes(t));
  }

  /** Cierra la lista de sugerencias con un pequeño retraso para permitir que el (mousedown) de la opción se dispare antes que el blur. */
  cerrarOpciones(item: { mostrarOpciones?: boolean }): void {
    setTimeout(() => { item.mostrarOpciones = false; }, 150);
  }

  /**
   * Calcula la posición (fixed, relativa al viewport) de la lista de sugerencias, anclada
   * justo encima del input. Al ser "fixed" no queda recortada por el overflow:hidden de las
   * tarjetas (.card), que de otro modo cortaban la lista contra el borde de la sección.
   */
  private posicionarListaSobre(inputEl: HTMLInputElement): { [propiedad: string]: string } {
    const rect = inputEl.getBoundingClientRect();
    return {
      position: 'fixed',
      left: rect.left + 'px',
      width: rect.width + 'px',
      bottom: (window.innerHeight - rect.top + 4) + 'px'
    };
  }

  /**
   * Al ser "fixed", la lista no se desplaza junto con la página al hacer scroll (se queda
   * clavada al viewport). Este listener recalcula su posición en cada scroll/resize para que
   * se mantenga siempre pegada al input que la abrió, como si fuera parte del flujo normal.
   */
  @HostListener('window:scroll')
  @HostListener('window:resize')
  reposicionarListasAbiertas(): void {
    const todas: Array<EquipoCalculo | ManoObraCalculo | MaterialesCalculo> = [
      ...this.equiposList,
      ...this.manoObraList,
      ...this.materialesList,
      ...this.transporteList
    ];
    for (const item of todas) {
      if (item.mostrarOpciones && item.inputRef) {
        item.estiloLista = this.posicionarListaSobre(item.inputRef);
      }
    }
  }

  buscarEquipo(item: EquipoCalculo, inputEl: HTMLInputElement): void {
    item.opcionesFiltradas = this.filtrarCatalogo(item.busqueda || '', this.catalogoEquipos);
    item.mostrarOpciones = true;
    item.inputRef = inputEl;
    item.estiloLista = this.posicionarListaSobre(inputEl);
  }

  elegirEquipo(item: EquipoCalculo, eq: equipos): void {
    if ((eq.stock || 0) <= 0) return;
    // libera la reserva de la selección anterior de esta fila (si había) antes de tomar la nueva
    this.devolverStockEquipo(item.id, item.cantidadReservada);
    Object.assign(item, {
      id: eq.id,
      codigo: eq.codigo,
      descripcion: eq.descripcion,
      unidad: eq.unidad,
      tarifa: eq.precio,
      stock: eq.stock,
      busqueda: eq.descripcion,
      mostrarOpciones: false,
      cantidadReservada: 0
    });
    this.validarStock(item);
  }

  buscarManoObra(item: ManoObraCalculo, inputEl: HTMLInputElement): void {
    item.opcionesFiltradas = this.filtrarCatalogo(item.busqueda || '', this.catalogManoObra);
    item.mostrarOpciones = true;
    item.inputRef = inputEl;
    item.estiloLista = this.posicionarListaSobre(inputEl);
  }

  elegirManoObra(item: ManoObraCalculo, mo: ManoObra): void {
    Object.assign(item, {
      id: mo.id,
      codigo: mo.codigo,
      descripcion: mo.descripcion,
      unidad: mo.unidad,
      tarifa: mo.precio,
      busqueda: mo.descripcion,
      mostrarOpciones: false
    });
    this.calcularTodo();
  }

  buscarMaterial(item: MaterialesCalculo, inputEl: HTMLInputElement): void {
    item.opcionesFiltradas = this.filtrarCatalogo(item.busqueda || '', this.catalogoMateriales);
    item.mostrarOpciones = true;
    item.inputRef = inputEl;
    item.estiloLista = this.posicionarListaSobre(inputEl);
  }

  elegirMaterial(item: MaterialesCalculo, mat: materiales): void {
    if ((mat.stock || 0) <= 0) return;
    // libera la reserva de la selección anterior de esta fila (si había) antes de tomar la nueva
    this.devolverStockMaterial(item.id, item.cantidadReservada);
    Object.assign(item, {
      id: mat.id,
      codigo: mat.codigo,
      descripcion: mat.descripcion,
      unidad: mat.unidad,
      unitario: mat.precio,
      stock: mat.stock,
      busqueda: mat.descripcion,
      mostrarOpciones: false,
      cantidadReservada: 0
    });
    this.validarStockMat(item);
  }

  buscarTransporte(item: MaterialesCalculo, inputEl: HTMLInputElement): void {
    item.opcionesFiltradas = this.filtrarCatalogo(item.busqueda || '', this.catalogoTransportes);
    item.mostrarOpciones = true;
    item.inputRef = inputEl;
    item.estiloLista = this.posicionarListaSobre(inputEl);
  }

  elegirTransporte(item: MaterialesCalculo, tr: equipos): void {
    if ((tr.stock || 0) <= 0) return;
    // el transporte se descuenta del catálogo de equipos, no del de materiales
    this.devolverStockEquipo(item.id, item.cantidadReservada);
    Object.assign(item, {
      id: tr.id,
      codigo: tr.codigo,
      descripcion: tr.descripcion,
      unidad: tr.unidad,
      unitario: tr.precio,
      stock: tr.stock,
      busqueda: tr.descripcion,
      mostrarOpciones: false,
      cantidadReservada: 0
    });
    this.validarStockTransporte(item);
  }

  /* ==================== VALIDACIONES Y CÁLCULOS APU ==================== */
  /**
   * Valida que la cantidad no supere el stock disponible y descuenta/devuelve en Supabase
   * solo la diferencia (delta) respecto a lo ya reservado por esta fila, para que el stock
   * del catálogo quede siempre reflejando lo realmente consumido.
   */
  validarStock(item: EquipoCalculo): void {
    const reservadaPrevia = item.cantidadReservada || 0;
    const eq = this.catalogoEquipos.find(e => e.id === item.id);
    const disponibleTotal = (eq ? eq.stock : (item.stock || 0)) + reservadaPrevia;

    if ((item.cantidad || 0) > disponibleTotal) {
      this.mostrarError(`Stock insuficiente para ${item.descripcion}. Máximo disponible: (${disponibleTotal})`);
      item.cantidad = disponibleTotal;
    }

    if (item.id && eq) {
      const nuevaCantidad = item.cantidad || 0;
      const delta = nuevaCantidad - reservadaPrevia;
      if (delta !== 0) {
        eq.stock = Math.max(0, (eq.stock || 0) - delta);
        this.equiposService.actualizarStock(eq.id!, eq.stock).subscribe();
        item.stock = eq.stock;
      }
      item.cantidadReservada = nuevaCantidad;
    }

    this.calcularTodo();
  }

  validarStockMat(item: MaterialesCalculo): void {
    const reservadaPrevia = item.cantidadReservada || 0;
    const mat = this.catalogoMateriales.find(m => m.id === item.id);
    const disponibleTotal = (mat ? mat.stock : (item.stock || 0)) + reservadaPrevia;

    if ((item.cantidad || 0) > disponibleTotal) {
      this.mostrarError(`Stock insuficiente para ${item.descripcion}. Máximo disponible: (${disponibleTotal})`);
      item.cantidad = disponibleTotal;
    }

    if (item.id && mat) {
      const nuevaCantidad = item.cantidad || 0;
      const delta = nuevaCantidad - reservadaPrevia;
      if (delta !== 0) {
        mat.stock = Math.max(0, (mat.stock || 0) - delta);
        this.materialesService.actualizarStock(mat.id!, mat.stock).subscribe();
        item.stock = mat.stock;
      }
      item.cantidadReservada = nuevaCantidad;
    }

    this.calcularTodo();
  }

  /** Igual que validarStockMat, pero para transporte: el catálogo es el de equipos, no el de materiales. */
  validarStockTransporte(item: MaterialesCalculo): void {
    const reservadaPrevia = item.cantidadReservada || 0;
    const eq = this.catalogoEquipos.find(e => e.id === item.id);
    const disponibleTotal = (eq ? eq.stock : (item.stock || 0)) + reservadaPrevia;

    if ((item.cantidad || 0) > disponibleTotal) {
      this.mostrarError(`Stock insuficiente para ${item.descripcion}. Máximo disponible: (${disponibleTotal})`);
      item.cantidad = disponibleTotal;
    }

    if (item.id && eq) {
      const nuevaCantidad = item.cantidad || 0;
      const delta = nuevaCantidad - reservadaPrevia;
      if (delta !== 0) {
        eq.stock = Math.max(0, (eq.stock || 0) - delta);
        this.equiposService.actualizarStock(eq.id!, eq.stock).subscribe();
        item.stock = eq.stock;
      }
      item.cantidadReservada = nuevaCantidad;
    }

    this.calcularTodo();
  }

  private mostrarError(msj: string): void {
    this.mensajeError = msj;
    this.irAlInicio();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.mensajeError = '';
      this.cdr.detectChanges();
    }, 3500);
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

  /** Botón "Limpiar Cálculo": al cancelar el borrador se devuelve al stock todo lo reservado. */
  limpiarCalculos(): void {
    this.equiposList.forEach(item => this.devolverStockEquipo(item.id, item.cantidadReservada));
    this.materialesList.forEach(item => this.devolverStockMaterial(item.id, item.cantidadReservada));
    this.transporteList.forEach(item => this.devolverStockEquipo(item.id, item.cantidadReservada));
    this.limpiarFormulario();
  }

  /** Resetea el formulario sin tocar el stock (la reserva ya quedó guardada como consumo definitivo). */
  private limpiarFormulario(): void {
    this.modoEdicion = false;
    this.rubroIdEdicion = null;
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

    // En modo edición se ACTUALIZA el rubro existente; si no, se crea uno nuevo.
    const operacion = (this.modoEdicion && this.rubroIdEdicion)
      ? this.apuService.actualizar(this.rubroIdEdicion, payload, this.sistemaActual)
      : this.apuService.guardar(payload, this.sistemaActual);

    const esEdicion = this.modoEdicion;

    operacion.subscribe({
      next: () => {
        this.mensajeExito = esEdicion
          ? 'Cálculo APU actualizado exitosamente en la base de datos.'
          : 'Cálculo APU y Rubro guardados exitosamente en la base de datos.';

        // Siempre se limpia el formulario después de guardar, sea creación o edición.
        // Se usa limpiarFormulario() (no limpiarCalculos()) para no devolver el stock recién consumido.
        this.limpiarFormulario();

        this.irAlInicio();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.detectChanges();
        }, 3500);
      },
      error: () => this.mostrarError('Ocurrió un error al intentar guardar en la base de datos.')
    });
  }
}
