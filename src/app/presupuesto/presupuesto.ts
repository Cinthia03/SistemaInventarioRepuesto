import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';

import { Rubro, RubrosObraGrisService } from '../core/services/rubros-obra-gris.service';
import { RubrosObraAcabadosService } from '../core/services/rubros-obra-acabados.service';
import { RubrosHidraulicoService } from '../core/services/rubros-hidraulico.service';
import { RubrosInstalacionesElectricasService } from '../core/services/rubros-instalaciones-electricas.service';
import { PresupuestosService } from '../core/services/presupuestos.service';
import type {
  PresupuestoItemGuardado,
  PresupuestoResumen,
  PresupuestoDetalle,
} from '../core/services/presupuestos.service';

/**
 * Un rubro dentro del presupuesto.
 * - seleccionado: indica si el usuario decidió incluirlo en ESTE presupuesto
 *   (el presupuesto no necesariamente usa todos los rubros creados).
 * - cantidad / totalPresupuestado: cantidad presupuestada y su total (cantidad x P.U. del APU).
 */
export interface RubroPresupuesto extends Rubro {
  seleccionado: boolean;
  cantidad: number;
  totalPresupuestado: number;
}

interface GrupoSubcategoria {
  subcategoria: string;
  rubros: RubroPresupuesto[];
}

interface DefinicionCategoria {
  clave: string;       // coincide con la ruta de "Calcular APU" (app.routes.ts)
  nombre: string;
  icono: string;
  claseColor: 'obraGris' | 'acabados' | 'hidraulico' | 'electrico';
  claseBadge: string;  // clase ya existente en rubros.css para el ícono de cabecera
}

interface GrupoCategoria extends DefinicionCategoria {
  grupos: GrupoSubcategoria[];
  subtotal: number;
  expandido: boolean;
}

type VistaPresupuesto = 'nuevo' | 'historial' | 'detalle';

@Component({
  selector: 'app-presupuesto',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './presupuesto.html',
  styleUrls: ['../calculo/rubros.css', './presupuesto.css'],
})
export class Presupuesto implements OnInit {

  vista: VistaPresupuesto = 'nuevo';

  // ---- Armado de un presupuesto nuevo ----
  cargando = false;
  categoriaSeleccionada = '';
  totalGeneral = 0;
  gruposPorCategoria: GrupoCategoria[] = [];

  nombrePresupuesto = '';
  guardando = false;
  mensajeGuardado = '';

  // ---- Historial de presupuestos guardados ----
  cargandoHistorial = false;
  presupuestosGuardados: PresupuestoResumen[] = [];

  // ---- Detalle de un presupuesto guardado ----
  cargandoDetalle = false;
  presupuestoDetalle: PresupuestoDetalle | null = null;

  private readonly categoriasDefinidas: DefinicionCategoria[] = [
    { clave: 'obra-gris', nombre: 'Obra Gris', icono: 'foundation', claseColor: 'obraGris', claseBadge: 'header-interno__badge' },
    { clave: 'obra-de-acabados', nombre: 'Acabados', icono: 'format_paint', claseColor: 'acabados', claseBadge: 'header-interno__badge_acabados' },
    { clave: 'sistema-hidraulico-sanitario', nombre: 'Hidráulico', icono: 'water_drop', claseColor: 'hidraulico', claseBadge: 'header-interno__badge_hidraulico' },
    { clave: 'sistema-instalaciones-electricas', nombre: 'Eléctrico', icono: 'bolt', claseColor: 'electrico', claseBadge: 'header-interno__badge_electrico' },
  ];

  private readonly rubrosObraGrisService = inject(RubrosObraGrisService);
  private readonly rubrosAcabadosService = inject(RubrosObraAcabadosService);
  private readonly rubrosHidraulicoService = inject(RubrosHidraulicoService);
  private readonly rubrosElectricoService = inject(RubrosInstalacionesElectricasService);
  private readonly presupuestosService = inject(PresupuestosService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.cargarPresupuesto();
  }

  // ============================================================
  // NAVEGACIÓN ENTRE VISTAS
  // ============================================================

  mostrarNuevo(): void {
    this.vista = 'nuevo';
  }

