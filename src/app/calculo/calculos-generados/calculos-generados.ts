import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApuService, ApuGuardado } from '../../core/services/apu.service';
import { RubrosObraGrisService, Rubro } from '../../core/services/rubros-obra-gris.service';

interface GrupoProyecto {
  proyecto: string;
  items: ApuGuardado[];
  totalProyecto: number;
}

interface CategoriaOpcion {
  clave: string;
  nombre: string;
}

const SIN_PROYECTO = '__SIN_PROYECTO__';

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
  filtroRubroCodigo: string = '';
  filtroCategoria: string = '';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';

  // OPCIONES DINÁMICAS PARA EL COMBO DE PROYECTO
  proyectosDisponibles: string[] = [];
  readonly SIN_PROYECTO = SIN_PROYECTO;

  // CATEGORÍAS FIJAS DEL SISTEMA
  categorias: CategoriaOpcion[] = [
    { clave: 'obra-gris', nombre: 'Obra Gris' },
    { clave: 'obra-de-acabados', nombre: 'Acabados' },
    { clave: 'sistema-hidraulico-sanitario', nombre: 'Hidráulico' },
    { clave: 'sistema-instalaciones-electricas', nombre: 'Eléctrico' },
  ];

  // CATÁLOGO DE RUBROS DINÁMICO
  rubros: Rubro[] = [];

  // MODAL DETALLE
  apuSeleccionado?: ApuGuardado;
  mostrarModal = false;

  constructor(
    private apuService: ApuService,
    private RubrosObraGrisService: RubrosObraGrisService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarApusGuardados();
  }

  volverACalculo(): void {
    this.router.navigate(['/calculo']);
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
        this.construirProyectosDisponibles();
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

  // CONSTRUYE LA LISTA DE PROYECTOS ÚNICOS A PARTIR DE LOS CÁLCULOS GUARDADOS
  private construirProyectosDisponibles(): void {
    const nombres = this.apusGuardados
      .map(apu => (apu.proyecto || '').trim())
      .filter(nombre => nombre.length > 0);

    this.proyectosDisponibles = Array.from(new Set(nombres)).sort((a, b) =>
      a.localeCompare(b)
    );
  }

  // AL CAMBIAR LA CATEGORÍA: Extrae los rubros de los APUs filtrados o del servicio si aplica
  onCambiarCategoria(): void {
    this.filtroRubroCodigo = '';
    this.rubros = [];

    if (this.filtroCategoria) {
      // 1. Buscamos rubros directamente guardados en el historial para esta categoría
      const rubrosMapa = new Map<string, Rubro>();

      this.apusGuardados
        .filter(apu => apu.categoria === this.filtroCategoria)
        .forEach(apu => {
          if (apu.rubro_codigo && !rubrosMapa.has(apu.rubro_codigo)) {
            rubrosMapa.set(apu.rubro_codigo, {
              codigo: apu.rubro_codigo,
              descripcion: apu.rubro_descripcion || apu.rubro_codigo
            } as Rubro);
          }
        });

      this.rubros = Array.from(rubrosMapa.values()).sort((a, b) =>
        a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
      );

      // 2. Si no hay guardados aún, intenta cargar desde el servicio como respaldo
      if (this.rubros.length === 0) {
        const resultado = this.RubrosObraGrisService.getRubrosPorCategoria(this.filtroCategoria);
        if (Array.isArray(resultado)) {
          this.rubros = resultado;
        }
      }
    }

    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    const rubroCodigo = this.filtroRubroCodigo;
    const categoria = this.filtroCategoria;
    const inicio = this.filtroFechaInicio ? new Date(this.filtroFechaInicio) : null;
    const fin = this.filtroFechaFin ? new Date(this.filtroFechaFin) : null;
    if (fin) fin.setHours(23, 59, 59, 999);

    this.apusFiltrados = this.apusGuardados.filter(apu => {
      const nombreProyecto = (apu.proyecto || '').trim();

      let coincideProyecto = true;
      if (this.filtroProyecto === SIN_PROYECTO) {
        coincideProyecto = nombreProyecto.length === 0;
      } else if (this.filtroProyecto) {
        coincideProyecto = nombreProyecto === this.filtroProyecto;
      }

      const coincideCategoria = !categoria || apu.categoria === categoria;
      const coincideRubro = !rubroCodigo || apu.rubro_codigo === rubroCodigo;

      const fechaApu = new Date(apu.fecha);
      const coincideInicio = !inicio || fechaApu >= inicio;
      const coincideFin = !fin || fechaApu <= fin;

      return coincideProyecto && coincideCategoria && coincideRubro && coincideInicio && coincideFin;
    });

    this.agruparPorProyecto();
  }

  limpiarFiltros(): void {
    this.filtroProyecto = '';
    this.filtroRubroCodigo = '';
    this.filtroCategoria = '';
    this.rubros = [];
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.aplicarFiltros();
  }

  nombreCategoria(clave: string): string {
    return this.categorias.find(c => c.clave === clave)?.nombre || clave || '—';
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
      items: items.sort((a, b) =>
        a.rubro_codigo.localeCompare(b.rubro_codigo, undefined, { numeric: true })
      ),
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