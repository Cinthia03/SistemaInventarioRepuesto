import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})

export class InicioComponent {

  constructor(private router: Router) {}

  irInventario() {
    this.router.navigate(['/inventario']);
  }

  irCalculo() {
    this.router.navigate(['/calculo']);
  }

  irPresupuesto() {
    this.router.navigate(['/presupuesto']);
  }
}

