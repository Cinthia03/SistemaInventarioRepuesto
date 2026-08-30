import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { Rubro, RubrosObraAcabadosService } from '../../core/services/rubros-obra-acabados.service';

interface GrupoSubcategoria {
  subcategoria: string;
  rubros: Rubro[];
}

@Component({
  selector: 'app-obra-de-acabados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule
  ],
  templateUrl: './obra-de-acabados.html',
  styleUrl: '../rubros.css'
})
export class ObraDeAcabados implements OnInit {

  todosLosRubros: Rubro[] = [];
  rubrosMostrados: Rubro[] = [];
  subcategorias: string[] = [];
  gruposPorSubcategoria: GrupoSubcategoria[] = [];
  subcategoriaSeleccionada: string = '';
  cargando: boolean = false;

  constructor(private rubrosObraAcabadosService: RubrosObraAcabadosService, private router: Router) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;

    forkJoin({
      subcategorias: this.rubrosObraAcabadosService.getSubcategoriasAcabados(),
      rubros: this.rubrosObraAcabadosService.getRubrosAcabados()
    }).subscribe({
      next: ({ subcategorias, rubros }) => {
        const compararCodigo = (a: Rubro, b: Rubro) =>
          a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' });

        this.subcategorias = subcategorias;
        this.todosLosRubros = [...rubros].sort(compararCodigo);
        this.rubrosMostrados = [...this.todosLosRubros];
        this.armarGrupos(compararCodigo);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar datos de Obra de Acabados:', err);
        this.cargando = false;
      }
    });
  }

    private armarGrupos(compararCodigo: (a: Rubro, b: Rubro) => number): void {
      this.gruposPorSubcategoria = this.subcategorias
        .map(nombre => ({
          subcategoria: nombre,
          rubros: this.todosLosRubros
            .filter(r => r.subcategoria_nombre === nombre)
            .sort(compararCodigo)
        }))
        .filter(grupo => grupo.rubros.length > 0)
        .sort((a, b) => compararCodigo(a.rubros[0], b.rubros[0]));
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

    this.router.navigate(['/calculo-apu-component', 'obra-de-acabados'], {
      queryParams: {
        rubroId: rubro.id
      }
    });
  }
}
