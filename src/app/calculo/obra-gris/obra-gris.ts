import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from "@angular/material/icon";
import { forkJoin } from 'rxjs';
import { Rubro, RubrosObraGrisService } from '../../core/services/rubros-obra-gris.service';
import { ApuService } from '../../core/services/apu.service';
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

  constructor(
    private rubrosObraGrisService: RubrosObraGrisService,
    private apuService: ApuService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

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
        this.cdr.detectChanges(); // fuerza el repintado: los datos de Supabase llegan fuera de la zona de Angular
      },
      error: (err) => {
        console.error('Error al cargar datos de Obra Gris:', err);
        this.cargando = false;
        this.cdr.detectChanges();
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

    this.router.navigate(['/calculo-apu-component', 'obra-gris'], {
      queryParams: {
        rubroId: rubro.id
      }
    });
  }

  eliminarRubro(rubro: Rubro, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!confirm(`¿Eliminar el rubro "${rubro.codigo} - ${rubro.descripcion}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.apuService.eliminar(rubro.id, 'rubros').subscribe({
      next: () => {
        this.todosLosRubros = this.todosLosRubros.filter(r => r.id !== rubro.id);
        this.rubrosMostrados = this.rubrosMostrados.filter(r => r.id !== rubro.id);
        this.armarGrupos((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al eliminar el rubro:', err);
        this.cdr.detectChanges();
      }
    });
  }
}