  mostrarHistorial(): void {
    this.vista = 'historial';
    this.presupuestoDetalle = null;
    this.cargarHistorial();
  }

  verDetalle(id: number): void {
    this.vista = 'detalle';
    this.cargandoDetalle = true;

    this.presupuestosService.obtenerDetalle(id).subscribe({
      next: (detalle: PresupuestoDetalle) => {
        this.presupuestoDetalle = detalle;
        this.cargandoDetalle = false;
      },
      error: (err: any) => {
        console.error('Error al cargar el detalle del presupuesto:', err);
        this.cargandoDetalle = false;
      },
    });
  }

  volverAHistorial(): void {
    this.vista = 'historial';
    this.presupuestoDetalle = null;
  }

  eliminarPresupuesto(id: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!confirm('¿Eliminar este presupuesto guardado? Esta acción no se puede deshacer.')) {
      return;
    }

    this.presupuestosService.eliminarPresupuesto(id).subscribe({
      next: () => this.cargarHistorial(),
      error: (err: any) => console.error('Error al eliminar el presupuesto:', err),
    });
  }

  // ============================================================
  // CARGA DE RUBROS DISPONIBLES (armado de presupuesto nuevo)
  // ============================================================

  cargarPresupuesto(): void {
    this.cargando = true;

    forkJoin({
      obraGris: this.rubrosObraGrisService.getRubrosObraGris(),
      acabados: this.rubrosAcabadosService.getRubrosAcabados(),
      hidraulico: this.rubrosHidraulicoService.getRubrosHidraulico(),
      electrico: this.rubrosElectricoService.getRubrosElectrico(),
    }).subscribe({
      next: ({ obraGris, acabados, hidraulico, electrico }: {
        obraGris: Rubro[];
        acabados: Rubro[];
        hidraulico: Rubro[];
        electrico: Rubro[];
      }) => {
        const fuentesPorClave: Record<string, Rubro[]> = {
          'obra-gris': obraGris,
          'obra-de-acabados': acabados,
          'sistema-hidraulico-sanitario': hidraulico,
          'sistema-instalaciones-electricas': electrico,
        };

        const compararCodigo = (a: Rubro, b: Rubro) =>
          a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' });

        this.gruposPorCategoria = this.categoriasDefinidas.map(def => {
          const rubrosOrdenados: RubroPresupuesto[] = (fuentesPorClave[def.clave] || [])
            .slice()
            .sort(compararCodigo)
            .map(r => ({
              ...r,
              desplegado: false,
              // Por defecto NINGÚN rubro viene incluido: el usuario arma su presupuesto
              // eligiendo solo los rubros que necesita, no todos los que existen.
              seleccionado: false,
              cantidad: 1,
              totalPresupuestado: Number(r.costo_directo_total) || 0,
            }));

          const subcategoriasEnOrden: string[] = [];
          rubrosOrdenados.forEach(r => {
            if (!subcategoriasEnOrden.includes(r.subcategoria_nombre)) {
              subcategoriasEnOrden.push(r.subcategoria_nombre);
            }
          });

          const grupos: GrupoSubcategoria[] = subcategoriasEnOrden.map(nombre => ({
            subcategoria: nombre,
            rubros: rubrosOrdenados.filter(r => r.subcategoria_nombre === nombre),
          }));

          return {
            ...def,
            grupos,
            expandido: true,
            subtotal: 0,
          };
        });

        this.recalcularTotalGeneral();
        this.cargando = false;
      },
      error: (err: any) => {
        console.error('Error al cargar el presupuesto general:', err);
        this.cargando = false;
      },
    });
  }

  get categoriasMostradas(): GrupoCategoria[] {
    return this.categoriaSeleccionada === ''
      ? this.gruposPorCategoria
      : this.gruposPorCategoria.filter(c => c.clave === this.categoriaSeleccionada);
  }

  /** Plegar / expandir una categoría completa (Obra Gris, Acabados, Hidráulico, Eléctrico). */
  toggleCategoria(categoria: GrupoCategoria): void {
    categoria.expandido = !categoria.expandido;
  }

  /** Plegar / expandir el detalle del APU de un rubro puntual. */
  toggleDesplegar(rubro: RubroPresupuesto): void {
    rubro.desplegado = !rubro.desplegado;
  }

  /** El usuario marca/desmarca si este rubro entra o no en el presupuesto. */
  actualizarSeleccion(categoria: GrupoCategoria): void {
    this.recalcularCategoria(categoria);
  }

  /** Recalcula el total del rubro (cantidad x P.U. del APU) y burbujea los subtotales. */
  actualizarCantidad(rubro: RubroPresupuesto, categoria: GrupoCategoria): void {
    const cantidad = Number(rubro.cantidad);
    rubro.cantidad = isNaN(cantidad) || cantidad < 0 ? 0 : cantidad;
    rubro.totalPresupuestado = rubro.costo_directo_total * rubro.cantidad;
    this.recalcularCategoria(categoria);
  }

  contarSeleccionados(categoria: GrupoCategoria): number {
    return categoria.grupos
      .flatMap(g => g.rubros)
      .filter(r => r.seleccionado).length;
  }

  private recalcularCategoria(categoria: GrupoCategoria): void {
    categoria.subtotal = categoria.grupos
      .flatMap(g => g.rubros)
      .filter(r => r.seleccionado)
      .reduce((acc, r) => acc + r.totalPresupuestado, 0);

    this.recalcularTotalGeneral();
  }

  private recalcularTotalGeneral(): void {
    this.totalGeneral = this.gruposPorCategoria.reduce((acc, c) => acc + c.subtotal, 0);
  }

  editarRubro(rubro: RubroPresupuesto, categoria: GrupoCategoria, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.router.navigate(['/calculo-apu-component', categoria.clave], {
      queryParams: { rubroId: rubro.id },
    });
  }

  // ============================================================
  // GUARDAR PRESUPUESTO
  // ============================================================

  private itemsSeleccionadosParaGuardar(): PresupuestoItemGuardado[] {
    const items: PresupuestoItemGuardado[] = [];

    this.gruposPorCategoria.forEach(categoria => {
      categoria.grupos.forEach(grupo => {
        grupo.rubros
          .filter(r => r.seleccionado)
          .forEach(r => {
            items.push({
              categoria_clave: categoria.clave,
              categoria_nombre: categoria.nombre,
              subcategoria_nombre: grupo.subcategoria,
              rubro_id: r.id,
              rubro_codigo: r.codigo,
              rubro_descripcion: r.descripcion,
              unidad_medida: r.unidad_medida,
              costo_unitario: r.costo_directo_total,
              cantidad: r.cantidad,
              total: r.totalPresupuestado,
            });
          });
      });
    });

    return items;
  }

  guardarPresupuesto(): void {
    this.mensajeGuardado = '';

    if (!this.nombrePresupuesto.trim()) {
      this.mensajeGuardado = 'Ingresa un nombre para identificar este presupuesto.';
      return;
    }

    const items = this.itemsSeleccionadosParaGuardar();
    if (items.length === 0) {
      this.mensajeGuardado = 'Selecciona al menos un rubro antes de guardar.';
      return;
    }

    this.guardando = true;

    this.presupuestosService
      .guardarPresupuesto(this.nombrePresupuesto.trim(), this.totalGeneral, items)
      .subscribe({
        next: () => {
          this.guardando = false;
          this.mensajeGuardado = 'Presupuesto guardado correctamente.';
          this.nombrePresupuesto = '';
        },
        error: (err: any) => {
          console.error('Error al guardar el presupuesto:', err);
          this.guardando = false;
          this.mensajeGuardado = 'Ocurrió un error al guardar el presupuesto.';
        },
      });
  }

  // ============================================================
  // HISTORIAL
  // ============================================================

  private cargarHistorial(): void {
    this.cargandoHistorial = true;

    this.presupuestosService.listarPresupuestos().subscribe({
      next: (data: PresupuestoResumen[]) => {
        this.presupuestosGuardados = data;
        this.cargandoHistorial = false;
      },
      error: (err: any) => {
        console.error('Error al listar presupuestos guardados:', err);
        this.cargandoHistorial = false;
      },
    });
  }

  // ============================================================
  // IMPRESIÓN
  // ============================================================

  imprimir(): void {
    window.print();
  }
}