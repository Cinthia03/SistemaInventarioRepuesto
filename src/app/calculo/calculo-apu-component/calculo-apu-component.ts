/*import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RubrosService, Rubro } from '../../core/services/Rubros.service';
import { EquiposService, equipos } from '../../core/services/equipos.service';
import { ManoDeObraService, ManoObra } from '../../core/services/mano-de-obra.service';
import { MaterialeService, materiales } from '../../core/services/materiales.service';
import { ApuService, ApuGuardado } from '../../core/services/apu.service';
import { MatIcon } from "@angular/material/icon";

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
  imports: [
    CommonModule,
    FormsModule,
    MatIcon
],
  templateUrl: './calculo-apu-component.html',
  styleUrl: './calculo-apu-component.css',
})

export class CalculoApuComponent implements OnInit {

  get catalogoTransportes() {
    return this.catalogoEquipos.filter(m =>
      m.descripcion?.toLowerCase().startsWith('transporte')
    );
  }

  // RUBROS
  codigoSeleccionado: string = '';
  rubroSeleccionado?: Rubro;
  rubros: Rubro[] = [];



  // CATALOGOS INVENTARIO
  catalogoEquipos: equipos[] = [];
  catalogManoObra: ManoObra[] = [];
  catalogoMateriales: materiales[] = [];



  // LISTA CALCULOS
  equiposList: EquipoCalculo[] = [];
  manoObraList: ManoObraCalculo[] = [];
  materialesList: MaterialesCalculo[] = [];
  transporteList: MaterialesCalculo[] = [];



  // SUBTOTALES Y TOTALES
  subtotalEquipos = 0;
  subtotalManoObra = 0;
  subtotalMateriales = 0;
  subtotalTransporte = 0;
  totalDirecto = 0;



  // UI
  mensajeError: string = '';
  cargandoEquipos = false;
  cargandoManoObra = false;
  cargandoMateriales = false;
  cargandoTransporte = false;

  constructor(
    private rubrosService: RubrosService,
    private equiposService: EquiposService,
    private manoObraService: ManoDeObraService,
    private materialesService: MaterialeService,
    private apuService: ApuService
  ) { }

  apusGuardados: ApuGuardado[] = [];
  apuSeleccionado?: ApuGuardado;
  mostrarModal = false;
  mensajeExito = '';
  fechaActual = new Date()

  ngOnInit(): void {
    this.rubros = this.rubrosService.getRubros();
    this.cargarCatalogoEquipos();
    this.cargarCatalogoManoObra();
    this.cargarCatalogoMateriales();
    this.cargarApusGuardados();
  }


  // SELECCION RUBRO
  onSeleccionarRubro(codigo: string): void {
    const rubro = this.rubros.find(r => r.codigo === codigo);
    if (!rubro) return;

    this.rubroSeleccionado = rubro;
    this.codigoSeleccionado = rubro.codigo;
    this.reiniciarCalculo();
  }


  // CARGAR CATALOGOS
  cargarCatalogoEquipos(): void {
    this.cargandoEquipos = true;
    this.equiposService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error(error);
          this.cargandoEquipos = false;
          return;
        }
        this.catalogoEquipos = (data || []).sort((a, b) =>
          a.descripcion.localeCompare(b.descripcion)
        );
        this.cargandoEquipos = false;
      },
      error: (err: any) => {
        console.error('Error al cargar equipos:', err);
        this.cargandoEquipos = false;
      }
    });
  }

  cargarCatalogoManoObra(): void {
    this.cargandoManoObra = true;
    this.manoObraService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error(error);
          this.cargandoManoObra = false;
          return;
        }
        this.catalogManoObra = (data || []).sort((a, b) =>
          a.descripcion.localeCompare(b.descripcion)
        );
        this.cargandoManoObra = false;
      },
      error: (err: any) => {
        console.error('Error al cargar mano de obra:', err);
        this.cargandoManoObra = false;
      }
    });
  }

  cargarCatalogoMateriales(): void {
    this.cargandoMateriales = true;
    this.materialesService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error(error);
          this.cargandoMateriales = false;
          return;
        }
        this.catalogoMateriales = (data || []).sort((a, b) =>
          a.descripcion.localeCompare(b.descripcion)
        );
        this.cargandoMateriales = false;
      },
      error: (err: any) => {
        console.error('Error al cargar materiales:', err);
        this.cargandoMateriales = false;
      }
    });
  }

  cargarApusGuardados(): void {
    this.apuService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error('Error al cargar APUs:', error);
          return;
        }
        this.apusGuardados = data || [];
      },
      error: (err: any) => {
        console.error('Error al cargar APUs:', err);
      }
    });
  }


  // AGREGAR DATOS EN TABLA
  agregarEquipo(): void {
    this.equiposList.push({
      descripcion: '',
      stock: null as any,
      cantidad: null as any,
      tarifa: null as any,
      rendimiento: null as any,
      costoHora: null as any,
      costo: null as any,
    });
  }

  agregarManoObra(): void {
    this.manoObraList.push({
      descripcion: '',
      cantidad: null as any,
      tarifa: null as any,
      rendimiento: null as any,
      costoHora: null as any,
      costo: null as any,
    });
  }

  agregarMaterial(): void {
    this.materialesList.push({
      descripcion: '',
      unidad: '',
      cantidad: null as any,
      stock: null as any,
      unitario: null as any,
      costo: null as any,
    });
  }

  agregarTransporte(): void {
    this.transporteList.push({
      descripcion: '',
      unidad: '',
      cantidad: null as any,
      stock: null as any,
      unitario: null as any,
      costo: null as any
    });
  }



  // ELIMINAR FILAS
  eliminarEquipo(index: number): void {
    this.equiposList.splice(index, 1);
    this.calcularTodo();
  }

  eliminarManoObra(index: number): void {
    this.manoObraList.splice(index, 1);
    this.calcularTodo();
  }

  eliminarMaterial(index: number): void {
    this.materialesList.splice(index, 1);
    this.calcularTodo();
  }

  eliminarTransporte(index: number): void {
    this.transporteList.splice(index, 1);
    this.calcularTodo();
  }

  eliminarApu(id: number): void {
    this.apuService.eliminar(id).subscribe({
      next: () => this.cargarApusGuardados(),
      error: (err) => console.error('Error al eliminar:', err)
    });
  }


  // SELECCIONAR TRANSPORTE
  seleccionarEquipo(item: EquipoCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const equipo = this.catalogoEquipos.find(e => e.id === id);
    if (!equipo) return;

    item.id = equipo.id;
    item.codigo = equipo.codigo;
    item.descripcion = equipo.descripcion;
    item.unidad = equipo.unidad;
    item.tarifa = equipo.precio;
    item.stock = equipo.stock;
    this.calcularTodo();
  }

  seleccionarManoObra(item: ManoObraCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const manoObra = this.catalogManoObra.find(e => e.id === id);
    if (!manoObra) return;

    item.id = manoObra.id;
    item.codigo = manoObra.codigo;
    item.descripcion = manoObra.descripcion;
    item.unidad = manoObra.unidad;
    item.tarifa = manoObra.precio;
    this.calcularTodo();
  }

  seleccionarMateriales(item: MaterialesCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const materiales = this.catalogoMateriales.find(e => e.id === id);
    if (!materiales) return;

    item.id = materiales.id;
    item.codigo = materiales.codigo;
    item.descripcion = materiales.descripcion;
    item.unidad = materiales.unidad;
    item.unitario = materiales.precio;
    item.stock = materiales.stock;
    this.calcularTodo();
  }

  seleccionarTransporte(item: MaterialesCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const equipo = this.catalogoEquipos.find(e => e.id === id);  // ← catalogoEquipos
    if (!equipo) return;

    item.id = equipo.id;
    item.codigo = equipo.codigo;
    item.descripcion = equipo.descripcion;
    item.unidad = equipo.unidad;
    item.unitario = equipo.precio;
    item.stock = equipo.stock;
    this.calcularTodo();
  }



  // VALIDACION STOCK
  validarStock(equipo: EquipoCalculo): void {
    if ((equipo.cantidad || 0) > (equipo.stock || 0)) {
      this.mensajeError = `Stock insuficiente: máximo disponible es ${equipo.stock} unidades.`;
      equipo.cantidad = equipo.stock || 0;
      this.irAlInicio();
      setTimeout(() => (this.mensajeError = ''), 3500);
    }
    this.calcularTodo();
  }

  validarStockMat(materiales: MaterialesCalculo): void {
    if ((materiales.cantidad || 0) > (materiales.stock || 0)) {
      this.mensajeError = `Stock insuficiente: máximo disponible es ${materiales.stock} unidades.`;
      materiales.cantidad = materiales.stock || 0;
      this.irAlInicio();
      setTimeout(() => (this.mensajeError = ''), 3500);
    }
    this.calcularTodo();
  }



  // CALCULOS
  calcularTodo(): void {
    this.subtotalEquipos = this.calcularConRendimiento(this.equiposList);
    this.subtotalManoObra = this.calcularConRendimiento(this.manoObraList);
    this.subtotalMateriales = this.calcularSinRendimiento(this.materialesList);
    this.subtotalTransporte = this.calcularSinRendimiento(this.transporteList);

    this.totalDirecto =
      this.subtotalEquipos +
      this.subtotalManoObra +
      this.subtotalMateriales +
      this.subtotalTransporte;
  }

  private calcularConRendimiento(
    lista: Array<{ cantidad?: number; tarifa?: number; rendimiento?: number; costoHora?: number; costo?: number }>
  ): number {
    return lista.reduce((sum, item) => {
      item.costoHora = (item.cantidad || 0) * (item.tarifa || 0);
      item.costo = (item.costoHora || 0) * (item.rendimiento || 1);
      return sum + item.costo;
    }, 0);
  }

  private calcularSinRendimiento(
    lista: Array<{ cantidad?: number; tarifa?: number; unitario?: number; costo?: number }>
  ): number {
    return lista.reduce((sum, item) => {
      const precio = item.tarifa ?? item.unitario ?? 0;
      item.costo = (item.cantidad || 0) * precio;
      return sum + item.costo;
    }, 0);
  }

  // REINICIAR/LIMPIAR
  reiniciarCalculo(): void {
    this.equiposList = [];
    this.manoObraList = [];
    this.materialesList = [];
    this.transporteList = [];
    this.subtotalEquipos = 0;
    this.subtotalManoObra = 0;
    this.subtotalMateriales = 0;
    this.subtotalTransporte = 0;
    this.totalDirecto = 0;
    this.mensajeError = '';
  }


  guardarCalculo(): void {
    if (!this.rubroSeleccionado) {
      this.mensajeError = 'Seleccione un rubro antes de guardar.';
      this.irAlInicio();
      setTimeout(() => this.mensajeError = '', 3000);
      return;
    }

    if (!this.validarCamposCompletos()) {
      this.mensajeError = 'Complete todos los campos antes de guardar (descripción, cantidad y rendimiento en cada fila).';
      this.irAlInicio();
      setTimeout(() => this.mensajeError = '', 4000);
      return;
    }

    const apu: ApuGuardado = {
      rubro_codigo: this.rubroSeleccionado.codigo,
      rubro_descripcion: this.rubroSeleccionado.descripcion,
      fecha: new Date().toISOString(),
      subtotal_equipos: this.subtotalEquipos,
      subtotal_mano_obra: this.subtotalManoObra,
      subtotal_materiales: this.subtotalMateriales,
      subtotal_transporte: this.subtotalTransporte,
      total_directo: this.totalDirecto,
      detalle_equipos: JSON.stringify(this.equiposList),
      detalle_mano_obra: JSON.stringify(this.manoObraList),
      detalle_materiales: JSON.stringify(this.materialesList),
      detalle_transporte: JSON.stringify(this.transporteList)
    };

    this.apuService.guardar(apu).subscribe({
      next: () => {
        this.descontarStockUsado();
        this.cargarApusGuardados();
        this.mensajeExito = '✅ Cálculo guardado con éxito.';     
        this.irAlInicio();
        setTimeout(() => this.mensajeExito = '', 3000);
        this.limpiarFormularioCompleto();
      },
      error: (err) => {
        this.mensajeError = 'Error al guardar el cálculo.';
        this.irAlInicio();
        setTimeout(() => this.mensajeError = '', 3000);
        console.error(err);
      }
    });
  }

  private irAlInicio(): void {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  // VALIDA QUE TODAS LAS FILAS TENGAN LOS CAMPOS OBLIGATORIOS LLENOS
  private validarCamposCompletos(): boolean {
    const totalItems =
      this.equiposList.length +
      this.manoObraList.length +
      this.materialesList.length +
      this.transporteList.length;

    if (totalItems === 0) {
      return false;
    }

    const equiposOk = this.equiposList.every(e =>
      e.id && e.descripcion && (e.cantidad || 0) > 0 && (e.rendimiento || 0) > 0 && (e.cantidad || 0) <= (e.stock || 0)
    );

    const manoObraOk = this.manoObraList.every(mo =>
      mo.id && mo.descripcion && (mo.cantidad || 0) > 0 && (mo.rendimiento || 0) > 0
    );

    const materialesOk = this.materialesList.every(m =>
      m.id && m.descripcion && (m.cantidad || 0) > 0 && (m.cantidad || 0) <= (m.stock || 0)
    );

    const transporteOk = this.transporteList.every(t =>
      t.id && t.descripcion && (t.cantidad || 0) > 0 && (t.cantidad || 0) <= (t.stock || 0)
    );

    return equiposOk && manoObraOk && materialesOk && transporteOk;
  }

  // LIMPIA TODO EL FORMULARIO DESPUÉS DE GUARDAR
  private limpiarFormularioCompleto(): void {
    this.equiposList = [];
    this.manoObraList = [];
    this.materialesList = [];
    this.transporteList = [];
    this.subtotalEquipos = 0;
    this.subtotalManoObra = 0;
    this.subtotalMateriales = 0;
    this.subtotalTransporte = 0;
    this.totalDirecto = 0;
    this.rubroSeleccionado = undefined;
    this.codigoSeleccionado = '';
  }

  // DESCUENTA STOCK DE EQUIPOS, MATERIALES Y TRANSPORTE USADOS
  private descontarStockUsado(): void {
    // Equipos
    this.equiposList.forEach(e => {
      if (e.id && e.cantidad > 0) {
        const nuevoStock = Math.max((e.stock || 0) - e.cantidad, 0);
        this.equiposService.actualizarStock(e.id, nuevoStock).subscribe({
          next: () => this.cargarCatalogoEquipos(),
          error: (err: any) => console.error('Error al descontar stock de equipo:', err)
        });
      }
    });

    // Materiales
    this.materialesList.forEach(m => {
      if (m.id && m.cantidad > 0) {
        const nuevoStock = Math.max((m.stock || 0) - m.cantidad, 0);
        this.materialesService.actualizarStock(m.id, nuevoStock).subscribe({
          next: () => this.cargarCatalogoMateriales(),
          error: (err: any) => console.error('Error al descontar stock de material:', err)
        });
      }
    });

    // Transporte (usa el catálogo de equipos, ya que catalogoTransportes deriva de ahí)
    this.transporteList.forEach(t => {
      if (t.id && t.cantidad > 0) {
        const nuevoStock = Math.max((t.stock || 0) - t.cantidad, 0);
        this.equiposService.actualizarStock(t.id, nuevoStock).subscribe({
          next: () => this.cargarCatalogoEquipos(),
          error: (err: any) => console.error('Error al descontar stock de transporte:', err)
        });
      }
    });
  }

  abrirModal(apu: ApuGuardado): void {
    this.apuSeleccionado = {
      ...apu,
      detalle_equipos: typeof apu.detalle_equipos === 'string'
        ? JSON.parse(apu.detalle_equipos) : apu.detalle_equipos,
      detalle_mano_obra: typeof apu.detalle_mano_obra === 'string'
        ? JSON.parse(apu.detalle_mano_obra) : apu.detalle_mano_obra,
      detalle_materiales: typeof apu.detalle_materiales === 'string'
        ? JSON.parse(apu.detalle_materiales) : apu.detalle_materiales,
      detalle_transporte: typeof apu.detalle_transporte === 'string'
        ? JSON.parse(apu.detalle_transporte) : apu.detalle_transporte,
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.apuSeleccionado = undefined;
  }
}*/

