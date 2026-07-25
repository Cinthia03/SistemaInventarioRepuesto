import { Component, OnInit } from '@angular/core';
import { RubrosInstalacionesElectricasService, RubroInstalacionesElectricas  } from '../../core/services/rubros-instalaciones-electricas.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: 'app-sistema-instalaciones-electricas',
  imports: [
      CommonModule,
      FormsModule,
      MatIconModule
  ],
  templateUrl: './sistema-instalaciones-electricas.html',
  styleUrl: '../rubros.css'
})
export class SistemaInstalacionesElectricas implements OnInit {

  rubros: RubroInstalacionesElectricas[] = [];
  categorias: string[] = [];
  categoriaSeleccionada: string = '';

  constructor(private RubrosInstalacionesElectricasService: RubrosInstalacionesElectricasService) {}

  ngOnInit(): void {
    this.rubros = this.RubrosInstalacionesElectricasService.getRubros();
    this.categorias = this.RubrosInstalacionesElectricasService.getCategorias();
  }

  filtrarPorCategoria(): void {
    if (this.categoriaSeleccionada === '') {
      this.rubros = this.RubrosInstalacionesElectricasService.getRubros();
    } else {
      this.rubros = this.RubrosInstalacionesElectricasService.getRubrosPorCategoria(this.categoriaSeleccionada);
    }
  }

  obtenerPorCategoria(cat: string): RubroInstalacionesElectricas[] {
    return this.RubrosInstalacionesElectricasService.getRubrosPorCategoria(cat);
  }
}


