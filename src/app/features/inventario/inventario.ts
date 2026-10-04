import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../core/services/supabase.service';
import { AsistenteInventarioComponent } from '../../shared/components/asistente-inventario/asistente-inventario';

@Component({
  selector: 'app-categorias-inventario',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    AsistenteInventarioComponent
  ],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class InventarioComponent implements OnInit {

  // TOTALES
  totalMateriales = 0;
  totalTrabajadores = 0;
  totalEquipos = 0;
  totalRegistros = 0;

  // KPIS
  porcentajeOptimo = 0;
  itemsStockBajo = 0;
  actualizadosHoy = 0;

  // MATERIALES
  stockMateriales = 0;
  valorTotalMateriales = 0;
  stockBajoMateriales = 0;

  // MANO DE OBRA
  porcentajeActivo = 0;
  tarifaPromedio = 0;
  categoriasMano = 0;

  // EQUIPOS
  disponibilidadEquipos = 0;
  tarifaEquipos = 0;
  equiposMantenimiento = 0;

  // PAGINAS
  paginaActualAct = 1;
  itemsPorPaginaAct = 5;

  paginaActualAle = 1;
  itemsPorPaginaAle = 5;

  // OTROS
  cargando = true;
  fechaActual = new Date();
  actividadReciente: any[] = [];
  alertasStock: any[] = [];

  constructor(
    private router: Router,
    private cd: ChangeDetectorRef,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  async cargarDashboard(): Promise<void> {

    this.cargando = true;

    try {

      const { data: materiales } =
        await this.supabaseService.supabase
          .from('materiales')
          .select('*');

      const { data: manoObra } =
        await this.supabaseService.supabase
          .from('mano_obra')
          .select('*');

      const { data: equipos } =
        await this.supabaseService.supabase
          .from('equipos')
          .select('*');

      const listaMateriales = materiales ?? [];
      const listaManoObra = manoObra ?? [];
      const listaEquipos = equipos ?? [];

      // ======================
      // TOTALES
      // ======================

      this.totalMateriales = listaMateriales.length;
      this.totalTrabajadores = listaManoObra.length;
      this.totalEquipos = listaEquipos.length;

      this.totalRegistros =
        this.totalMateriales +
        this.totalTrabajadores +
        this.totalEquipos;

      // ======================
      // KPIs MATERIALES
      // ======================

      this.valorTotalMateriales = listaMateriales.reduce(
        (sum, m) =>
          sum +
          (Number(m.stock || 0) * Number(m.precio || 0)),
        0
      );

      this.stockBajoMateriales = listaMateriales.filter(
        m => Number(m.stock || 0) < 10
      ).length;

      // % de materiales con stock en nivel saludable (no es una suma de
      // cantidades: antes mostraba valores como "36082%", algo sin sentido
      // como porcentaje).
      this.stockMateriales = this.totalMateriales > 0
        ? Math.round(
            ((this.totalMateriales - this.stockBajoMateriales) /
              this.totalMateriales) *
              100
          )
        : 0;

      // ======================
      // KPIs MANO DE OBRA
      // ======================

      this.porcentajeActivo =
        listaManoObra.length > 0 ? 100 : 0;

      this.tarifaPromedio =
        listaManoObra.length > 0
          ? listaManoObra.reduce(
              (sum, m) => sum + Number(m.precio || 0),
              0
            ) / listaManoObra.length
          : 0;

      this.categoriasMano = listaManoObra.length;

      // ======================
      // KPIs EQUIPOS
      // ======================

      this.disponibilidadEquipos =
        listaEquipos.length > 0 ? 100 : 0;

      this.tarifaEquipos =
        listaEquipos.length > 0
          ? listaEquipos.reduce(
              (sum, e) => sum + Number(e.precio || 0),
              0
            ) / listaEquipos.length
          : 0;

      this.equiposMantenimiento = 0;

      // ======================
      // KPIs GLOBALES
      // ======================

      this.itemsStockBajo = this.stockBajoMateriales;

      this.porcentajeOptimo =
        this.totalMateriales > 0
          ? Math.round(
              ((this.totalMateriales -
                this.stockBajoMateriales) /
                this.totalMateriales) *
                100
            )
          : 0;

      this.actualizadosHoy =
        listaMateriales.length +
        listaManoObra.length +
        listaEquipos.length;

      // ======================
      // ACTIVIDAD RECIENTE
      // ======================

      this.actividadReciente = [
        ...listaMateriales.slice(0, 5).map(m => ({
          modulo: 'materiales',
          moduloLabel: 'Materiales',
          nombre: m.descripcion,
          codigo: m.codigo,
          accion: 'Registrado',
          tiempo: 'Reciente'
        })),
        ...listaManoObra.slice(0, 5).map(m => ({
          modulo: 'mano',
          moduloLabel: 'Mano de Obra',
          nombre: m.descripcion,
          codigo: m.codigo,
          accion: 'Registrado',
          tiempo: 'Reciente'
        })),
        ...listaEquipos.slice(0, 5).map(e => ({
          modulo: 'equipos',
          moduloLabel: 'Equipos',
          nombre: e.descripcion,
          codigo: e.codigo,
          accion: 'Registrado',
          tiempo: 'Reciente'
        }))
      ];

      // ======================
      // ALERTAS STOCK
      // ======================

      this.alertasStock = listaMateriales
        .filter(m => Number(m.stock || 0) < 10)
        .map(m => ({
          codigo: m.codigo,
          nombre: m.descripcion,
          modulo: 'Materiales',
          stock: m.stock,
          icono: Number(m.stock || 0) < 5 ? 'error' : 'warning_amber',
          nivel: Number(m.stock || 0) < 5 ? 'critico' : 'bajo'
        }));

    } catch (err) {

      console.error(
        'Error cargando dashboard:',
        err
      );

    } finally {

      this.cargando = false;
      this.cd.detectChanges();

    }
  }

  // ======================
  // PAGINACION ACTIVIDAD
  // ======================

  totalPaginasAct(): number {
    return Math.ceil(
      this.actividadReciente.length /
      this.itemsPorPaginaAct
    ) || 1;
  }

  obtenerActividadPaginada(): any[] {

    const inicio =
      (this.paginaActualAct - 1) *
      this.itemsPorPaginaAct;

    const fin =
      inicio +
      this.itemsPorPaginaAct;

    return this.actividadReciente.slice(
      inicio,
      fin
    );
  }

  // ======================
  // PAGINACION ALERTAS
  // ======================

  totalPaginasAle(): number {
    return Math.ceil(
      this.alertasStock.length /
      this.itemsPorPaginaAle
    ) || 1;
  }

  obtenerAlertasPaginated(): any[] {

    const inicio =
      (this.paginaActualAle - 1) *
      this.itemsPorPaginaAle;

    const fin =
      inicio +
      this.itemsPorPaginaAle;

    return this.alertasStock.slice(
      inicio,
      fin
    );
  }

  // ======================
  // NAVEGACION
  // ======================

  abrirCategoriaMateriales() {
    this.router.navigate(['/materiales'])
      .catch(err =>
        console.error('Error navegación:', err)
      );
  }

  abrirCategoriaManObra() {
    this.router.navigate(['/mano-de-obra'])
      .catch(err =>
        console.error('Error navegación:', err)
      );
  }

  abrirCategoriaEquipos() {
    this.router.navigate(['/equipos'])
      .catch(err =>
        console.error('Error navegación:', err)
      );
  }

  abrirModelosPredictivos() {
    this.router.navigate(['/modelos-predictivos'])
      .catch(err =>
        console.error('Error navegación:', err)
      );
  }
}