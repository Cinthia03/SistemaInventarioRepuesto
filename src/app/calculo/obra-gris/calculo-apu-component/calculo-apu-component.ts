import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RubrosService, Rubro } from '../../../services/Rubros.service';
import { EquiposService, equipos, Equipo_calculo } from '../../../services/equipos.service';

@Component({
  selector: 'app-calculo-apu-component',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './calculo-apu-component.html',
  styleUrl: './calculo-apu-component.css',
})

export class CalculoApuComponent implements OnInit {

  // RUBROS
  codigoSeleccionado: string = '';
  rubroSeleccionado?: Rubro;
  rubros: Rubro[] = [];

  // EQUIPOS
  catalogoEquipos: equipos[] = [];
  equiposList: Equipo_calculo[] = [];
  equipos: any[] = [];
  manoObraList: any[] = [];
  materialesList: any[] = [];
  transporteList: any[] = [];

  // TOTALES
  subtotalEquipos = 0;
  subtotalManoObra = 0;
  subtotalMateriales = 0;
  subtotalTransporte = 0;
  totalDirecto = 0;

  constructor(
    private rubrosService: RubrosService,
    private equiposService: EquiposService
  ) {}

  ngOnInit(): void {
    this.rubros = this.rubrosService.getRubros();
    this.cargarCatalogoEquipos();
  }

  // =========================
  // SELECCIONAR RUBRO
  // =========================
  onSeleccionarRubro(codigo: string): void {
    //const codigo = (event.target as HTMLSelectElement).value;
    const rubro = this.rubros.find(r => r.codigo === codigo);

    if (!rubro) return; 
      this.rubroSeleccionado = rubro;
      this.codigoSeleccionado = rubro.codigo;
      this.equiposList = [];
      this.subtotalEquipos = 0;
      this.totalDirecto = 0;
  }

   // =========================
  // CARGAR EQUIPOS
  // =========================
  cargarCatalogoEquipos(): void {
    this.equiposService
      .obtenerTodos()
      .subscribe({
        next: (data) => {
          this.catalogoEquipos = data;
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  // =========================
  // AGREGAR EQUIPO
  // =========================
  agregarEquipo(): void {
    this.equiposList.push({
      descripcion: '',
      cantidad: 1,
      stock: 0,
      tarifa: 0,
      rendimiento: 1,
      costoHora: 0,
      costo: 0
    });
  }

  // =========================
  // SELECCIONAR EQUIPO
  // =========================
  seleccionarEquipo(item: Equipo_calculo, event: Event): void {
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

  validarStock(e: Equipo_calculo): void {
    if ((e.cantidad || 0) > (e.stock || 0)) {
      alert(
        'Cantidad supera el stock disponible'
      );

      e.cantidad =
        e.stock || 0;
    }
    this.calcularTodo();
  }













  

  // =========================
  //  CALCULOS
  // =========================
  calcularTodo(): void {

    this.subtotalEquipos = 0;
    this.equiposList.forEach(e => {
      e.costoHora = (e.cantidad || 0) * (e.tarifa || 0);
      e.costo = (e.costoHora || 0) * (e.rendimiento || 0);
      this.subtotalEquipos += e.costo || 0;
    });

    this.subtotalManoObra = 0;
    this.manoObraList.forEach(m => {
      m.costoHora = (m.cantidad || 0) * (m.tarifa || 0);
      m.costo = m.costoHora * (m.rendimiento || 0);
      this.subtotalManoObra += m.costo;
    });

    this.subtotalMateriales = 0;
    this.materialesList.forEach(mat => {
      mat.costo = (mat.cantidad || 0) * (mat.tarifa || 0);
      this.subtotalMateriales += mat.costo;
    });

    this.subtotalTransporte = 0;
    this.transporteList.forEach(t => {
      t.costo = (t.cantidad || 0) * (t.tarifa || 0);
      this.subtotalTransporte += t.costo;
    });

    this.totalDirecto =
      this.subtotalEquipos +
      this.subtotalManoObra +
      this.subtotalMateriales +
      this.subtotalTransporte;
  }

  // =========================
  //  RESET
  // =========================
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
  }

  // =========================
  //  AGREGAR FILAS
  // =========================
  //agregarEquipo() { this.equipos.push({ descripcion:'', cantidad:0, tarifa:0, rendimiento:1 }); }
  agregarManoObra() { this.manoObraList.push({ descripcion:'', cantidad:0, tarifa:0, rendimiento:1 }); }
  agregarMaterial() { this.materialesList.push({ descripcion:'', unidad:'', cantidad:0, tarifa:0 }); }
  agregarTransporte() { this.transporteList.push({ descripcion:'', cantidad:0, tarifa:0 }); }
}