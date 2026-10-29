import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { usuarioActual } from '../../core/services/rol';

@Component({
  selector: 'app-no-encontrado',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './no-encontrado.html',
  styleUrls: ['./no-encontrado.css']
})
export class NoEncontradoComponent {
  private readonly location = inject(Location);
  readonly ruta = inject(Router).url;
  readonly conSesion = !!usuarioActual();

  volver() {
    this.location.back();
  }
}
