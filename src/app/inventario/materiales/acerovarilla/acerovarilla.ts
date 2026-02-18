import { Component, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router, ActivatedRoute } from '@angular/router';
import { MaterialeService, Material } from '../materiales.service';

@Component({
  selector: 'app-acerovarilla',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './acerovarilla.html',
  styleUrls: ['./acerovarilla.css'],
})
export class Acerovarilla implements AfterViewInit {
  displayedColumns: string[] = ['codigo', 'descripcion', 'unidad', 'precio', 'stock', 'acciones'];
  dataSource = new MatTableDataSource<Material>();
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private service: MaterialeService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef  // ← NUEVO
  ) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      console.log('✅ Paginador y sort asignados');
      
      this.cargarMateriales(); 
    }, 100);
  }

  cargarMateriales() {
    this.service.obtenerTodos().subscribe({
      next: (todosMateriales) => {
        const soloAceroVarillas = todosMateriales.filter(m => 
          m.categoria && m.categoria.toLowerCase().includes('acero') ||
          m.categoria.toLowerCase().includes('varilla')
        );
        
        console.log('🎯 Solo AceroVarillas:', soloAceroVarillas.length);
        this.dataSource.data = soloAceroVarillas;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltro(event: Event) {
    const filtro = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filtro.trim().toLowerCase();
  }

  editar(element: Material) {
    const paginaActual = this.paginator?.pageIndex || 0;
    this.router.navigate(['/materiales/editar', element.id], { 
      queryParams: { page: paginaActual } 
    });
  }

  eliminar(id: number) {
    this.service.eliminar(id).subscribe({
      next: () => this.cargarMateriales(),
      error: (err) => console.error('Error eliminando:', err)
    });
  }
}
