import { ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { HttpClient } from '@angular/common/http'
import { forkJoin } from 'rxjs'

@Component({
  selector: 'app-categorias-inventario',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class InventarioComponent implements OnInit {

  totalMateriales = 0
  totalTrabajadores = 0
  totalEquipos = 0

  cargando = true

  constructor(
    private router: Router,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarTotales()
  }

  cargarTotales(): void {
    this.cargando = true

    forkJoin({
      materiales: this.http.get<any>('http://localhost:3000/total-materiales'),
      trabajadores: this.http.get<any>('http://localhost:3000/total-trabajadores'),
      equipos: this.http.get<any>('http://localhost:3000/total-equipos')
    }).subscribe({
      next: (res) => {
        this.totalMateriales   = res.materiales?.total ?? 0
        this.totalTrabajadores = res.trabajadores?.total ?? 0
        this.totalEquipos      = res.equipos?.total ?? 0

        this.cargando = false

        // 👇 fuerza actualización del DOM (evita quedarse en 0)
        this.cd.detectChanges()
      },
      error: (err) => {
        console.error('Error cargando totales:', err)
        this.cargando = false
      }
    })
  }

  abrirCategoriaMateriales() {
    this.router.navigate(['/materiales'])
      .catch(err => console.error('Error navegación:', err))
  }

  abrirCategoriaManObra() {
    this.router.navigate(['/mano-de-obra'])
      .catch(err => console.error('Error navegación:', err))
  }

  abrirCategoriaEquipos() {
    this.router.navigate(['/equipos'])
      .catch(err => console.error('Error navegación:', err))
  }
}