import { Component, OnInit } from '@angular/core';
import { Rubro, RubrosObraGrisService } from '../../core/services/rubros-obra-gris.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: 'app-obra-gris',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule
],
  templateUrl: './obra-gris.html',
  styleUrl: '../rubros.css'
})
export class ObraGris implements OnInit {

  rubros: Rubro[] = [];
  categorias: string[] = [];
  categoriaSeleccionada: string = '';

  constructor(private RubrosObraGrisService: RubrosObraGrisService) {}

  ngOnInit(): void {
    this.rubros = this.RubrosObraGrisService.getRubros();
    this.categorias = this.RubrosObraGrisService.getCategorias();
  }

  filtrarPorCategoria(): void {
    if (this.categoriaSeleccionada === '') {
      this.rubros = this.RubrosObraGrisService.getRubros();
    } else {
      this.rubros = this.RubrosObraGrisService.getRubrosPorCategoria(this.categoriaSeleccionada);
    }
  }

  obtenerPorCategoria(cat: string): Rubro[] {
    return this.RubrosObraGrisService.getRubrosPorCategoria(cat);
  }
}