import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RubrosService, Rubro } from '../../core/services/Rubros.service';
import { EquiposService, equipos } from '../../core/services/equipos.service';
import { ManoDeObraService, ManoObra } from '../../core/services/mano-de-obra.service';
import { MaterialeService, materiales } from '../../core/services/materiales.service';
import { ApuService, ApuGuardado } from '../../core/services/apu.service';
import { MatIcon } from "@angular/material/icon";

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
  imports: [
    CommonModule,
    FormsModule,
    MatIcon
  ],
  templateUrl: './calculo-apu-component.html',
  styleUrl: './calculo-apu-component.css',
})
export class CalculoApuComponent implements OnInit {

  get catalogoTransportes() {
    return this.catalogoEquipos.filter(m =>
      m.descripcion?.toLowerCase().startsWith('transporte')
    );
  }

  // PROYECTO / PRESUPUESTO AL QUE PERTENECE EL CÁLCULO
  proyectoDescripcion: string = '';

  // RUBROS
  codigoSeleccionado: string = '';
  rubroSeleccionado?: Rubro;
  rubros: Rubro[] = [];

  // CATALOGOS INVENTARIO
  catalogoEquipos: equipos[] = [];
  catalogManoObra: ManoObra[] = [];
  catalogoMateriales: materiales[] = [];

