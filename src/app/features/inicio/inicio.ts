import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PermisosService } from '../../core/services/permisos.service';
import { rolActual, usuarioActual } from '../../core/services/rol';
import { OpcionMenu } from '../../core/menu/menu.config';

interface TarjetaModulo {
  codigo: string;
  numero: string;
  titulo: string;
  descripcion: string;
  etiquetas: string;
  ruta: string;
  icono: string;
  imagen?: string;
  clase: string;
}

/** Módulos de PROCESOS que se presentan como tarjetas en el inicio. */
const MODULOS: TarjetaModulo[] = [
  {
    codigo: 'PROC_INVENTARIO', numero: '01', titulo: 'Gestión de Inventario',
    descripcion: 'Administra materiales, mano de obra y equipos; controla el stock y los precios de cada recurso.',
    etiquetas: 'Materiales · Mano de obra · Equipos', ruta: '/inventario', icono: 'inventory_2',
    imagen: '/imagenes/inventario.jpg', clase: 'mod--inventario'
  },
  {
    codigo: 'PROC_CALCULO', numero: '02', titulo: 'Análisis de Precios Unitarios',
    descripcion: 'Calcula el APU de cada rubro: obra gris, acabados, hidráulico-sanitario y eléctrico.',
    etiquetas: 'APU · Rubros · Costos directos', ruta: '/calculo', icono: 'calculate',
    imagen: '/imagenes/calculos.jpg', clase: 'mod--calculo'
  },
  {
    codigo: 'PROC_PRESUPUESTO', numero: '03', titulo: 'Control de Presupuestos',
    descripcion: 'Elabora presupuestos de obra con formato oficial y controla su consumo de materiales.',
    etiquetas: 'Presupuesto · Control · Costos', ruta: '/presupuesto', icono: 'request_quote',
    imagen: '/imagenes/presupuesto.jpg', clase: 'mod--presupuesto'
  },
  {
    codigo: 'PROC_PREDICTIVO', numero: '04', titulo: 'Modelos Predictivos',
    descripcion: 'Proyecta el agotamiento del stock y la tendencia de precios a partir del historial.',
    etiquetas: 'Proyección · Tendencias · Stock', ruta: '/modelos-predictivos', icono: 'query_stats',
    clase: 'mod--predictivo'
  }
];

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class InicioComponent {
  private readonly router = inject(Router);
  readonly permisos = inject(PermisosService);
  readonly sinPermiso = !!inject(ActivatedRoute).snapshot.queryParamMap.get('sinPermiso');

  readonly usuario = usuarioActual();
  readonly rol = rolActual();
  readonly hoy = new Date();
  readonly fechaTexto = (() => {
    const t = this.hoy.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  })();

  /** Tarjetas de procesos que el rol puede ver. */
  readonly modulos = computed(() => MODULOS.filter(m => this.permisos.menu()
    .some(g => g.opciones.some(o => o.codigo === m.codigo))));

  /** Accesos rápidos a Mantenimiento, Parametrización y Reportes. */
  readonly accesos = computed<(OpcionMenu & { modulo: string })[]>(() => this.permisos.menu()
    .filter(g => !['INICIO', 'PROCESOS'].includes(g.codigo))
    .flatMap(g => g.opciones.map(o => ({ ...o, modulo: g.nombre }))));

  get saludo(): string {
    const h = this.hoy.getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }

  ir(ruta: string) {
    this.router.navigate([ruta]);
  }
}
