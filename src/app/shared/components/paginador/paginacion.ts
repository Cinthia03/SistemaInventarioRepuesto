/**
 * Estado de paginación de una tabla (lado cliente).
 *
 * Uso en un componente:
 *   readonly pag = new Paginacion();            // 10 filas por página
 *   @for (fila of pag.aplicar(filas); track ...) // filas de la página actual
 *   <app-paginador [p]="pag" [total]="filas.length" />
 *
 * Si el filtro deja menos páginas que la página actual, `aplicar` la ajusta sola.
 */
export class Paginacion {
  pagina = 1;

  // Memoria del último cálculo: devolver el mismo arreglo evita que *ngFor
  // vea un arreglo "nuevo" en cada ciclo de detección de cambios.
  private ultima?: { lista: readonly unknown[]; largo: number; pagina: number; tamano: number; res: unknown[] };
  private ultimaAgrupada?: { grupos: readonly unknown[]; pagina: number; tamano: number; res: unknown[] };

  constructor(public tamano = 10, readonly opciones: number[] = [10, 25, 50, 100]) {
    if (!this.opciones.includes(tamano)) this.opciones = [...this.opciones, tamano].sort((a, b) => a - b);
  }

  totalPaginas(total: number): number {
    return Math.max(1, Math.ceil(total / this.tamano));
  }

  /** Devuelve solo las filas de la página actual. */
  aplicar<T>(lista: readonly T[]): T[] {
    const paginas = this.totalPaginas(lista.length);
    if (this.pagina > paginas) this.pagina = paginas;
    if (this.pagina < 1) this.pagina = 1;
    const u = this.ultima;
    if (u && u.lista === lista && u.largo === lista.length && u.pagina === this.pagina && u.tamano === this.tamano) {
      return u.res as T[];
    }
    const inicio = (this.pagina - 1) * this.tamano;
    const res = lista.slice(inicio, inicio + this.tamano);
    this.ultima = { lista, largo: lista.length, pagina: this.pagina, tamano: this.tamano, res };
    return res;
  }

  /**
   * Pagina una lista agrupada (p. ej. rubros por subcategoría) contando filas,
   * no grupos: los grupos se recortan y se conservan en orden.
   */
  aplicarAgrupado<G, T>(grupos: readonly G[], filas: (g: G) => T[], armar: (g: G, filas: T[]) => G): G[] {
    const u = this.ultimaAgrupada;
    if (u && u.grupos === grupos && u.pagina === this.pagina && u.tamano === this.tamano) return u.res as G[];

    const planas = grupos.flatMap(g => filas(g).map(f => ({ g, f })));
    const pagina = this.aplicar(planas);
    const resultado: G[] = [];
    let actual: { g: G; filas: T[] } | null = null;
    for (const { g, f } of pagina) {
      if (!actual || actual.g !== g) {
        if (actual) resultado.push(armar(actual.g, actual.filas));
        actual = { g, filas: [] };
      }
      actual.filas.push(f);
    }
    if (actual) resultado.push(armar(actual.g, actual.filas));
    this.ultimaAgrupada = { grupos, pagina: this.pagina, tamano: this.tamano, res: resultado };
    return resultado;
  }

  /** Vuelve a la primera página (al cambiar un filtro). */
  reiniciar(): void {
    this.pagina = 1;
  }
}