  // LISTA CALCULOS
  equiposList: EquipoCalculo[] = [];
  manoObraList: ManoObraCalculo[] = [];
  materialesList: MaterialesCalculo[] = [];
  transporteList: MaterialesCalculo[] = [];

  // SUBTOTALES Y TOTALES
  subtotalEquipos = 0;
  subtotalManoObra = 0;
  subtotalMateriales = 0;
  subtotalTransporte = 0;
  totalDirecto = 0;

  // UI
  mensajeError: string = '';
  mensajeExito: string = '';
  cargandoEquipos = false;
  cargandoManoObra = false;
  cargandoMateriales = false;
  cargandoTransporte = false;
  fechaActual = new Date();

  constructor(
    private rubrosService: RubrosService,
    private equiposService: EquiposService,
    private manoObraService: ManoDeObraService,
    private materialesService: MaterialeService,
    private apuService: ApuService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.rubros = this.rubrosService.getRubros();
    this.cargarCatalogoEquipos();
    this.cargarCatalogoManoObra();
    this.cargarCatalogoMateriales();
  }

  // NAVEGACIÓN AL HISTORIAL DE CÁLCULOS GUARDADOS
  irACalculosGuardados(): void {
    this.router.navigate(['/calculos-generados']);
  }

  // SELECCION RUBRO
  onSeleccionarRubro(codigo: string): void {
    const rubro = this.rubros.find(r => r.codigo === codigo);
    if (!rubro) return;

    this.rubroSeleccionado = rubro;
    this.codigoSeleccionado = rubro.codigo;
    this.reiniciarCalculo();
  }

