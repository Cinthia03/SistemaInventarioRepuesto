import { Component } from '@angular/core'
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { esSoloLectura } from '../../../core/services/rol';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent {
  constructor(private router: Router) {}

  /** Muestra la etiqueta "Solo lectura" cuando el usuario es de consulta. */
  get soloLectura(): boolean {
    return esSoloLectura();
  }

  irInicio() {
    this.router.navigate(['/inicio']);
  }

  irLogin(){
    localStorage.removeItem('rol');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}
