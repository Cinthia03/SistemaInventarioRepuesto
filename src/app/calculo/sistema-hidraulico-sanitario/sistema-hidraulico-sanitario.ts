import { Component, OnInit } from '@angular/core';
import { RubrosHidraulicoService, RubroHidraulico } from '../../core/services/rubros-hidraulico.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: 'app-sistema-hidraulico-sanitario',
  imports: [
      CommonModule,
      FormsModule,
      MatIconModule
  ],
  templateUrl: './sistema-hidraulico-sanitario.html',
  styleUrl: '../rubros.css'
})
export class SistemaHidraulicoSanitario implements OnInit {

  rubros: RubroHidraulico[] = [];
  categorias: string[] = [];
  categoriaSeleccionada: string = '';

  constructor(private RubrosHidraulicoService: RubrosHidraulicoService) {}

  ngOnInit(): void {
    this.rubros = this.RubrosHidraulicoService.getRubros();
    this.categorias = this.RubrosHidraulicoService.getCategorias();
  }

  filtrarPorCategoria(): void {
    if (this.categoriaSeleccionada === '') {
      this.rubros = this.RubrosHidraulicoService.getRubros();
    } else {
      this.rubros = this.RubrosHidraulicoService.getRubrosPorCategoria(this.categoriaSeleccionada);
    }
  }

  obtenerPorCategoria(cat: string): RubroHidraulico[] {
    return this.RubrosHidraulicoService.getRubrosPorCategoria(cat);
  }
}


