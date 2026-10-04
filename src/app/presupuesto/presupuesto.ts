import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, forkJoin, of, timeout } from 'rxjs';
import { Router } from '@angular/router';

import { Rubro, RubrosObraGrisService } from '../core/services/rubros-obra-gris.service';
import { RubrosObraAcabadosService } from '../core/services/rubros-obra-acabados.service';
import { RubrosHidraulicoService } from '../core/services/rubros-hidraulico.service';
import { RubrosInstalacionesElectricasService } from '../core/services/rubros-instalaciones-electricas.service';
import { PresupuestosService } from '../core/services/presupuestos.service';
import { ErrorPresupuesto } from '../core/services/presupuestos.service';
import type {
  ConsumoMaterial,
  MaterialStock,
  PresupuestoItemGuardado,
  PresupuestoResumen,
  PresupuestoDetalle,
} from '../core/services/presupuestos.service';
import { CATALOGO_RUBROS } from './catalogo-rubros';
import {
  EncabezadoPresupuesto,
  LineaPresupuesto,
  PresupuestoFormato,
  compararCodigos,
  construirFormato,
  descargarExcelPresupuesto,
  fechaFormato,
  imprimirHojaFormato,
  redondear2,
} from './formato-presupuesto';

/**
 * Un rubro dentro del presupuesto.
 * - Viene del catálogo del formato Excel, de Supabase (con su APU) o lo crea el usuario
 *   en el momento (personalizado).
 * - seleccionado: si entra o no en ESTE presupuesto.
 */
export interface ItemPresupuesto {
  key: string;
  rubroId: number | null;
  codigo: string;
  descripcion: string;
  unidad: string;
  precioUnitario: number;
  tieneApu: boolean;        // P.U. calculado con APU (no editable aquí; se edita en "Calcular APU")
  cantidad: number;
  total: number;
  seleccionado: boolean;
  personalizado: boolean;
  desplegado: boolean;
  apu: Rubro | null;
}

interface GrupoSubcategoria {
  codigo: string;           // '1.1' ('' cuando la categoría no maneja subcategorías, p.ej. Eléctrico)
  nombre: string;
  items: ItemPresupuesto[];
  personalizado?: boolean;  // subcategoría creada por el usuario en este presupuesto
}

type ClaseColor = 'obraGris' | 'acabados' | 'hidraulico' | 'electrico' | 'personalizado';

interface DefinicionCategoria {
  clave: string;            // coincide con la ruta de "Calcular APU" (app.routes.ts)
  nombre: string;           // nombre corto para la pantalla
  nombreFormato: string;    // nombre tal como sale en el formato Excel
  codigo: string;           // '1.0', '2.0'...
  icono: string;
  claseColor: ClaseColor;
  claseBadge: string;
}

interface GrupoCategoria extends DefinicionCategoria {
  grupos: GrupoSubcategoria[];
  subtotal: number;
  expandido: boolean;
}

type VistaPresupuesto = 'nuevo' | 'formato' | 'historial';

const CLAVE_PERSONALIZADOS = 'personalizados';
const NUEVA_SUBCATEGORIA = '__nueva__';

const normalizar = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const hoyISO = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

@Component({
  selector: 'app-presupuesto',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './presupuesto.html',
  styleUrls: ['../calculo/rubros.css', './presupuesto.css'],
})
export class Presupuesto implements OnInit {

  vista: VistaPresupuesto = 'nuevo';

  // ---- Armado de un presupuesto nuevo ----
  cargando = false;
  fuentesConError: string[] = [];
  categoriaSeleccionada = '';
  textoBusqueda = '';
  soloSeleccionados = false;
  gruposPorCategoria: GrupoCategoria[] = [];

  encabezado: EncabezadoPresupuesto = this.encabezadoVacio();

  costoDirecto = 0;
  costoIndirecto = 0;
  totalGeneral = 0;

  guardando = false;
  mensajeGuardado = '';
  /** id del presupuesto que se está editando (null = presupuesto nuevo sin guardar). */
  presupuestoEditandoId: number | null = null;
  /** true cuando hay cambios que todavía no se guardaron. */
  hayCambios = false;
  /** Aviso verde que se muestra al volver al inicio después de guardar. */
  mensajeExito = '';

  // ---- Stock de materiales (inventario) ----
  /** material_id -> stock actual en inventario */
  private stockMateriales = new Map<number, MaterialStock>();
  /** lo que el presupuesto en edición ya descontó (vuelve al inventario al actualizar) */
  private consumoPrevio = new Map<number, number>();
  /** materiales que no alcanzan con las cantidades actuales */
  faltantesStock: { material: MaterialStock; requerido: number; disponible: number }[] = [];
  private itemsSinStock = new Map<string, string>();   // key del rubro -> detalle

  // ---- Rubro personalizado ----
  mostrarFormPersonalizado = false;
  mensajePersonalizado = '';
  nuevoRubro = this.nuevoRubroVacio();

  // ---- Formato generado (nuevo o guardado) ----
  formato: PresupuestoFormato | null = null;
  origenFormato: 'nuevo' | 'guardado' = 'nuevo';
  presupuestoVistoId: number | null = null;   // presupuesto guardado que se está viendo
  cargandoDetalle = false;

  // ---- Historial de presupuestos guardados ----
  cargandoHistorial = false;
  errorHistorial = '';
  presupuestosGuardados: PresupuestoResumen[] = [];

