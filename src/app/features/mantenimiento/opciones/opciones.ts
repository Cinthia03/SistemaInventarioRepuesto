import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Opcion, SeguridadService } from '../../../core/services/seguridad.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { PermisosService } from '../../../core/services/permisos.service';
import { esSoloLectura } from '../../../core/services/rol';
import { CODIGOS_SISTEMA, MODULOS_MENU, OPCIONES_ADMIN } from '../../../core/menu/menu.config';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador';
import { Paginacion } from '../../../shared/components/paginador/paginacion';

type FormOpcion = Omit<Opcion, 'id'>;

/** Íconos sugeridos (Material Icons) para elegir rápido. */
const ICONOS_SUGERIDOS = [
  'home', 'group', 'badge', 'list_alt', 'rule', 'manage_accounts', 'inventory_2', 'calculate',
  'request_quote', 'query_stats', 'assignment', 'insights', 'policy', 'construction', 'engineering',
  'local_shipping', 'warehouse', 'description', 'folder', 'settings', 'bar_chart', 'event'
];

@Component({
  selector: 'app-opciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PaginadorComponent],
  templateUrl: './opciones.html',
  styleUrls: ['../../../shared/estilos/pagina-admin.css', '../usuarios/usuarios.css', './opciones.css']
})
export class OpcionesComponent implements OnInit {
  /** Paginación de la tabla (lado cliente). */
  readonly pag = new Paginacion();

  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly seguridad = inject(SeguridadService);
  private readonly auditoria = inject(AuditoriaService);
  private readonly permisos = inject(PermisosService);

  readonly modulos = MODULOS_MENU;
  readonly iconos = ICONOS_SUGERIDOS;
  readonly soloLectura = esSoloLectura();

  opciones: Opcion[] = [];
  rolesPorOpcion = new Map<number, number>();
  cargando = true;
  guardando = false;
  sinTabla = false;
  busqueda = '';
  filtroModulo = '';

  form: FormOpcion = this.vacio();
  editandoId: number | null = null;
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  async ngOnInit() {
    await this.cargar();
  }

  /** Las opciones del sistema tienen pantalla propia: su código y ruta no se cambian. */
  esSistema(o: { codigo: string }): boolean {
    return CODIGOS_SISTEMA.has(o.codigo);
  }

  get editandoSistema(): boolean {
    return !!this.editandoId && this.esSistema(this.form);
  }

  nombreModulo(codigo: string): string {
    return this.modulos.find(m => m.codigo === codigo)?.nombre || codigo;
  }

  get filtradas(): Opcion[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.opciones.filter(o =>
      (!this.filtroModulo || o.modulo === this.filtroModulo) &&
      (!q || o.codigo.toLowerCase().includes(q) || o.nombre.toLowerCase().includes(q) || o.ruta.toLowerCase().includes(q))
    );
  }

  async cargar() {
    try {
      this.cargando = true;
      const { data, error } = await this.seguridad.listarOpciones();
      if (error) { this.sinTabla = true; return; }
      this.opciones = ((data ?? []) as Opcion[]).sort((a, b) =>
        this.modulos.findIndex(m => m.codigo === a.modulo) - this.modulos.findIndex(m => m.codigo === b.modulo) || a.orden - b.orden);
      this.rolesPorOpcion = await this.seguridad.rolesPorOpcion();
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  nuevo(limpiarMensaje = true) {
    this.editandoId = null;
    this.form = this.vacio();
    if (limpiarMensaje) this.mensaje = null;
  }

  editar(o: Opcion) {
    this.editandoId = o.id;
    const { id, ...resto } = o;
    this.form = { ...resto, icono: resto.icono || '' };
    this.mensaje = null;
  }

  async guardar() {
    try {
      const f = this.form;
      f.codigo = (f.codigo || '').trim().toUpperCase().replace(/\s+/g, '_');
      f.nombre = (f.nombre || '').trim();
      f.ruta = (f.ruta || '').trim();
      if (f.ruta && !f.ruta.startsWith('/')) f.ruta = '/' + f.ruta;

      if (!f.codigo || !f.nombre || !f.modulo || !f.ruta) {
        this.mostrar('error', 'Complete código, nombre, módulo y ruta.');
        return;
      }
      if (this.editandoId && OPCIONES_ADMIN.includes(f.codigo) && !f.activo) {
        this.mostrar('error', 'Esta opción es necesaria para administrar el sistema y no se puede desactivar.');
        return;
      }

      const datos: FormOpcion = {
        codigo: f.codigo, nombre: f.nombre, modulo: f.modulo, ruta: f.ruta,
        icono: f.icono || null, orden: Number(f.orden) || 0, activo: f.activo
      };

      this.guardando = true;
      if (this.editandoId) {
        const { error } = await this.seguridad.actualizarOpcion(this.editandoId, datos);
        if (error) { this.mostrar('error', 'No se pudo actualizar: ' + error.message); return; }
        this.auditoria.registrar('EDITAR', 'OPCIONES', `Opción ${f.codigo} (${f.nombre})`);
        this.mostrar('ok', 'Opción actualizada.');
      } else {
        if (this.opciones.some(o => o.codigo === f.codigo)) { this.mostrar('error', `El código "${f.codigo}" ya existe.`); return; }
        const { error } = await this.seguridad.crearOpcion(datos);
        if (error) { this.mostrar('error', 'No se pudo crear: ' + error.message); return; }
        this.auditoria.registrar('CREAR', 'OPCIONES', `Opción ${f.codigo} → ${f.ruta}`);
        this.mostrar('ok', 'Opción creada. Asígnela a los roles en Parametrización > Opciones x Rol.');
      }
      this.nuevo(false);
      await this.cargar();
      await this.permisos.cargar(true); // refresca nombres/orden del menú
    } finally {
      this.guardando = false;
      this.cdr.markForCheck();
    }
  }

  async alternarActivo(o: Opcion) {
    try {
      if (OPCIONES_ADMIN.includes(o.codigo) && o.activo) {
        this.mostrar('error', 'Esta opción es necesaria para administrar el sistema y no se puede desactivar.');
        return;
      }
      const { error } = await this.seguridad.actualizarOpcion(o.id, { activo: !o.activo });
      if (error) { this.mostrar('error', error.message); return; }
      o.activo = !o.activo;
      this.auditoria.registrar('EDITAR', 'OPCIONES', `Opción ${o.codigo} ${o.activo ? 'activada' : 'desactivada'}`);
      await this.permisos.cargar(true);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async eliminar(o: Opcion) {
    try {
      if (this.esSistema(o)) {
        this.mostrar('error', 'Las opciones del sistema no se eliminan; puede desactivarlas.');
        return;
      }
      if (!confirm(`¿Eliminar la opción "${o.nombre}"? Se quitará de todos los roles.`)) return;
      const { error } = await this.seguridad.eliminarOpcion(o.id);
      if (error) { this.mostrar('error', 'No se pudo eliminar: ' + error.message); return; }
      this.auditoria.registrar('ELIMINAR', 'OPCIONES', `Opción ${o.codigo}`);
      this.mostrar('ok', 'Opción eliminada.');
      if (this.editandoId === o.id) this.nuevo(false);
      await this.cargar();
      await this.permisos.cargar(true);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private vacio(): FormOpcion {
    return { codigo: '', nombre: '', modulo: 'PROCESOS', ruta: '/', icono: '', orden: 0, activo: true };
  }

  private mostrar(tipo: 'ok' | 'error', texto: string) {
    this.mensaje = { tipo, texto };
  }
}
