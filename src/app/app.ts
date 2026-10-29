import { Component, inject, signal } from '@angular/core';
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

  /** En el login y en la página 404 no se muestran el menú ni el pie. */
  readonly enLogin = signal(typeof location === 'undefined' || this.esLogin(location.pathname));

  constructor() {
    // Usuario de solo consulta: se marca el <body> para ocultar (styles.css) los botones
    // de crear / editar / eliminar en todos los módulos.
    this.aplicarModoLectura();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => {
        this.aplicarModoLectura();
        const url = (e as NavigationEnd).urlAfterRedirects;
        this.enLogin.set(this.esLogin(url) || this.rutaSinMarco());
      });
  }

  /** true si la ruta activa declara data: { sinMarco: true } (p. ej. la página 404). */
  private rutaSinMarco(): boolean {
    let r = this.router.routerState.snapshot.root;
    while (r.firstChild) r = r.firstChild;
    return !!r.data?.['sinMarco'];
  }

  private esLogin(url: string): boolean {
    return url === '/' || url === '' || url.startsWith('/login');
  }

  private aplicarModoLectura(): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('modo-solo-lectura', esSoloLectura());
  }
}
