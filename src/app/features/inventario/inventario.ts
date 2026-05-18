import { ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { HttpClient } from '@angular/common/http'
import { forkJoin } from 'rxjs'

@Component({
  selector: 'app-categorias-inventario',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class InventarioComponent implements OnInit {

  // TOTALES
  totalMateriales = 0
  totalTrabajadores = 0
  totalEquipos = 0
  totalRegistros = 0

  //KPIS
  porcentajeOptimo = 0
  itemsStockBajo = 0
  actualizadosHoy = 0

  // MATERIALES
  stockMateriales = 0
  valorTotalMateriales = 0
  stockBajoMateriales = 0

  // MANO DE OBRA
  porcentajeActivo = 0
  tarifaPromedio = 0
  categoriasMano = 0

  // EQUIPOS
  disponibilidadEquipos = 0
  tarifaEquipos = 0
  equiposMantenimiento = 0

  //PAGINAS
  paginaActualAct: number = 1;
  itemsPorPaginaAct: number = 5;
  paginaActualAle: number = 1;
  itemsPorPaginaAle: number = 5;

  // OTROS
  cargando = true
  fechaActual = new Date()
  actividadReciente: any[] = []
  alertasStock: any[] = []

  constructor(
    private router: Router,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDashboard()
  }

  cargarDashboard(): void {
    this.cargando = true
    forkJoin({
      // TOTALES 
      materiales:
        this.http.get<any>(
          'http://localhost:3000/total-materiales'
        ),
      trabajadores:
        this.http.get<any>(
          'http://localhost:3000/total-trabajadores'
        ),
      equipos:
        this.http.get<any>(
          'http://localhost:3000/total-equipos'
        ),

      // KPIs MATERIALES 
      materialesKpi:
        this.http.get<any>(
          'http://localhost:3000/materiales-kpi'
        ),
      manoObraKpi:
        this.http.get<any>(
          'http://localhost:3000/manoobra-kpi'
        ),
      equiposKpi:
        this.http.get<any>(
          'http://localhost:3000/equipos-kpi'
        ),

      // ACTIVIDAD 
      actividad:
        this.http.get<any[]>(
          'http://localhost:3000/actividad-reciente'
        ),

      // ALERTAS
      alertas:
        this.http.get<any[]>(
          'http://localhost:3000/alertas-stock'
        )
    }).subscribe({
      next: (res) => {
        // TOTALES
        this.totalMateriales = res.materiales?.total ?? 0
        this.totalTrabajadores = res.trabajadores?.total ?? 0
        this.totalEquipos = res.equipos?.total ?? 0
        this.totalRegistros = this.totalMateriales + this.totalTrabajadores + this.totalEquipos

        //MATERIALES
        this.stockMateriales = res.materialesKpi?.stockDisponible ?? 0
        this.valorTotalMateriales = res.materialesKpi?.valorTotal ?? 0
        this.stockBajoMateriales = res.materialesKpi?.stockBajo ?? 0

        //MANO OBRA
        this.porcentajeActivo = res.manoObraKpi?.porcentajeActivo ?? 0
        this.tarifaPromedio = res.manoObraKpi?.tarifaPromedio ?? 0
        this.categoriasMano = res.manoObraKpi?.categorias ?? 0

        // EQUIPOS
        this.disponibilidadEquipos = res.equiposKpi?.disponibilidad ?? 0
        this.tarifaEquipos = res.equiposKpi?.tarifaPromedio ?? 0
        this.equiposMantenimiento = res.equiposKpi?.mantenimiento ?? 0

        // KPIs GLOBALES
        this.porcentajeOptimo = res.materialesKpi?.stockDisponible ?? 0
        this.itemsStockBajo = res.materialesKpi?.stockBajo ?? 0
        this.actualizadosHoy = res.actividad?.length ?? 0

        // ACTIVIDAD
        this.actividadReciente = res.actividad ?? []

        // ALERTAS
        this.alertasStock = res.alertas ?? []
        this.cargando = false
        this.cd.detectChanges()
      },
      error: (err) => {
        console.error(
          'Error cargando dashboard:',
          err
        )
        this.cargando = false
      }
    })
  }

  //FUNCIONES PARA PAGINACION
  totalPaginasAct(): number {
    return Math.ceil(this.actividadReciente.length / this.itemsPorPaginaAct) || 1;
  }

  obtenerActividadPaginada(): any[] {
    const inicio = (this.paginaActualAct - 1) * this.itemsPorPaginaAct;
    const fin = inicio + this.itemsPorPaginaAct;
    return this.actividadReciente.slice(inicio, fin);
  }

  totalPaginasAle(): number {
    return Math.ceil(this.alertasStock.length / this.itemsPorPaginaAle) || 1;
  }

  obtenerAlertasPaginated(): any[] {
    const inicio = (this.paginaActualAle - 1) * this.itemsPorPaginaAle;
    const fin = inicio + this.itemsPorPaginaAle;
    return this.alertasStock.slice(inicio, fin);
  }


  // ABRIR CATEGORIAS
  abrirCategoriaMateriales() {
    this.router.navigate(['/materiales'])
      .catch(err => console.error('Error navegación:', err))
  }

  abrirCategoriaManObra() {
    this.router.navigate(['/mano-de-obra'])
      .catch(err => console.error('Error navegación:', err))
  }

  abrirCategoriaEquipos() {
    this.router.navigate(['/equipos'])
      .catch(err => console.error('Error navegación:', err))
  }
}