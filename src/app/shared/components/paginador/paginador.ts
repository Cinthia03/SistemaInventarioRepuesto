import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Paginacion } from './paginacion';

/**
 * Barra de paginación común para todas las tablas del sistema.
 *   <app-paginador [p]="pag" [total]="filas.length" />
 */
@Component({
  selector: 'app-paginador',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './paginador.html',
  styleUrls: ['./paginador.css']
})
export class PaginadorComponent {
  @Input({ required: true }) p!: Paginacion;
  @Input({ required: true }) total = 0;
  /** Texto para los registros (p. ej. "rubros", "usuarios"). */
  @Input() etiqueta = 'registros';

  get paginas(): number {
    return this.p.totalPaginas(this.total);
  }

  get actual(): number {
    return Math.min(Math.max(1, this.p.pagina), this.paginas);
  }

  get desde(): number {
    return this.total === 0 ? 0 : (this.actual - 1) * this.p.tamano + 1;
  }

  get hasta(): number {
    return Math.min(this.actual * this.p.tamano, this.total);
  }

  /** Números de página visibles (con "…" cuando hay muchas). */
  get botones(): (number | null)[] {
    const n = this.paginas;
    const a = this.actual;
    if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
    const set = new Set([1, n, a - 1, a, a + 1]);
    if (a <= 3) [2, 3, 4].forEach(x => set.add(x));
    if (a >= n - 2) [n - 3, n - 2, n - 1].forEach(x => set.add(x));
    const lista = [...set].filter(x => x >= 1 && x <= n).sort((x, y) => x - y);
    const salida: (number | null)[] = [];
    lista.forEach((x, i) => {
      if (i > 0 && x - lista[i - 1] > 1) salida.push(null);
      salida.push(x);
    });
    return salida;
  }

  ir(pagina: number) {
    this.p.pagina = Math.min(Math.max(1, pagina), this.paginas);
  }

  cambiarTamano(valor: string) {
    const primero = this.desde;
    this.p.tamano = Number(valor);
    // Mantiene a la vista el primer registro que se estaba mirando
    this.p.pagina = Math.max(1, Math.ceil(primero / this.p.tamano));
  }
}
