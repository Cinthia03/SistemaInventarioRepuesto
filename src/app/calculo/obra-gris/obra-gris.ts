import { Component, OnInit } from '@angular/core';
import { Rubro, RubrosService } from '../../services/RubrosService';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-obra-gris',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './obra-gris.html',
  styleUrl: './obra-gris.css'
})
export class ObraGris implements OnInit {

  rubros: Rubro[] = [];
  categorias: string[] = [];
  categoriaSeleccionada: string = '';

  constructor(private rubrosService: RubrosService) {}

  ngOnInit(): void {
    this.rubros = this.rubrosService.getRubros();
    this.categorias = this.rubrosService.getCategorias();
  }

  filtrarPorCategoria(): void {
    if (this.categoriaSeleccionada === '') {
      this.rubros = this.rubrosService.getRubros();
    } else {
      this.rubros = this.rubrosService.getRubrosPorCategoria(this.categoriaSeleccionada);
    }
  }

  obtenerPorCategoria(cat: string): Rubro[] {
    return this.rubrosService.getRubrosPorCategoria(cat);
  }
}