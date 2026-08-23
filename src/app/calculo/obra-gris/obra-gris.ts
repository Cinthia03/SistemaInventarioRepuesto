import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from "@angular/material/icon";
import { forkJoin } from 'rxjs';
import { Rubro, RubrosObraGrisService } from '../../core/services/rubros-obra-gris.service';
import { Router } from '@angular/router';

interface GrupoSubcategoria {
  subcategoria: string;
  rubros: Rubro[];
}

@Component({
  selector: 'app-obra-gris',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './obra-gris.html',
  styleUrl: '../rubros.css'
})
export class ObraGris implements OnInit {

  todosLosRubros: Rubro[] = [];
  rubrosMostrados: Rubro[] = [];
  subcategorias: string[] = [];
  gruposPorSubcategoria: GrupoSubcategoria[] = [];
  subcategoriaSeleccionada: string = '';
  cargando: boolean = false;

  constructor(private rubrosObraGrisService: RubrosObraGrisService, private router: Router) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;

    forkJoin({
      subcategorias: this.rubrosObraGrisService.getSubcategoriasObraGris(),
      rubros: this.rubrosObraGrisService.getRubrosObraGris()
    }).subscribe({
      next: ({ subcategorias, rubros }) => {
        // Orden numérico real por código dentro de cada subcategoría
        const compararCodigo = (a: Rubro, b: Rubro) =>
          a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' });

        this.subcategorias = subcategorias;
        this.todosLosRubros = [...rubros].sort(compararCodigo);
        this.rubrosMostrados = [...this.todosLosRubros];
        this.armarGrupos(compararCodigo);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar datos de Obra Gris:', err);
        this.cargando = false;
      }
    });
  }

  private armarGrupos(compararCodigo: (a: Rubro, b: Rubro) => number): void {
    // this.subcategorias ya viene en orden numérico (el servicio las trae ordenadas por id),
    // así que solo agrupamos respetando ese orden, sin dejar que Angular las reordene alfabéticamente.
    this.gruposPorSubcategoria = this.subcategorias
      .map(nombre => ({
        subcategoria: nombre,
        rubros: this.todosLosRubros
          .filter(r => r.subcategoria_nombre === nombre)
          .sort(compararCodigo)
      }))
      .filter(grupo => grupo.rubros.length > 0);
  }

  toggleDesplegar(rubro: Rubro): void {
    rubro.desplegado = !rubro.desplegado;
  }

  filtrarPorCategoria(): void {
    this.rubrosMostrados = this.subcategoriaSeleccionada === ''
      ? [...this.todosLosRubros]
      : this.todosLosRubros.filter(r => r.subcategoria_nombre === this.subcategoriaSeleccionada);
  }

  editarRubro(rubro: Rubro, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.router.navigate(['/calculos'], {
      queryParams: {
        rubroId: rubro.id
      }
    });
  }
}