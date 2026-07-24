import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApuService, ApuGuardado } from '../../../core/services/apu.service';

interface GrupoProyecto {
  proyecto: string;
  items: ApuGuardado[];
  totalProyecto: number;
}

@Component({
  selector: 'app-calculos-generados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculos-generados.html',
  styleUrl: './calculos-generados.css',
})
export class CalculosGenerados implements OnInit {

  apusGuardados: ApuGuardado[] = [];
  apusFiltrados: ApuGuardado[] = [];
  gruposProyecto: GrupoProyecto[] = [];

  cargando = false;
  mensajeError = '';
  mensajeExito = '';

  // FILTROS
  filtroProyecto: string = '';
  filtroRubro: string = '';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';

  // MODAL DETALLE
  apuSeleccionado?: ApuGuardado;
  mostrarModal = false;

  constructor(
    private apuService: ApuService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarApusGuardados();
  }

  volverACalculo(): void {
    this.router.navigate(['/calculo-apu-component']);
  }

  cargarApusGuardados(): void {
    this.cargando = true;
    this.apuService.obtenerTodos().subscribe({
      next: ({ data, error }) => {
        this.cargando = false;
        if (error) {
          console.error('Error al cargar APUs:', error);
          this.mensajeError = 'No se pudieron cargar los cálculos guardados.';
          setTimeout(() => this.mensajeError = '', 3000);
          return;
        }
        this.apusGuardados = (data || []).sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        this.aplicarFiltros();
      },
      error: (err: any) => {
        this.cargando = false;
        console.error('Error al cargar APUs:', err);
        this.mensajeError = 'No se pudieron cargar los cálculos guardados.';
        setTimeout(() => this.mensajeError = '', 3000);
      }
    });
  }

  aplicarFiltros(): void {
    const proyecto = this.filtroProyecto.trim().toLowerCase();
    const rubro = this.filtroRubro.trim().toLowerCase();
    const inicio = this.filtroFechaInicio ? new Date(this.filtroFechaInicio) : null;
    const fin = this.filtroFechaFin ? new Date(this.filtroFechaFin) : null;
    if (fin) fin.setHours(23, 59, 59, 999);

    this.apusFiltrados = this.apusGuardados.filter(apu => {
      const coincideProyecto = !proyecto || (apu.proyecto || '').toLowerCase().includes(proyecto);
      const coincideRubro = !rubro ||
        apu.rubro_codigo.toLowerCase().includes(rubro) ||
        apu.rubro_descripcion.toLowerCase().includes(rubro);

      const fechaApu = new Date(apu.fecha);
      const coincideInicio = !inicio || fechaApu >= inicio;
      const coincideFin = !fin || fechaApu <= fin;

      return coincideProyecto && coincideRubro && coincideInicio && coincideFin;
    });

    this.agruparPorProyecto();
  }

  limpiarFiltros(): void {
    this.filtroProyecto = '';
    this.filtroRubro = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.aplicarFiltros();
  }

  private agruparPorProyecto(): void {
    const mapa = new Map<string, ApuGuardado[]>();

    this.apusFiltrados.forEach(apu => {
      const clave = apu.proyecto?.trim() || 'Sin proyecto asignado';
      if (!mapa.has(clave)) {
        mapa.set(clave, []);
      }
      mapa.get(clave)!.push(apu);
    });

    this.gruposProyecto = Array.from(mapa.entries()).map(([proyecto, items]) => ({
      proyecto,
      items,
      totalProyecto: items.reduce((sum, i) => sum + (i.total_directo || 0), 0)
    }));
  }

  eliminarApu(id: number): void {
    if (!confirm('¿Está seguro de eliminar este cálculo guardado? Esta acción no se puede deshacer.')) {
      return;
    }
    this.apuService.eliminar(id).subscribe({
      next: () => {
        this.mensajeExito = '✅ Cálculo eliminado correctamente.';
        setTimeout(() => this.mensajeExito = '', 3000);
        this.cargarApusGuardados();
      },
      error: (err) => {
        this.mensajeError = 'Error al eliminar el cálculo.';
        setTimeout(() => this.mensajeError = '', 3000);
        console.error('Error al eliminar:', err);
      }
    });
  }

  abrirModal(apu: ApuGuardado): void {
    this.apuSeleccionado = {
      ...apu,
      detalle_equipos: typeof apu.detalle_equipos === 'string'
        ? JSON.parse(apu.detalle_equipos) : apu.detalle_equipos,
      detalle_mano_obra: typeof apu.detalle_mano_obra === 'string'
        ? JSON.parse(apu.detalle_mano_obra) : apu.detalle_mano_obra,
      detalle_materiales: typeof apu.detalle_materiales === 'string'
        ? JSON.parse(apu.detalle_materiales) : apu.detalle_materiales,
      detalle_transporte: typeof apu.detalle_transporte === 'string'
        ? JSON.parse(apu.detalle_transporte) : apu.detalle_transporte,
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.apuSeleccionado = undefined;
  }
}