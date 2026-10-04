import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { esSoloLectura, rolActual, usuarioActual } from '../../../core/services/rol';
import { PermisosService } from '../../../core/services/permisos.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { MENU, ModuloMenu, opcionDeRuta } from '../../../core/menu/menu.config';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly auditoria = inject(AuditoriaService);
  readonly permisos = inject(PermisosService);

  /** Módulo cuyo submenú está abierto. */
  abierto: string | null = null;
  /** Menú móvil desplegado. */
  menuMovil = false;
  /** Módulo al que pertenece la pantalla actual (para resaltarlo). */
  readonly moduloActivo = signal('');

  constructor() {
    this.permisos.cargar();
    this.actualizarActivo(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => {
        this.abierto = null;
        this.menuMovil = false;
        this.actualizarActivo((e as NavigationEnd).urlAfterRedirects);
      });
  }

  get menu(): ModuloMenu[] {
    return this.permisos.menu();
  }

  get soloLectura(): boolean {
    return esSoloLectura();
  }

  get usuario(): string {
    return usuarioActual();
  }

  get rol(): string {
    return rolActual();
  }

  get inicial(): string {
    return (this.usuario || '?').charAt(0).toUpperCase();
  }

  /** Inicio es un enlace directo; los demás módulos abren su submenú. */
  esDirecto(m: ModuloMenu): boolean {
    return m.opciones.length === 1 && m.codigo === 'INICIO';
  }

  alternar(codigo: string, evento: Event) {
    evento.stopPropagation();
    this.abierto = this.abierto === codigo ? null : codigo;
  }

  @HostListener('document:click')
  cerrarMenus() {
    this.abierto = null;
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape() {
    this.abierto = null;
    this.menuMovil = false;
  }

  irInicio() {
    this.router.navigate(['/inicio']);
  }

  async irLogin() {
    await this.auditoria.registrar('SALIDA', 'SESION', 'Cierre de sesión');
    localStorage.removeItem('rol');
    localStorage.removeItem('usuario');
    this.permisos.limpiar();
    this.router.navigate(['/login']);
  }

  private actualizarActivo(url: string) {
    const modulo = MENU.find(m => m.opciones.some(o => o.codigo === opcionDeRuta(url)));
    this.moduloActivo.set(modulo?.codigo ?? '');
  }
}
