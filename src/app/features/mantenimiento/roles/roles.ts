import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Rol, SeguridadService } from '../../../core/services/seguridad.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { PermisosService } from '../../../core/services/permisos.service';
import { esSoloLectura, rolActual } from '../../../core/services/rol';
import { ROLES_ADMIN } from '../../../core/menu/menu.config';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador';
import { Paginacion } from '../../../shared/components/paginador/paginacion';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink, PaginadorComponent],
  templateUrl: './roles.html',
  styleUrls: ['../../../shared/estilos/pagina-admin.css', '../usuarios/usuarios.css']
})
export class RolesComponent implements OnInit {
  /** Paginación de la tabla (lado cliente). */
  readonly pag = new Paginacion();

  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly seguridad = inject(SeguridadService);
  private readonly auditoria = inject(AuditoriaService);
  private readonly permisos = inject(PermisosService);

  roles: Rol[] = [];
  usuariosPorRol = new Map<string, number>();
  opcionesPorRol = new Map<number, number>();
  cargando = true;
  guardando = false;
  sinTabla = false;
  busqueda = '';

  form: Rol = this.vacio();
  editandoId: number | null = null;
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  readonly soloLectura = esSoloLectura();

  async ngOnInit() {
    await this.cargar();
  }

  get filtrados(): Rol[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.roles.filter(r => !q || r.codigo.includes(q) || r.nombre.toLowerCase().includes(q));
  }

  esAdmin(r: Rol): boolean {
    return ROLES_ADMIN.includes(r.codigo);
  }

  async cargar() {
    try {
      this.cargando = true;
      const { data, error } = await this.seguridad.listarRoles();
      if (error) { this.sinTabla = true; return; }
      this.roles = (data ?? []) as Rol[];
      [this.usuariosPorRol, this.opcionesPorRol] = await Promise.all([
        this.seguridad.usuariosPorRol(), this.seguridad.opcionesPorRol()
      ]);
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

  editar(r: Rol) {
    this.editandoId = r.id ?? null;
    this.form = { ...r, descripcion: r.descripcion ?? '' };
    this.mensaje = null;
  }

  async guardar() {
    try {
      const f = this.form;
      f.codigo = (f.codigo || '').trim().toLowerCase().replace(/\s+/g, '_');
      f.nombre = (f.nombre || '').trim();
      if (!f.codigo || !f.nombre) { this.mostrar('error', 'Ingrese código y nombre del rol.'); return; }
      if (this.editandoId && this.esAdmin(f) && (!f.activo || f.solo_lectura)) {
        this.mostrar('error', 'El rol administrador debe permanecer activo y con permisos de escritura.');
        return;
      }

      this.guardando = true;
      if (this.editandoId) {
        const { error } = await this.seguridad.actualizarRol(this.editandoId, {
          nombre: f.nombre, descripcion: f.descripcion || null, solo_lectura: f.solo_lectura, activo: f.activo
        });
        if (error) { this.mostrar('error', 'No se pudo actualizar: ' + error.message); return; }
        this.auditoria.registrar('EDITAR', 'ROLES', `Rol ${f.codigo}`);
        this.mostrar('ok', 'Rol actualizado.');
      } else {
        if (this.roles.some(r => r.codigo === f.codigo)) { this.mostrar('error', `El código "${f.codigo}" ya existe.`); return; }
        const { error } = await this.seguridad.crearRol({
          codigo: f.codigo, nombre: f.nombre, descripcion: f.descripcion || null, solo_lectura: f.solo_lectura, activo: f.activo
        });
        if (error) { this.mostrar('error', 'No se pudo crear: ' + error.message); return; }
        this.auditoria.registrar('CREAR', 'ROLES', `Rol ${f.codigo}`);
        this.mostrar('ok', 'Rol creado. Asigne sus opciones en Parametrización > Opciones x Rol.');
      }
      if (f.codigo === rolActual()) await this.permisos.cargar(true);
      this.nuevo(false);
      await this.cargar();
    } finally {
      this.guardando = false;
      this.cdr.markForCheck();
    }
  }

  async eliminar(r: Rol) {
    try {
      if (this.esAdmin(r)) { this.mostrar('error', 'El rol administrador no se puede eliminar.'); return; }
      const usuarios = this.usuariosPorRol.get(r.codigo) || 0;
      if (usuarios > 0) {
        this.mostrar('error', `No se puede eliminar: ${usuarios} usuario(s) tienen este rol. Reasígnelos en Usuarios x Rol.`);
        return;
      }
      if (!confirm(`¿Eliminar el rol "${r.nombre}"? También se quitarán sus permisos.`)) return;
      const { error } = await this.seguridad.eliminarRol(r.id!);
      if (error) { this.mostrar('error', 'No se pudo eliminar: ' + error.message); return; }
      this.auditoria.registrar('ELIMINAR', 'ROLES', `Rol ${r.codigo}`);
      this.mostrar('ok', 'Rol eliminado.');
      if (this.editandoId === r.id) this.nuevo(false);
      await this.cargar();
    } finally {
      this.cdr.markForCheck();
    }
  }

  private vacio(): Rol {
    return { codigo: '', nombre: '', descripcion: '', solo_lectura: false, activo: true };
  }

  private mostrar(tipo: 'ok' | 'error', texto: string) {
    this.mensaje = { tipo, texto };
  }
}
