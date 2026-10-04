import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from './shared/components/header/header';
import { FooterComponent } from './shared/components/footer/footer';
import { esSoloLectura } from './core/services/rol';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html'
})
export class AppComponent {
  private readonly router = inject(Router);

  constructor() {
    // Usuario de solo consulta: se marca el <body> para ocultar (styles.css) los botones
    // de crear / editar / eliminar en todos los módulos.
    this.aplicarModoLectura();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.aplicarModoLectura());
  }

  private aplicarModoLectura(): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('modo-solo-lectura', esSoloLectura());
  }
}
