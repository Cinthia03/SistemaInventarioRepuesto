import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: 'app-calculo',
  imports: [MatIconModule],
  templateUrl: './calculo.html',
  styleUrl: './calculo.css',
})
export class Calculo {
  
  constructor(private router: Router) {}

  AbrirObraGris() {
    this.router.navigate(['/obra-gris']);
  }

  AbrirObrasAcabados() {
    this.router.navigate(['/obra-de-acabados']);
  }

  AbrirSistemaHidraulicoSanitario() {
    this.router.navigate(['/sistema-hidraulico-sanitario']);
  }

  AbrirSistemaInstalacionesElectricas() {
    this.router.navigate(['/sistema-instalaciones-electricas']);
  }

  Calcular() {
    this.router.navigate(['/calculo-apu-component']);
  }

}