  // CARGAR CATALOGOS
  cargarCatalogoEquipos(): void {
    this.cargandoEquipos = true;
    this.equiposService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error(error);
          this.cargandoEquipos = false;
          return;
        }
        this.catalogoEquipos = (data || []).sort((a, b) =>
          a.descripcion.localeCompare(b.descripcion)
        );
        this.cargandoEquipos = false;
      },
      error: (err: any) => {
        console.error('Error al cargar equipos:', err);
        this.cargandoEquipos = false;
      }
    });
  }

  cargarCatalogoManoObra(): void {
    this.cargandoManoObra = true;
    this.manoObraService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error(error);
          this.cargandoManoObra = false;
          return;
        }
        this.catalogManoObra = (data || []).sort((a, b) =>
          a.descripcion.localeCompare(b.descripcion)
        );
        this.cargandoManoObra = false;
      },
      error: (err: any) => {
        console.error('Error al cargar mano de obra:', err);
        this.cargandoManoObra = false;
      }
    });
  }

  cargarCatalogoMateriales(): void {
    this.cargandoMateriales = true;
    this.materialesService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error(error);
          this.cargandoMateriales = false;
          return;
        }
        this.catalogoMateriales = (data || []).sort((a, b) =>
          a.descripcion.localeCompare(b.descripcion)
        );
        this.cargandoMateriales = false;
      },
      error: (err: any) => {
        console.error('Error al cargar materiales:', err);
        this.cargandoMateriales = false;
      }
    });
  }

  // AGREGAR DATOS EN TABLA
  agregarEquipo(): void {
    this.equiposList.push({
      descripcion: '',
      stock: null as any,
      cantidad: null as any,
      tarifa: null as any,
      rendimiento: null as any,
      costoHora: null as any,
      costo: null as any,
    });
  }

  agregarManoObra(): void {
    this.manoObraList.push({
      descripcion: '',
      cantidad: null as any,
      tarifa: null as any,
      rendimiento: null as any,
      costoHora: null as any,
      costo: null as any,
    });
  }

  agregarMaterial(): void {
    this.materialesList.push({
      descripcion: '',
      unidad: '',
      cantidad: null as any,
      stock: null as any,
      unitario: null as any,
      costo: null as any,
    });
  }

  agregarTransporte(): void {
    this.transporteList.push({
      descripcion: '',
      unidad: '',
      cantidad: null as any,
      stock: null as any,
      unitario: null as any,
      costo: null as any
    });
  }

  // ELIMINAR FILAS
  eliminarEquipo(index: number): void {
    this.equiposList.splice(index, 1);
    this.calcularTodo();
  }

  eliminarManoObra(index: number): void {
    this.manoObraList.splice(index, 1);
    this.calcularTodo();
  }

  eliminarMaterial(index: number): void {
    this.materialesList.splice(index, 1);
    this.calcularTodo();
  }

  eliminarTransporte(index: number): void {
    this.transporteList.splice(index, 1);
    this.calcularTodo();
  }

  // SELECCION DE ITEMS
  seleccionarEquipo(item: EquipoCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const equipo = this.catalogoEquipos.find(e => e.id === id);
    if (!equipo) return;

    item.id = equipo.id;
    item.codigo = equipo.codigo;
    item.descripcion = equipo.descripcion;
    item.unidad = equipo.unidad;
    item.tarifa = equipo.precio;
    item.stock = equipo.stock;
    this.calcularTodo();
  }

  seleccionarManoObra(item: ManoObraCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const manoObra = this.catalogManoObra.find(e => e.id === id);
    if (!manoObra) return;

    item.id = manoObra.id;
    item.codigo = manoObra.codigo;
    item.descripcion = manoObra.descripcion;
    item.unidad = manoObra.unidad;
    item.tarifa = manoObra.precio;
    this.calcularTodo();
  }

  seleccionarMateriales(item: MaterialesCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const materiales = this.catalogoMateriales.find(e => e.id === id);
    if (!materiales) return;

    item.id = materiales.id;
    item.codigo = materiales.codigo;
    item.descripcion = materiales.descripcion;
    item.unidad = materiales.unidad;
    item.unitario = materiales.precio;
    item.stock = materiales.stock;
    this.calcularTodo();
  }

  seleccionarTransporte(item: MaterialesCalculo, event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const equipo = this.catalogoEquipos.find(e => e.id === id);
    if (!equipo) return;

    item.id = equipo.id;
    item.codigo = equipo.codigo;
    item.descripcion = equipo.descripcion;
    item.unidad = equipo.unidad;
    item.unitario = equipo.precio;
    item.stock = equipo.stock;
    this.calcularTodo();
  }

  // VALIDACION STOCK
  validarStock(equipo: EquipoCalculo): void {
    if ((equipo.cantidad || 0) > (equipo.stock || 0)) {
      this.mensajeError = `Stock insuficiente: máximo disponible es ${equipo.stock} unidades.`;
      equipo.cantidad = equipo.stock || 0;
      this.irAlInicio();
      setTimeout(() => (this.mensajeError = ''), 3500);
    }
    this.calcularTodo();
  }

  validarStockMat(materiales: MaterialesCalculo): void {
    if ((materiales.cantidad || 0) > (materiales.stock || 0)) {
      this.mensajeError = `Stock insuficiente: máximo disponible es ${materiales.stock} unidades.`;
      materiales.cantidad = materiales.stock || 0;
      this.irAlInicio();
      setTimeout(() => (this.mensajeError = ''), 3500);
    }
    this.calcularTodo();
  }

  // CALCULOS
  calcularTodo(): void {
    this.subtotalEquipos = this.calcularConRendimiento(this.equiposList);
    this.subtotalManoObra = this.calcularConRendimiento(this.manoObraList);
    this.subtotalMateriales = this.calcularSinRendimiento(this.materialesList);
    this.subtotalTransporte = this.calcularSinRendimiento(this.transporteList);

    this.totalDirecto =
      this.subtotalEquipos +
      this.subtotalManoObra +
      this.subtotalMateriales +
      this.subtotalTransporte;
  }

  private calcularConRendimiento(
    lista: Array<{ cantidad?: number; tarifa?: number; rendimiento?: number; costoHora?: number; costo?: number }>
  ): number {
    return lista.reduce((sum, item) => {
      item.costoHora = (item.cantidad || 0) * (item.tarifa || 0);
      item.costo = (item.costoHora || 0) * (item.rendimiento || 1);
      return sum + item.costo;
    }, 0);
  }

  private calcularSinRendimiento(
    lista: Array<{ cantidad?: number; tarifa?: number; unitario?: number; costo?: number }>
  ): number {
    return lista.reduce((sum, item) => {
      const precio = item.tarifa ?? item.unitario ?? 0;
      item.costo = (item.cantidad || 0) * precio;
      return sum + item.costo;
    }, 0);
  }

  // REINICIAR/LIMPIAR (al cambiar de rubro)
  reiniciarCalculo(): void {
    this.equiposList = [];
    this.manoObraList = [];
    this.materialesList = [];
    this.transporteList = [];
    this.subtotalEquipos = 0;
    this.subtotalManoObra = 0;
    this.subtotalMateriales = 0;
    this.subtotalTransporte = 0;
    this.totalDirecto = 0;
    this.mensajeError = '';
  }

  guardarCalculo(): void {
    if (!this.proyectoDescripcion.trim()) {
      this.mensajeError = 'Ingrese el nombre o descripción del proyecto/presupuesto antes de guardar.';
      this.irAlInicio();
      setTimeout(() => this.mensajeError = '', 3500);
      return;
    }

    if (!this.rubroSeleccionado) {
      this.mensajeError = 'Seleccione un rubro antes de guardar.';
      this.irAlInicio();
      setTimeout(() => this.mensajeError = '', 3000);
      return;
    }

    if (!this.validarCamposCompletos()) {
      this.mensajeError = 'Complete todos los campos antes de guardar (descripción, cantidad y rendimiento en cada fila).';
      this.irAlInicio();
      setTimeout(() => this.mensajeError = '', 4000);
      return;
    }

    const apu: ApuGuardado = {
      proyecto: this.proyectoDescripcion.trim(),
      rubro_codigo: this.rubroSeleccionado.codigo,
      rubro_descripcion: this.rubroSeleccionado.descripcion,
      fecha: new Date().toISOString(),
      subtotal_equipos: this.subtotalEquipos,
      subtotal_mano_obra: this.subtotalManoObra,
      subtotal_materiales: this.subtotalMateriales,
      subtotal_transporte: this.subtotalTransporte,
      total_directo: this.totalDirecto,
      detalle_equipos: JSON.stringify(this.equiposList),
      detalle_mano_obra: JSON.stringify(this.manoObraList),
      detalle_materiales: JSON.stringify(this.materialesList),
      detalle_transporte: JSON.stringify(this.transporteList)
    };

    this.apuService.guardar(apu).subscribe({
      next: () => {
        this.descontarStockUsado();
        this.mensajeExito = '✅ Cálculo guardado con éxito.';
        this.irAlInicio();
        setTimeout(() => this.mensajeExito = '', 3000);
        this.limpiarFormularioParaSiguienteRubro();
      },
      error: (err) => {
        this.mensajeError = 'Error al guardar el cálculo.';
        this.irAlInicio();
        setTimeout(() => this.mensajeError = '', 3000);
        console.error(err);
      }
    });
  }

  // LLEVA EL SCROLL AL INICIO DE LA PÁGINA (donde aparecen las alertas)
  private irAlInicio(): void {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  // VALIDA QUE TODAS LAS FILAS TENGAN LOS CAMPOS OBLIGATORIOS LLENOS Y DENTRO DE STOCK
  private validarCamposCompletos(): boolean {
    const totalItems =
      this.equiposList.length +
      this.manoObraList.length +
      this.materialesList.length +
      this.transporteList.length;

    if (totalItems === 0) {
      return false;
    }

    const equiposOk = this.equiposList.every(e =>
      e.id && e.descripcion && (e.cantidad || 0) > 0 && (e.rendimiento || 0) > 0 && (e.cantidad || 0) <= (e.stock || 0)
    );

    const manoObraOk = this.manoObraList.every(mo =>
      mo.id && mo.descripcion && (mo.cantidad || 0) > 0 && (mo.rendimiento || 0) > 0
    );

    const materialesOk = this.materialesList.every(m =>
      m.id && m.descripcion && (m.cantidad || 0) > 0 && (m.cantidad || 0) <= (m.stock || 0)
    );

    const transporteOk = this.transporteList.every(t =>
      t.id && t.descripcion && (t.cantidad || 0) > 0 && (t.cantidad || 0) <= (t.stock || 0)
    );

    return equiposOk && manoObraOk && materialesOk && transporteOk;
  }

  // LIMPIA SOLO LAS TABLAS DE CÁLCULO PARA SEGUIR AGREGANDO RUBROS AL MISMO PROYECTO
  // (mantiene el nombre del proyecto para no tener que reescribirlo en cada rubro)
  private limpiarFormularioParaSiguienteRubro(): void {
    this.equiposList = [];
    this.manoObraList = [];
    this.materialesList = [];
    this.transporteList = [];
    this.subtotalEquipos = 0;
    this.subtotalManoObra = 0;
    this.subtotalMateriales = 0;
    this.subtotalTransporte = 0;
    this.totalDirecto = 0;
    this.rubroSeleccionado = undefined;
    this.codigoSeleccionado = '';
  }

  // DESCUENTA STOCK DE EQUIPOS, MATERIALES Y TRANSPORTE USADOS
  private descontarStockUsado(): void {
    this.equiposList.forEach(e => {
      if (e.id && e.cantidad > 0) {
        const nuevoStock = Math.max((e.stock || 0) - e.cantidad, 0);
        this.equiposService.actualizarStock(e.id, nuevoStock).subscribe({
          next: () => this.cargarCatalogoEquipos(),
          error: (err: any) => console.error('Error al descontar stock de equipo:', err)
        });
      }
    });

    this.materialesList.forEach(m => {
      if (m.id && m.cantidad > 0) {
        const nuevoStock = Math.max((m.stock || 0) - m.cantidad, 0);
        this.materialesService.actualizarStock(m.id, nuevoStock).subscribe({
          next: () => this.cargarCatalogoMateriales(),
          error: (err: any) => console.error('Error al descontar stock de material:', err)
        });
      }
    });

    this.transporteList.forEach(t => {
      if (t.id && t.cantidad > 0) {
        const nuevoStock = Math.max((t.stock || 0) - t.cantidad, 0);
        this.equiposService.actualizarStock(t.id, nuevoStock).subscribe({
          next: () => this.cargarCatalogoEquipos(),
          error: (err: any) => console.error('Error al descontar stock de transporte:', err)
        });
      }
    });
  }
}