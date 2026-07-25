import { Component, OnInit } from '@angular/core';
import { RubroAcabado, RubrosObraAcabadosService } from '../../core/services/rubros-obra-acabados.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: 'app-obra-de-acabados',
  imports: [
      CommonModule,
      FormsModule,
      MatIconModule
  ],
  templateUrl: './obra-de-acabados.html',
  styleUrl: '../rubros.css'
})
export class ObraDeAcabados implements OnInit {

  rubros: RubroAcabado[] = [];
  categorias: string[] = [];
  categoriaSeleccionada: string = '';

  constructor(private RubrosObraAcabadosService: RubrosObraAcabadosService) {}

  ngOnInit(): void {
    this.rubros = this.RubrosObraAcabadosService.getRubros();
    this.categorias = this.RubrosObraAcabadosService.getCategorias();
  }

  filtrarPorCategoria(): void {
    if (this.categoriaSeleccionada === '') {
      this.rubros = this.RubrosObraAcabadosService.getRubros();
    } else {
      this.rubros = this.RubrosObraAcabadosService.getRubrosPorCategoria(this.categoriaSeleccionada);
    }
  }

  obtenerPorCategoria(cat: string): RubroAcabado[] {
    return this.RubrosObraAcabadosService.getRubrosPorCategoria(cat);
  }
}


