import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RubrosService } from '../../../services/RubrosService';

export interface Rubro {
  codigo: string;
  descripcion: string;
  categoria: string;
  unidad?: string; // opcional para evitar errores
}

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

  // 🔍 BUSCADOR
  codigoBusqueda: string = '';
  sugerencias: Rubro[] = [];

  // 🎯 SELECCIÓN
  rubroSeleccionado?: Rubro;

  // 📦 DATA DEL SERVICE
  rubros: Rubro[] = [];

  // 🧮 APU LISTAS
  equiposList: any[] = [];
  manoObraList: any[] = [];
  materialesList: any[] = [];
  transporteList: any[] = [];

  subtotalEquipos = 0;
  subtotalManoObra = 0;
  subtotalMateriales = 0;
  subtotalTransporte = 0;
  totalDirecto = 0;

  constructor(private rubrosService: RubrosService) {}

  ngOnInit(): void {
    this.rubros = this.rubrosService.getRubros();
  }

  // =========================
  // 🔍 AUTOCOMPLETE
  // =========================
  filtrarRubros(): void {
    const texto = this.codigoBusqueda.toLowerCase();

    if (!texto) {
      this.sugerencias = [];
      return;
    }

    this.sugerencias = this.rubros.filter(r =>
      r.codigo.toLowerCase().includes(texto) ||
      r.descripcion.toLowerCase().includes(texto)
    );
  }

  // =========================
  // 🎯 SELECCIONAR RUBRO
  // =========================
  seleccionarRubro(r: Rubro): void {
    this.rubroSeleccionado = r;
    this.codigoBusqueda = `${r.codigo} - ${r.descripcion}`;
    this.sugerencias = [];

    this.reiniciarCalculo();
  }

  // =========================
  // 🧮 CALCULOS
  // =========================
  calcularTodo(): void {

    this.subtotalEquipos = 0;
    this.equiposList.forEach(e => {
      e.costoHora = (e.cantidad || 0) * (e.tarifa || 0);
      e.costo = e.costoHora * (e.rendimiento || 0);
      this.subtotalEquipos += e.costo;
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
  // 🔄 RESET
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
  // ➕ AGREGAR FILAS
  // =========================
  agregarEquipo() { this.equiposList.push({ descripcion:'', cantidad:0, tarifa:0, rendimiento:1 }); }
  agregarManoObra() { this.manoObraList.push({ descripcion:'', cantidad:0, tarifa:0, rendimiento:1 }); }
  agregarMaterial() { this.materialesList.push({ descripcion:'', unidad:'', cantidad:0, tarifa:0 }); }
  agregarTransporte() { this.transporteList.push({ descripcion:'', cantidad:0, tarifa:0 }); }
}