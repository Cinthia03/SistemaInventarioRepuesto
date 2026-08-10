import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from "@angular/material/icon";
import { Rubro, RubrosObraGrisService } from '../../core/services/rubros-obra-gris.service';

@Component({
  selector: 'app-obra-gris',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule
  ],
  templateUrl: './obra-gris.html',
  styleUrl: '../rubros.css'
})
export class ObraGris implements OnInit {

  todosLosRubros: Rubro[] = [];
  rubrosMostrados: Rubro[] = [];
  subcategorias: string[] = [];
  subcategoriaSeleccionada: string = '';
  cargando: boolean = false;

  constructor(private rubrosObraGrisService: RubrosObraGrisService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;

    // 1. Cargar subcategorías pertenecientes a Obra Gris
    this.rubrosObraGrisService.getSubcategoriasObraGris().subscribe({
      next: (subs) => {
        this.subcategorias = subs;
      },
      error: (err) => console.error('Error al obtener subcategorías:', err)
    });

    // 2. Cargar rubros y sus tablas de APU
    this.rubrosObraGrisService.getRubrosObraGris().subscribe({
      next: (rubros) => {
        this.todosLosRubros = rubros;
        this.rubrosMostrados = rubros;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al obtener rubros:', err);
        this.cargando = false;
      }
    });
  }

  toggleDesplegar(rubro: Rubro): void {
    rubro.desplegado = !rubro.desplegado;
  }

  filtrarPorCategoria(): void {
    if (this.subcategoriaSeleccionada === '') {
      this.rubrosMostrados = [...this.todosLosRubros];
    } else {
      this.rubrosMostrados = this.todosLosRubros.filter(
        r => r.subcategoria_nombre === this.subcategoriaSeleccionada
      );
    }
  }

  obtenerPorSubcategoria(subcategoriaNombre: string): Rubro[] {
    return this.todosLosRubros.filter(r => r.subcategoria_nombre === subcategoriaNombre);
  }
}