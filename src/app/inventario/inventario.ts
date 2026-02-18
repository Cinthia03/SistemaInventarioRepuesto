import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'

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
export class InventarioComponent {

  constructor(private router: Router) {}

  abrirCategoriaMateriales() {
    this.router.navigate(['/materiales']);
  }

  abrirCategoriaManObra() {
    this.router.navigate(['/mano-de-obra']);
  }

  abrirCategoriaEquipos() {
    this.router.navigate(['/equipos']);
  }

}

