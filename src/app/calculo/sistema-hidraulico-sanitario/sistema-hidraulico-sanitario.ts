import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { Rubro, RubrosHidraulicoService } from '../../core/services/rubros-hidraulico.service';

interface GrupoSubcategoria {
  subcategoria: string;
  rubros: Rubro[];
}

@Component({
  selector: 'app-sistema-hidraulico-sanitario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule
  ],
  templateUrl: './sistema-hidraulico-sanitario.html',
  styleUrl: '../rubros.css'
})
export class SistemaHidraulicoSanitario implements OnInit {

  todosLosRubros: Rubro[] = [];
  rubrosMostrados: Rubro[] = [];
  subcategorias: string[] = [];
  gruposPorSubcategoria: GrupoSubcategoria[] = [];
  subcategoriaSeleccionada: string = '';
  cargando: boolean = false;

  constructor(private rubrosHidraulicoService: RubrosHidraulicoService, private router: Router) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;

    forkJoin({
      subcategorias: this.rubrosHidraulicoService.getSubcategoriasHidraulico(),
      rubros: this.rubrosHidraulicoService.getRubrosHidraulico()
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
        console.error('Error al cargar datos de Sistema Hidráulico-Sanitario:', err);
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

    this.router.navigate(['/calculo-apu-component', 'sistema-hidraulico-sanitario'], {
      queryParams: {
        rubroId: rubro.id
      }
    });
  }
}