  readonly categoriasDefinidas: DefinicionCategoria[] = [
    { clave: 'obra-gris', nombre: 'Obra Gris', nombreFormato: 'OBRA GRIS', codigo: '1.0', icono: 'foundation', claseColor: 'obraGris', claseBadge: 'header-interno__badge' },
    { clave: 'obra-de-acabados', nombre: 'Acabados', nombreFormato: 'OBRAS DE ACABADOS', codigo: '2.0', icono: 'format_paint', claseColor: 'acabados', claseBadge: 'header-interno__badge_acabados' },
    { clave: 'sistema-hidraulico-sanitario', nombre: 'Hidráulico', nombreFormato: 'SISTEMA HIDRÁULICO SANITARIO', codigo: '3.0', icono: 'water_drop', claseColor: 'hidraulico', claseBadge: 'header-interno__badge_hidraulico' },
    { clave: 'sistema-instalaciones-electricas', nombre: 'Eléctrico', nombreFormato: 'SISTEMA INSTALACIONES ELECTRICAS', codigo: '4.0', icono: 'bolt', claseColor: 'electrico', claseBadge: 'header-interno__badge_electrico' },
    { clave: CLAVE_PERSONALIZADOS, nombre: 'Personalizados', nombreFormato: 'RUBROS PERSONALIZADOS', codigo: '5.0', icono: 'edit_note', claseColor: 'personalizado', claseBadge: 'header-interno__badge' },
  ];

  readonly NUEVA_SUBCATEGORIA = NUEVA_SUBCATEGORIA;
  readonly unidadesSugeridas = ['u', 'U', 'm', 'ml', 'm2', 'm3', 'kg', 'Global', 'semana', 'viajes', 'punto'];

  private readonly rubrosObraGrisService = inject(RubrosObraGrisService);
  private readonly rubrosAcabadosService = inject(RubrosObraAcabadosService);
  private readonly rubrosHidraulicoService = inject(RubrosHidraulicoService);
  private readonly rubrosElectricoService = inject(RubrosInstalacionesElectricasService);
  private readonly presupuestosService = inject(PresupuestosService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.cargarPresupuesto();
  }

  // ============================================================
  // NAVEGACIÓN ENTRE VISTAS
  // ============================================================

  mostrarNuevo(): void {
    this.vista = 'nuevo';
    this.formato = null;
  }

  mostrarHistorial(): void {
    this.vista = 'historial';
    this.formato = null;
    this.cargarHistorial();
  }

  volverDesdeFormato(): void {
    if (this.origenFormato === 'guardado') {
      this.mostrarHistorial();
    } else {
      this.vista = 'nuevo';
      this.formato = null;
    }
  }

  // ============================================================
  // CARGA DE RUBROS: catálogo del formato Excel + rubros de Supabase
  // ============================================================

