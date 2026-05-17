import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RubrosService, Rubro } from '../../../services/Rubros.service';
import { EquiposService, equipos } from '../../../services/equipos.service';
import { ManoDeObraService, ManoObra } from '../../../services/mano-de-obra.service';
import { MaterialeService, materiales } from '../../../services/materiales.service';
import { ApuService, ApuGuardado } from '../../../services/apu.service';
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
  styleUrl: '../../calculo-apu-component.css',
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
      next: (data) => {
        this.catalogoEquipos = data;
        this.cargandoEquipos = false;
      },
      error: (err) => {
        console.error('Error al cargar equipos:', err);
        this.cargandoEquipos = false;
      }
    });
  }

  cargarCatalogoManoObra(): void {
    this.cargandoManoObra = true;
    this.manoObraService.obtenerTodos().subscribe({
      next: (data) => {
        this.catalogManoObra = data;
        this.cargandoManoObra = false;
      },
      error: (err) => {
        console.error('Error al cargar mano de obra:', err);
        this.cargandoManoObra = false;
      }
    });
  }

  cargarCatalogoMateriales(): void {
    this.cargandoMateriales = true;
    this.materialesService.obtenerTodos().subscribe({
      next: (data) => {
        this.catalogoMateriales = data;
        this.cargandoMateriales = false;
      },
      error: (err) => {
        console.error('Error al cargar materiales:', err);
        this.cargandoMateriales = false;
      }
    });
  }

  cargarApusGuardados(): void {
  this.apuService.obtenerTodos().subscribe({
    next: (data) => {
      console.log('APUs cargados:', data); 
      this.apusGuardados = data;
    },
    error: (err) => console.error('Error al cargar APUs:', err)
  });
  }


  // AGREGAR DATOS EN TABLA
  agregarEquipo(): void {
    this.equiposList.push({
      descripcion: '',
      stock: 0,
      cantidad: 1,
      tarifa: 0,
      rendimiento: 1,
      costoHora: 0,
      costo: 0
    });
  }

  agregarManoObra(): void {
    this.manoObraList.push({
      descripcion: '',
      cantidad: 1,
      tarifa: 0,
      rendimiento: 1,
      costoHora: 0,
      costo: 0
    });
  }

  agregarMaterial(): void {
    this.materialesList.push({
      descripcion: '',
      unidad: '',
      cantidad: 1,
      stock: 0,
      unitario: 0,
      costo: 0
    });
  }

  agregarTransporte(): void {
    this.transporteList.push({
      descripcion: '',
      unidad: '',
      cantidad: 1,
      stock: 0,
      unitario: 0,
      costo: 0
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
      setTimeout(() => (this.mensajeError = ''), 3500);
    }
    this.calcularTodo();
  }

  validarStockMat(materiales: MaterialesCalculo): void {
    if ((materiales.cantidad || 0) > (materiales.stock || 0)) {
      this.mensajeError = `Stock insuficiente: máximo disponible es ${materiales.stock} unidades.`;
      materiales.cantidad = materiales.stock || 0;
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
      setTimeout(() => this.mensajeError = '', 3000);
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
        this.mensajeExito = '✅ Cálculo guardado correctamente.';
        setTimeout(() => this.mensajeExito = '', 3000);
        this.cargarApusGuardados();
      },
      error: (err) => {
        this.mensajeError = 'Error al guardar el cálculo.';
        console.error(err);
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

}