  cargarPresupuesto(alTerminar?: () => void): void {
    this.cargando = true;
    this.fuentesConError = [];

    // Si una categoría falla (p.ej. no existe en "categorias"), las demás igual se cargan.
    const seguro = (fuente: Observable<Rubro[]>, nombre: string) =>
      fuente.pipe(catchError(err => {
        console.error(`Error al cargar rubros de ${nombre}:`, err);
        this.fuentesConError.push(nombre);
        return of([] as Rubro[]);
      }));

    forkJoin({
      obraGris: seguro(this.rubrosObraGrisService.getRubrosObraGris(), 'Obra Gris'),
      acabados: seguro(this.rubrosAcabadosService.getRubrosAcabados(), 'Acabados'),
      hidraulico: seguro(this.rubrosHidraulicoService.getRubrosHidraulico(), 'Hidráulico'),
      electrico: seguro(this.rubrosElectricoService.getRubrosElectrico(), 'Eléctrico'),
      stock: this.presupuestosService.listarStockMateriales().pipe(catchError(err => {
        console.error('No se pudo leer el stock de materiales:', err);
        return of([] as MaterialStock[]);
      })),
    }).subscribe({
      next: ({ obraGris, acabados, hidraulico, electrico, stock }) => {
        this.stockMateriales = new Map(stock.map((m: MaterialStock) => [m.id, m] as [number, MaterialStock]));
        const fuentesPorClave: Record<string, Rubro[]> = {
          'obra-gris': obraGris,
          'obra-de-acabados': acabados,
          'sistema-hidraulico-sanitario': hidraulico,
          'sistema-instalaciones-electricas': electrico,
        };

        this.gruposPorCategoria = this.categoriasDefinidas.map(def => ({
          ...def,
          grupos: this.fusionarRubros(def, fuentesPorClave[def.clave] || []),
          expandido: def.clave !== CLAVE_PERSONALIZADOS,
          subtotal: 0,
        }));

        this.recalcularTodo();
        this.hayCambios = false;
        alTerminar?.();
        this.cargando = false;
        this.cdr.detectChanges(); // los datos de Supabase llegan fuera de la zona de Angular
      },
      error: (err: any) => {
        console.error('Error al cargar el presupuesto general:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Une los rubros del formato Excel (orden y numeración oficial) con los rubros guardados
   * en Supabase (P.U. del APU). Coincidencia por código y, si no, por descripción.
   * Los rubros de la BD que no están en el formato se agregan a su subcategoría.
   */
  private fusionarRubros(def: DefinicionCategoria, rubrosBD: Rubro[]): GrupoSubcategoria[] {
    const catalogo = CATALOGO_RUBROS.find(c => c.clave === def.clave);
    const grupos: GrupoSubcategoria[] = (catalogo?.subcategorias || []).map(sub => ({
      codigo: sub.codigo,
      nombre: sub.nombre,
      items: sub.rubros.map(r => this.crearItem({
        key: `${def.clave}:${r.codigo}`,
        codigo: r.codigo,
        descripcion: r.descripcion,
        unidad: r.unidad,
      })),
    }));

    const todos = () => grupos.flatMap(g => g.items);
    const prefijoCategoria = def.codigo.split('.')[0];

    for (const r of rubrosBD) {
      const codigo = (r.codigo || '').trim();
      const libre = (i: ItemPresupuesto) => i.rubroId === null;
      const existente =
        todos().find(i => libre(i) && i.codigo === codigo) ||
        todos().find(i => libre(i) && normalizar(i.descripcion) === normalizar(r.descripcion));

      if (existente) {
        this.asignarRubroBD(existente, r);
        continue;
      }

      // Rubro creado en el sistema que no está en el formato: va a su subcategoría
      const partes = codigo.split('.');
      const prefijoSub = partes.length >= 3 ? `${partes[0]}.${partes[1]}` : '';
      let grupo =
        grupos.find(g => normalizar(g.nombre) === normalizar(r.subcategoria_nombre)) ||
        (prefijoSub ? grupos.find(g => g.codigo === prefijoSub) : undefined);

      if (!grupo) {
        grupo = {
          codigo: prefijoSub.startsWith(prefijoCategoria + '.') ? prefijoSub : '',
          nombre: (r.subcategoria_nombre || def.nombreFormato).toUpperCase(),
          items: [],
        };
        grupos.push(grupo);
      }
      const nuevo = this.crearItem({
        key: `${def.clave}:bd:${r.id}`,
        codigo,
        descripcion: r.descripcion,
        unidad: r.unidad_medida,
      });
      this.asignarRubroBD(nuevo, r);
      grupo.items.push(nuevo);
    }

    grupos.sort((a, b) => compararCodigos(a.codigo, b.codigo));
    grupos.forEach(g => g.items.sort((a, b) => compararCodigos(a.codigo, b.codigo)));
    return grupos;
  }

  private crearItem(datos: Partial<ItemPresupuesto> & { key: string; codigo: string; descripcion: string; unidad: string }): ItemPresupuesto {
    return {
      rubroId: null,
      precioUnitario: 0,
      tieneApu: false,
      cantidad: 0,
      total: 0,
      seleccionado: false,
      personalizado: false,
      desplegado: false,
      apu: null,
      ...datos,
    };
  }

  private asignarRubroBD(item: ItemPresupuesto, r: Rubro): void {
    item.rubroId = r.id;
    item.apu = r;
    item.descripcion = r.descripcion || item.descripcion;
    item.unidad = r.unidad_medida || item.unidad;
    item.precioUnitario = redondear2(Number(r.costo_directo_total) || 0);
    item.tieneApu = item.precioUnitario > 0;
  }

  // ============================================================
  // FILTROS / VISTA
  // ============================================================

  get categoriasMostradas(): GrupoCategoria[] {
    return this.categoriaSeleccionada === ''
      ? this.gruposPorCategoria
      : this.gruposPorCategoria.filter(c => c.clave === this.categoriaSeleccionada);
  }

  itemsVisibles(grupo: GrupoSubcategoria): ItemPresupuesto[] {
    const texto = normalizar(this.textoBusqueda);
    return grupo.items.filter(i =>
      (!this.soloSeleccionados || i.seleccionado) &&
      (!texto || normalizar(`${i.codigo} ${i.descripcion}`).includes(texto) || normalizar(grupo.nombre).includes(texto))
    );
  }

  gruposVisibles(categoria: GrupoCategoria): GrupoSubcategoria[] {
    if (!this.textoBusqueda.trim() && !this.soloSeleccionados) return categoria.grupos;
    return categoria.grupos.filter(g => this.itemsVisibles(g).length > 0);
  }

  toggleCategoria(categoria: GrupoCategoria): void {
    categoria.expandido = !categoria.expandido;
  }

  toggleDesplegar(item: ItemPresupuesto): void {
    if (item.apu) item.desplegado = !item.desplegado;
  }

  contarSeleccionados(categoria: GrupoCategoria): number {
    return categoria.grupos.flatMap(g => g.items).filter(i => i.seleccionado).length;
  }

  contarRubros(categoria: GrupoCategoria): number {
    return categoria.grupos.reduce((s, g) => s + g.items.length, 0);
  }

  get totalSeleccionados(): number {
    return this.gruposPorCategoria.reduce((s, c) => s + this.contarSeleccionados(c), 0);
  }

  get totalRubros(): number {
    return this.gruposPorCategoria.reduce((s, c) => s + this.contarRubros(c), 0);
  }

  // ============================================================
  // EDICIÓN DE CANTIDADES / SELECCIÓN
  // ============================================================

  /** Al marcar un rubro sin cantidad se le pone 1 para que sume algo. */
  actualizarSeleccion(item: ItemPresupuesto): void {
    if (item.seleccionado && !(item.cantidad > 0)) {
      item.cantidad = 1;
    }
    this.recalcularItem(item);
  }

  /** Escribir una cantidad mayor a 0 incluye el rubro automáticamente. */
  actualizarCantidad(item: ItemPresupuesto): void {
    const cantidad = Number(item.cantidad);
    item.cantidad = isNaN(cantidad) || cantidad < 0 ? 0 : cantidad;
    if (item.cantidad > 0) item.seleccionado = true;
    this.recalcularItem(item);
  }

  /** Solo para rubros sin APU o personalizados. */
  actualizarPrecio(item: ItemPresupuesto): void {
    const pu = Number(item.precioUnitario);
    item.precioUnitario = isNaN(pu) || pu < 0 ? 0 : pu;
    this.recalcularItem(item);
  }

  seleccionarCategoria(categoria: GrupoCategoria, valor: boolean, event?: Event): void {
    event?.stopPropagation();
    categoria.grupos.forEach(g => this.itemsVisibles(g).forEach(i => {
      i.seleccionado = valor;
      if (valor && !(i.cantidad > 0)) i.cantidad = 1;
    }));
    this.recalcularTodo();
  }

  private recalcularItem(item: ItemPresupuesto): void {
    item.total = redondear2((Number(item.cantidad) || 0) * redondear2(item.precioUnitario));
    this.recalcularTodo();
  }

  private recalcularTodo(): void {
    this.gruposPorCategoria.forEach(cat => {
      cat.grupos.forEach(g => g.items.forEach(i => {
        i.total = redondear2((Number(i.cantidad) || 0) * redondear2(i.precioUnitario));
      }));
      cat.subtotal = redondear2(cat.grupos
        .flatMap(g => g.items)
        .filter(i => i.seleccionado)
        .reduce((acc, i) => acc + i.total, 0));
    });
    this.costoDirecto = redondear2(this.gruposPorCategoria.reduce((acc, c) => acc + c.subtotal, 0));
    this.costoIndirecto = redondear2(this.costoDirecto * (Number(this.encabezado.porcentajeIndirecto) || 0));
    this.totalGeneral = redondear2(this.costoDirecto + this.costoIndirecto);
    this.hayCambios = true;
    this.recalcularStock();
  }

  /** El % de indirectos se edita como 20 (%) pero se guarda como 0.20. */
  get porcentajeIndirectoUI(): number {
    return redondear2((Number(this.encabezado.porcentajeIndirecto) || 0) * 100);
  }
  set porcentajeIndirectoUI(valor: number) {
    const v = Number(valor);
    this.encabezado.porcentajeIndirecto = isNaN(v) || v < 0 ? 0 : v / 100;
    this.recalcularTodo();
  }

  editarRubro(item: ItemPresupuesto, categoria: GrupoCategoria, event?: Event): void {
    event?.stopPropagation();
    if (categoria.clave === CLAVE_PERSONALIZADOS || item.personalizado) return;
    this.router.navigate(['/calculo-apu-component', categoria.clave], {
      queryParams: item.rubroId ? { rubroId: item.rubroId } : {},
    });
  }

  // ============================================================
  // RUBROS PERSONALIZADOS (se crean en el momento, solo para este presupuesto)
  // ============================================================

  private nuevoRubroVacio() {
    return {
      categoriaClave: CLAVE_PERSONALIZADOS,
      subcategoria: NUEVA_SUBCATEGORIA,       // clave de grupo o NUEVA_SUBCATEGORIA
      nombreSubcategoria: '',
      descripcion: '',
      unidad: 'u',
      precioUnitario: 0,
      cantidad: 1,
    };
  }

  abrirFormPersonalizado(categoria?: GrupoCategoria, event?: Event): void {
    event?.stopPropagation();
    this.nuevoRubro = this.nuevoRubroVacio();
    if (categoria) {
      this.nuevoRubro.categoriaClave = categoria.clave;
      const primero = categoria.grupos[0];
      this.nuevoRubro.subcategoria = primero ? this.claveGrupo(primero) : NUEVA_SUBCATEGORIA;
    }
    this.mensajePersonalizado = '';
    this.mostrarFormPersonalizado = true;
  }

  cerrarFormPersonalizado(): void {
    this.mostrarFormPersonalizado = false;
    this.mensajePersonalizado = '';
  }

  claveGrupo(g: GrupoSubcategoria): string {
    return `${g.codigo}|${g.nombre}`;
  }

  get gruposCategoriaForm(): GrupoSubcategoria[] {
    return this.gruposPorCategoria.find(c => c.clave === this.nuevoRubro.categoriaClave)?.grupos || [];
  }

  cambiarCategoriaForm(): void {
    const primero = this.gruposCategoriaForm[0];
    this.nuevoRubro.subcategoria = primero ? this.claveGrupo(primero) : NUEVA_SUBCATEGORIA;
  }

  /** Código que tendrá el rubro personalizado (vista previa en el formulario). */
  get codigoPreview(): string {
    const categoria = this.gruposPorCategoria.find(c => c.clave === this.nuevoRubro.categoriaClave);
    if (!categoria) return '';
    const grupo = this.nuevoRubro.subcategoria === NUEVA_SUBCATEGORIA
      ? { codigo: this.siguienteCodigoSubcategoria(categoria), nombre: '', items: [] }
      : categoria.grupos.find(g => this.claveGrupo(g) === this.nuevoRubro.subcategoria);
    return grupo ? this.siguienteCodigoItem(categoria, grupo) : '';
  }

  get totalNuevoRubro(): number {
    return redondear2((Number(this.nuevoRubro.precioUnitario) || 0) * (Number(this.nuevoRubro.cantidad) || 0));
  }

  agregarRubroPersonalizado(): void {
    const f = this.nuevoRubro;
    const descripcion = (f.descripcion || '').trim();
    const unidad = (f.unidad || '').trim();
    const pu = Number(f.precioUnitario);
    const cantidad = Number(f.cantidad);

    if (!descripcion) { this.mensajePersonalizado = 'Escribe la descripción del rubro.'; return; }
    if (!unidad) { this.mensajePersonalizado = 'Indica la unidad (m2, ml, u, Global...).'; return; }
    if (isNaN(pu) || pu < 0) { this.mensajePersonalizado = 'El costo unitario no es válido.'; return; }
    if (isNaN(cantidad) || cantidad <= 0) { this.mensajePersonalizado = 'La cantidad debe ser mayor a 0.'; return; }

    const categoria = this.gruposPorCategoria.find(c => c.clave === f.categoriaClave);
    if (!categoria) return;

    let grupo: GrupoSubcategoria | undefined;
    if (f.subcategoria === NUEVA_SUBCATEGORIA) {
      const nombre = (f.nombreSubcategoria || '').trim().toUpperCase() ||
        (categoria.clave === CLAVE_PERSONALIZADOS ? 'RUBROS ADICIONALES' : '');
      if (!nombre) { this.mensajePersonalizado = 'Escribe el nombre de la nueva subcategoría.'; return; }
      grupo = categoria.grupos.find(g => normalizar(g.nombre) === normalizar(nombre));
      if (!grupo) {
        grupo = { codigo: this.siguienteCodigoSubcategoria(categoria), nombre, items: [], personalizado: true };
        categoria.grupos.push(grupo);
        categoria.grupos.sort((a, b) => compararCodigos(a.codigo, b.codigo));
      }
    } else {
      grupo = categoria.grupos.find(g => this.claveGrupo(g) === f.subcategoria);
    }
    if (!grupo) { this.mensajePersonalizado = 'Elige una subcategoría.'; return; }

    const item = this.crearItem({
      key: `p:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      codigo: this.siguienteCodigoItem(categoria, grupo),
      descripcion,
      unidad,
      precioUnitario: redondear2(pu),
      cantidad,
      seleccionado: true,
      personalizado: true,
    });
    grupo.items.push(item);
    categoria.expandido = true;
    if (this.categoriaSeleccionada && this.categoriaSeleccionada !== categoria.clave) {
      this.categoriaSeleccionada = categoria.clave;   // que el usuario vea el rubro recién creado
    }
    this.recalcularItem(item);
    this.cerrarFormPersonalizado();
  }

  eliminarPersonalizado(item: ItemPresupuesto, grupo: GrupoSubcategoria, categoria: GrupoCategoria, event?: Event): void {
    event?.stopPropagation();
    grupo.items = grupo.items.filter(i => i !== item);
    if (grupo.items.length === 0 && grupo.personalizado) {
      categoria.grupos = categoria.grupos.filter(g => g !== grupo);
    }
    this.recalcularTodo();
  }

  /** 1.0 -> siguiente 1.N libre (1.10, 1.11...). */
  private siguienteCodigoSubcategoria(categoria: GrupoCategoria): string {
    const prefijo = categoria.codigo.split('.')[0];
    const maximo = categoria.grupos
      .map(g => g.codigo.split('.'))
      .filter(p => p.length === 2 && p[0] === prefijo)
      .reduce((m, p) => Math.max(m, Number(p[1]) || 0), 0);
    return `${prefijo}.${maximo + 1}`;
  }

  /** 1.1 -> siguiente 1.1.NN libre; en categorías sin subcategorías (Eléctrico) 4.NN. */
  private siguienteCodigoItem(categoria: GrupoCategoria, grupo: GrupoSubcategoria): string {
    const base = grupo.codigo || categoria.codigo.split('.')[0];
    const usados = categoria.grupos.flatMap(g => g.items).map(i => i.codigo)
      .filter(c => c.startsWith(base + '.') && c.split('.').length === base.split('.').length + 1)
      .map(c => Number(c.split('.').pop()) || 0);
    const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
    return `${base}.${String(siguiente).padStart(2, '0')}`;
  }

  // ============================================================
  // GENERAR PRESUPUESTO EN EL FORMATO EXCEL
  // ============================================================

  private encabezadoVacio(): EncabezadoPresupuesto {
    return { proyecto: '', numeroTramite: '', fecha: hoyISO(), areaConstruccion: null, porcentajeIndirecto: 0.2 };
  }

  private lineasSeleccionadas(): LineaPresupuesto[] {
    const lineas: LineaPresupuesto[] = [];
    this.gruposPorCategoria.forEach(cat => cat.grupos.forEach(g => g.items
      .filter(i => i.seleccionado)
      .forEach(i => lineas.push({
        categoriaCodigo: cat.codigo,
        categoriaNombre: cat.nombreFormato,
        subcategoriaCodigo: g.codigo,
        subcategoriaNombre: g.nombre,
        codigo: i.codigo,
        descripcion: i.descripcion,
        unidad: i.unidad,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        personalizado: i.personalizado,
      }))));
    return lineas;
  }

  /** Rubros incluidos con P.U. en 0 (sin APU y sin precio manual). */
  get rubrosSinPrecio(): number {
    return this.gruposPorCategoria.flatMap(c => c.grupos).flatMap(g => g.items)
      .filter(i => i.seleccionado && !(i.precioUnitario > 0)).length;
  }

  generarPresupuesto(): void {
    this.mensajeGuardado = '';
    this.mensajeExito = '';
    if (!this.encabezado.proyecto.trim()) {
      this.mensajeGuardado = 'Ingresa el nombre del proyecto de construcción.';
      return;
    }
    const lineas = this.lineasSeleccionadas();
    if (lineas.length === 0) {
      this.mensajeGuardado = 'Selecciona al menos un rubro (o escribe su cantidad).';
      return;
    }
    if (this.faltantesStock.length > 0) {
      this.mensajeGuardado = 'No hay stock suficiente para las cantidades indicadas: ' + this.textoFaltantes();
      return;
    }
    this.formato = construirFormato({ ...this.encabezado, proyecto: this.encabezado.proyecto.trim() }, lineas);
    this.origenFormato = 'nuevo';
    this.vista = 'formato';
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  descargarExcel(): void {
    if (this.formato) descargarExcelPresupuesto(this.formato);
  }

  /** Imprime / guarda como PDF solo la hoja con el formato Excel (no toda la pantalla). */
  imprimir(): void {
    const hoja = document.querySelector('.hoja-formato') as HTMLElement | null;
    if (!hoja || !this.formato) return;
    imprimirHojaFormato(hoja, `PRESUPUESTO ${this.formato.encabezado.proyecto}`);
  }

  fechaFormato = fechaFormato;

  /** Para la vista: una categoría sin subcategorías (Eléctrico) no muestra fila de subcategoría. */
  mostrarFilaSubcategoria(cat: { subcategorias: { codigo: string }[] }, sub: { codigo: string }): boolean {
    return !!sub.codigo || cat.subcategorias.length > 1;
  }

  // ============================================================
  // GUARDAR PRESUPUESTO
  // ============================================================

  private itemsParaGuardar(): PresupuestoItemGuardado[] {
    const items: PresupuestoItemGuardado[] = [];
    this.gruposPorCategoria.forEach(categoria => categoria.grupos.forEach(grupo => grupo.items
      .filter(i => i.seleccionado)
      .forEach(i => items.push({
        categoria_clave: categoria.clave,
        categoria_nombre: categoria.nombreFormato,
        categoria_codigo: categoria.codigo,
        subcategoria_nombre: grupo.nombre,
        subcategoria_codigo: grupo.codigo,
        rubro_id: i.personalizado ? null : i.rubroId,
        rubro_codigo: i.codigo,
        rubro_descripcion: i.descripcion,
        unidad_medida: i.unidad,
        costo_unitario: redondear2(i.precioUnitario),
        cantidad: i.cantidad,
        total: i.total,
        es_personalizado: i.personalizado,
      }))));
    return items;
  }

  guardarPresupuesto(): void {
    this.mensajeGuardado = '';

    if (!this.encabezado.proyecto.trim()) {
      this.mensajeGuardado = 'Ingresa el nombre del proyecto de construcción.';
      return;
    }
    const items = this.itemsParaGuardar();
    if (items.length === 0) {
      this.mensajeGuardado = 'Selecciona al menos un rubro antes de guardar.';
      return;
    }
    if (this.faltantesStock.length > 0) {
      this.mensajeGuardado = 'No hay stock suficiente: ' + this.textoFaltantes();
      return;
    }
    if (this.presupuestoEditandoId && !this.hayCambios) {
      this.mensajeGuardado = 'No hay cambios por guardar.';
      return;
    }

    this.guardando = true;
    const e = this.encabezado;
    const consumo = this.consumoActual();
    const esActualizacion = !!this.presupuestoEditandoId;

    this.presupuestosService
      .guardarPresupuesto(this.presupuestoEditandoId, {
        nombre: e.proyecto.trim(),
        numero_tramite: e.numeroTramite.trim() || null,
        fecha_presupuesto: e.fecha || null,
        area_construccion: e.areaConstruccion === null || (e.areaConstruccion as any) === '' ? null : Number(e.areaConstruccion),
        porcentaje_indirecto: Number(e.porcentajeIndirecto) || 0,
        costo_directo: this.costoDirecto,
        costo_indirecto: this.costoIndirecto,
        total: this.totalGeneral,
      }, items, consumo)
      .subscribe({
        next: (id: number) => {
          this.guardando = false;
          const mensaje = esActualizacion
            ? `Presupuesto "${e.proyecto.trim()}" actualizado. El stock de materiales se ajustó en el inventario.`
            : `Presupuesto "${e.proyecto.trim()}" guardado. Los materiales se descontaron del inventario.`;
          // Vuelve al inicio del módulo con un presupuesto nuevo en blanco
          this.reiniciarTrasGuardar(mensaje);
        },
        error: (err: any) => {
          console.error('Error al guardar el presupuesto:', err);
          this.guardando = false;
          if (err instanceof ErrorPresupuesto && err.tipo === 'stock') {
            this.mensajeGuardado = 'Stock insuficiente en inventario: ' + err.message;
            this.refrescarStock();
          } else if (err instanceof ErrorPresupuesto && err.tipo === 'migracion') {
            this.mensajeGuardado = err.message;
          } else {
            this.mensajeGuardado = 'Ocurrió un error al guardar el presupuesto: ' + (err?.message || err);
          }
          this.cdr.detectChanges();
        },
      });
  }

  /** Después de guardar: vuelve al inicio del presupuesto (en blanco) mostrando el aviso. */
  private reiniciarTrasGuardar(mensaje: string): void {
    this.encabezado = this.encabezadoVacio();
    this.presupuestoEditandoId = null;
    this.consumoPrevio = new Map();
    this.formato = null;
    this.origenFormato = 'nuevo';
    this.textoBusqueda = '';
    this.soloSeleccionados = false;
    this.categoriaSeleccionada = '';
    this.vista = 'nuevo';
    this.mensajeGuardado = '';
    this.mensajeExito = mensaje;
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
    // Recarga rubros, APU y stock ya descontado
    this.cargarPresupuesto();
  }

  /** Limpia cantidades, selección y rubros personalizados para empezar otro presupuesto. */
  nuevoPresupuestoEnBlanco(): void {
    if (this.totalSeleccionados > 0 && this.hayCambios &&
        !confirm('Se perderán las cantidades y rubros personalizados que no hayas guardado. ¿Continuar?')) {
      return;
    }
    this.encabezado = this.encabezadoVacio();
    this.presupuestoEditandoId = null;
    this.consumoPrevio = new Map();
    this.mensajeGuardado = '';
    this.mensajeExito = '';
    this.formato = null;
    this.vista = 'nuevo';
    this.cargarPresupuesto();
  }

  // ============================================================
  // STOCK DE MATERIALES
  // Cada rubro consume los materiales de su APU:
  //   consumo = cantidad del material en el APU × cantidad del rubro
  // ============================================================

  /** Consumo de materiales de los rubros incluidos, agrupado por material. */
  private consumoActual(): ConsumoMaterial[] {
    const total = new Map<number, number>();
    this.gruposPorCategoria.forEach(c => c.grupos.forEach(g => g.items
      .filter(i => i.seleccionado && !i.personalizado && i.apu && i.cantidad > 0)
      .forEach(i => this.consumoDeItem(i).forEach((cant, id) => total.set(id, (total.get(id) || 0) + cant)))));
    return [...total.entries()]
      .filter(([, cant]) => cant > 0)
      .map(([material_id, cantidad]) => ({ material_id, cantidad: Math.round(cantidad * 100) / 100 }));   // máx. 2 decimales
  }

  private consumoDeItem(i: ItemPresupuesto): Map<number, number> {
    const m = new Map<number, number>();
    (i.apu?.materiales || []).forEach(d => {
      const id = Number(d.insumo_id);
      const cant = (Number(d.cantidad) || 0) * (Number(i.cantidad) || 0);
      if (id && cant > 0) m.set(id, (m.get(id) || 0) + cant);
    });
    return m;
  }

  /** Stock que se puede usar: el del inventario + lo que este presupuesto ya había descontado. */
  private disponible(materialId: number): number {
    return (this.stockMateriales.get(materialId)?.stock || 0) + (this.consumoPrevio.get(materialId) || 0);
  }

  private recalcularStock(): void {
    this.faltantesStock = [];
    this.itemsSinStock = new Map();
    if (this.stockMateriales.size === 0) return;   // sin datos de inventario no se valida aquí (lo valida Supabase)

    const faltan = new Map<number, { material: MaterialStock; requerido: number; disponible: number }>();
    this.consumoActual().forEach(c => {
      const material = this.stockMateriales.get(c.material_id);
      if (!material) return;
      const disponible = this.disponible(c.material_id);
      if (c.cantidad > disponible + 1e-6) {
        faltan.set(c.material_id, { material, requerido: c.cantidad, disponible });
      }
    });
    this.faltantesStock = [...faltan.values()];
    if (faltan.size === 0) return;

    this.gruposPorCategoria.forEach(c => c.grupos.forEach(g => g.items
      .filter(i => i.seleccionado && !i.personalizado && i.apu)
      .forEach(i => {
        const detalle = [...this.consumoDeItem(i).entries()]
          .filter(([id]) => faltan.has(id))
          .map(([id, cant]) => {
            const f = faltan.get(id)!;
            return `${f.material.descripcion}: usa ${this.num(cant)} ${f.material.unidad || ''} (total requerido ${this.num(f.requerido)}, disponible ${this.num(f.disponible)})`;
          });
        if (detalle.length) this.itemsSinStock.set(i.key, detalle.join('\n'));
      })));
  }

  /** Vuelve a leer el stock del inventario (después de guardar o eliminar). */
  private refrescarStock(): void {
    this.presupuestosService.listarStockMateriales().subscribe({
      next: stock => {
        this.stockMateriales = new Map(stock.map(m => [m.id, m]));
        this.recalcularStock();
        this.cdr.detectChanges();
      },
      error: err => console.error('No se pudo refrescar el stock:', err),
    });
  }

  private num(n: number): string {
    return (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  sinStock(item: ItemPresupuesto): boolean {
    return this.itemsSinStock.has(item.key);
  }

  detalleSinStock(item: ItemPresupuesto): string {
    return this.itemsSinStock.get(item.key) || '';
  }

  textoFaltantes(): string {
    return this.faltantesStock
      .map(f => `${f.material.descripcion} (disponible ${this.num(f.disponible)} ${f.material.unidad || ''}, requerido ${this.num(f.requerido)})`)
      .join('; ');
  }

  // ============================================================
  // HISTORIAL
  // ============================================================

  private cargarHistorial(): void {
    this.cargandoHistorial = true;
    this.errorHistorial = '';

    this.presupuestosService.listarPresupuestos()
      .pipe(timeout(20000))   // si Supabase no responde, se avisa en vez de quedarse "Cargando..."
      .subscribe({
        next: (data: PresupuestoResumen[]) => {
          // Se normalizan los números para que la tabla nunca falle al pintarse
          this.presupuestosGuardados = (data || []).map(p => ({
            ...p,
            total: Number(p.total) || 0,
            costo_directo: p.costo_directo === null || p.costo_directo === undefined ? null : Number(p.costo_directo) || 0,
          }));
          this.terminarCargaHistorial();
        },
        error: (err: any) => {
          console.error('Error al listar presupuestos guardados:', err);
          this.errorHistorial = err?.name === 'TimeoutError'
            ? 'Supabase no respondió a tiempo.'
            : (err?.message || String(err));
          this.terminarCargaHistorial();
        },
      });
  }

  private terminarCargaHistorial(): void {
    this.cargandoHistorial = false;
    try {
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error al mostrar la lista de presupuestos:', e);
      this.errorHistorial = 'No se pudo mostrar la lista: ' + ((e as any)?.message || e);
    }
  }

  reintentarHistorial(): void {
    this.cargarHistorial();
  }

  /** Abre un presupuesto guardado directamente en el formato Excel. */
  verDetalle(id: number): void {
    this.vista = 'formato';
    this.origenFormato = 'guardado';
    this.presupuestoVistoId = id;
    this.formato = null;
    this.cargandoDetalle = true;

    this.presupuestosService.obtenerDetalle(id).subscribe({
      next: (detalle: PresupuestoDetalle) => {
        this.formato = this.formatoDesdeGuardado(detalle);
        this.cargandoDetalle = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar el detalle del presupuesto:', err);
        this.cargandoDetalle = false;
        this.cdr.detectChanges();
      },
    });
  }

  private formatoDesdeGuardado(d: PresupuestoDetalle): PresupuestoFormato {
    const lineas: LineaPresupuesto[] = d.items.map(it => {
      const def = this.categoriasDefinidas.find(c => c.clave === it.categoria_clave);
      const partes = (it.rubro_codigo || '').split('.');
      const categoriaCodigo = it.categoria_codigo || def?.codigo || `${partes[0] || '9'}.0`;
      const subcategoriaCodigo = it.subcategoria_codigo ?? (partes.length >= 3 ? `${partes[0]}.${partes[1]}` : '');
      return {
        categoriaCodigo,
        categoriaNombre: def?.nombreFormato || (it.categoria_nombre || '').toUpperCase(),
        subcategoriaCodigo,
        subcategoriaNombre: it.subcategoria_nombre || '',
        codigo: it.rubro_codigo,
        descripcion: it.rubro_descripcion,
        unidad: it.unidad_medida,
        cantidad: Number(it.cantidad) || 0,
        precioUnitario: Number(it.costo_unitario) || 0,
        personalizado: !!it.es_personalizado,
      };
    });

    // Presupuestos antiguos (antes del formato) no tenían costos indirectos.
    const porcentaje = d.porcentaje_indirecto ?? 0;
    return construirFormato({
      proyecto: d.nombre,
      numeroTramite: d.numero_tramite || '',
      fecha: d.fecha_presupuesto || (d.creado_en || '').slice(0, 10),
      areaConstruccion: d.area_construccion ?? null,
      porcentajeIndirecto: Number(porcentaje) || 0,
    }, lineas);
  }

  eliminarPresupuesto(id: number, event?: Event): void {
    event?.stopPropagation();
    if (!confirm('¿Eliminar este presupuesto guardado? Los materiales que descontó vuelven al inventario. Esta acción no se puede deshacer.')) {
      return;
    }

    this.presupuestosService.eliminarPresupuesto(id).subscribe({
      next: () => {
        if (this.presupuestoEditandoId === id) {
          this.presupuestoEditandoId = null;
          this.consumoPrevio = new Map();
          this.hayCambios = true;
        }
        this.refrescarStock();
        this.cargarHistorial();
      },
      error: (err: any) => {
        console.error('Error al eliminar el presupuesto:', err);
        alert('No se pudo eliminar el presupuesto: ' + (err?.message || err));
        this.cdr.detectChanges();
      },
    });
  }

  // ============================================================
  // ACTUALIZAR UN PRESUPUESTO GUARDADO
  // ============================================================

  /** Carga un presupuesto guardado en el editor para modificarlo y volver a guardarlo. */
  editarPresupuesto(id: number | null, event?: Event): void {
    event?.stopPropagation();
    if (!id) return;
    if (this.hayCambios && this.totalSeleccionados > 0 && this.presupuestoEditandoId !== id &&
        !confirm('Se perderán los cambios que no hayas guardado en el presupuesto actual. ¿Continuar?')) {
      return;
    }

    this.vista = 'nuevo';
    this.formato = null;
    this.mensajeGuardado = '';
    this.mensajeExito = '';
    this.cargando = true;

    forkJoin({
      detalle: this.presupuestosService.obtenerDetalle(id),
      consumo: this.presupuestosService.obtenerConsumo(id),
    }).subscribe({
      next: ({ detalle, consumo }) => {
        // Se recarga el catálogo (APU y stock al día) y luego se aplican las cantidades guardadas
        this.cargarPresupuesto(() => this.aplicarPresupuestoGuardado(detalle, consumo));
      },
      error: (err: any) => {
        console.error('Error al cargar el presupuesto para editar:', err);
        this.cargando = false;
        this.mensajeGuardado = 'No se pudo cargar el presupuesto para editarlo.';
        this.cdr.detectChanges();
      },
    });
  }

  private aplicarPresupuestoGuardado(d: PresupuestoDetalle, consumo: ConsumoMaterial[]): void {
    this.encabezado = {
      proyecto: d.nombre || '',
      numeroTramite: d.numero_tramite || '',
      fecha: d.fecha_presupuesto || (d.creado_en || '').slice(0, 10) || hoyISO(),
      areaConstruccion: d.area_construccion ?? null,
      porcentajeIndirecto: Number(d.porcentaje_indirecto ?? 0) || 0,
    };
    this.consumoPrevio = new Map(consumo.map(c => [c.material_id, c.cantidad]));

    d.items.forEach(it => {
      const categoria =
        this.gruposPorCategoria.find(c => c.clave === it.categoria_clave) ||
        this.gruposPorCategoria.find(c => c.codigo === it.categoria_codigo) ||
        this.gruposPorCategoria.find(c => c.clave === CLAVE_PERSONALIZADOS)!;
      const cantidad = Number(it.cantidad) || 0;
      const precio = Number(it.costo_unitario) || 0;

      const existente = it.es_personalizado ? undefined : categoria.grupos
        .flatMap(g => g.items)
        .find(i => !i.personalizado && i.codigo === it.rubro_codigo);

      if (existente) {
        existente.cantidad = cantidad;
        existente.seleccionado = true;
        if (!existente.tieneApu) existente.precioUnitario = precio;   // P.U. escrito a mano
        return;
      }

      // Rubro personalizado (o que ya no existe en el catálogo): se recrea tal cual se guardó
      const subCodigo = it.subcategoria_codigo ?? '';
      const subNombre = it.subcategoria_nombre || 'RUBROS ADICIONALES';
      let grupo = categoria.grupos.find(g => g.codigo === subCodigo && normalizar(g.nombre) === normalizar(subNombre))
        || categoria.grupos.find(g => normalizar(g.nombre) === normalizar(subNombre));
      if (!grupo) {
        grupo = { codigo: subCodigo, nombre: subNombre, items: [], personalizado: true };
        categoria.grupos.push(grupo);
        categoria.grupos.sort((a, b) => compararCodigos(a.codigo, b.codigo));
      }
      grupo.items.push(this.crearItem({
        key: `p:${it.id}:${Math.random().toString(36).slice(2, 7)}`,
        codigo: it.rubro_codigo,
        descripcion: it.rubro_descripcion,
        unidad: it.unidad_medida || 'u',
        precioUnitario: precio,
        cantidad,
        seleccionado: true,
        personalizado: true,
      }));
      grupo.items.sort((a, b) => compararCodigos(a.codigo, b.codigo));
      categoria.expandido = true;
    });

    this.presupuestoEditandoId = d.id;
    this.recalcularTodo();
    this.hayCambios = false;
    this.soloSeleccionados = true;   // muestra directamente los rubros del presupuesto
    this.mensajeGuardado = `Editando "${d.nombre}". Modifica lo que necesites y pulsa Generar presupuesto → Actualizar.`;
  }
}
