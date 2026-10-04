import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Rol, SeguridadService, Usuario } from '../../../core/services/seguridad.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { esSoloLectura, usuarioActual } from '../../../core/services/rol';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador';
import { Paginacion } from '../../../shared/components/paginador/paginacion';

type FilaUsuario = Omit<Usuario, 'password'>;

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PaginadorComponent],
  templateUrl: './usuarios.html',
  styleUrls: ['../../../shared/estilos/pagina-admin.css', './usuarios.css']
})
export class UsuariosComponent implements OnInit {
  /** Paginación de la tabla (lado cliente). */
  readonly pag = new Paginacion();

  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly seguridad = inject(SeguridadService);
  private readonly auditoria = inject(AuditoriaService);

  usuarios: FilaUsuario[] = [];
  roles: Pick<Rol, 'codigo' | 'nombre'>[] = [];
  cargando = true;
  guardando = false;
  /** La tabla usuarios todavía no tiene la columna "activo". */
  sinColumnaActivo = false;

  busqueda = '';
  filtroEstado: '' | 'activos' | 'inactivos' = '';

  form: Usuario = this.formVacio();
  editandoId: number | null = null;
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  readonly soloLectura = esSoloLectura();

  async ngOnInit() {
    try {
      await Promise.all([this.cargarUsuarios(), this.cargarRoles()]);
    } finally {
      this.cdr.markForCheck();
    }
  }

  get filtrados(): FilaUsuario[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.usuarios.filter(u => {
      const coincide = !q || [u.usuario, u.nombre, u.rol].some(v => (v || '').toLowerCase().includes(q));
      const estado = !this.filtroEstado
        || (this.filtroEstado === 'activos' ? u.activo !== false : u.activo === false);
      return coincide && estado;
    });
  }

  get totalActivos(): number {
    return this.usuarios.filter(u => u.activo !== false).length;
  }

  nombreRol(codigo: string): string {
    return this.roles.find(r => r.codigo === (codigo || '').toLowerCase())?.nombre || codigo || '—';
  }

  async cargarUsuarios() {
    try {
      this.cargando = true;
      const { data, error } = await this.seguridad.listarUsuarios();
      this.cargando = false;
      if (error) {
        this.mostrar('error', 'No se pudieron cargar los usuarios: ' + error.message);
        return;
      }
      const filas = (data ?? []) as Usuario[];
      this.sinColumnaActivo = filas.length > 0 && !('activo' in filas[0]);
      this.usuarios = filas.map(({ password, ...resto }) => resto);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async cargarRoles() {
    try {
      const { data, error } = await this.seguridad.listarRoles();
      if (!error && data?.length) {
        this.roles = (data as Rol[]).filter(r => r.activo !== false);
        return;
      }
      // Sin tabla roles: se usan los roles que ya tienen los usuarios
      const codigos = Array.from(new Set(this.usuarios.map(u => (u.rol || '').toLowerCase()).filter(Boolean)));
      ['admin', 'consulta'].forEach(c => { if (!codigos.includes(c)) codigos.push(c); });
      this.roles = codigos.map(c => ({ codigo: c, nombre: c.charAt(0).toUpperCase() + c.slice(1) }));
    } finally {
      this.cdr.markForCheck();
    }
  }

  nuevo(limpiarMensaje = true) {
    this.editandoId = null;
    this.form = this.formVacio();
    if (limpiarMensaje) this.mensaje = null;
  }

  editar(u: FilaUsuario) {
    this.editandoId = u.id ?? null;
    this.form = { ...u, rol: (u.rol || '').toLowerCase(), password: '', activo: u.activo !== false };
    this.mensaje = null;
  }

  async guardar() {
    try {
      const f = this.form;
      f.usuario = (f.usuario || '').trim();
      f.nombre = (f.nombre || '').trim();

      if (!f.usuario || !f.nombre || !f.rol) {
        this.mostrar('error', 'Complete usuario, nombre y rol.');
        return;
      }
      if (!this.editandoId && !f.password) {
        this.mostrar('error', 'Ingrese una contraseña para el nuevo usuario.');
        return;
      }
      if (f.password && f.password.length < 6) {
        this.mostrar('error', 'La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (await this.seguridad.existeUsuario(f.usuario, this.editandoId ?? undefined)) {
        this.mostrar('error', `Ya existe un usuario "${f.usuario}".`);
        return;
      }

      const datos: Partial<Usuario> = { usuario: f.usuario, nombre: f.nombre, rol: f.rol };
      if (f.password) datos.password = f.password;
      if (!this.sinColumnaActivo) datos.activo = f.activo !== false;

      this.guardando = true;
      if (this.editandoId) {
        const { error } = await this.seguridad.actualizarUsuario(this.editandoId, datos);
        this.guardando = false;
        if (error) { this.mostrar('error', 'No se pudo actualizar: ' + error.message); return; }
        this.auditoria.registrar('EDITAR', 'USUARIOS', `Usuario ${f.usuario} (rol ${f.rol}${f.password ? ', cambio de contraseña' : ''})`);
        this.mostrar('ok', 'Usuario actualizado.');
      } else {
        const { error } = await this.seguridad.crearUsuario(datos as Usuario);
        this.guardando = false;
        if (error) { this.mostrar('error', 'No se pudo crear: ' + error.message); return; }
        this.auditoria.registrar('CREAR', 'USUARIOS', `Usuario ${f.usuario} con rol ${f.rol}`);
        this.mostrar('ok', 'Usuario creado.');
      }
      this.nuevo(false);
      await this.cargarUsuarios();
    } finally {
      this.cdr.markForCheck();
    }
  }

  async alternarActivo(u: FilaUsuario) {
    try {
      if (this.sinColumnaActivo || !u.id) return;
      if (u.usuario === usuarioActual()) {
        this.mostrar('error', 'No puede desactivar su propio usuario.');
        return;
      }
      const activo = u.activo === false;
      const { error } = await this.seguridad.actualizarUsuario(u.id, { activo });
      if (error) { this.mostrar('error', error.message); return; }
      u.activo = activo;
      this.auditoria.registrar('EDITAR', 'USUARIOS', `Usuario ${u.usuario} ${activo ? 'activado' : 'desactivado'}`);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async eliminar(u: FilaUsuario) {
    try {
      if (!u.id) return;
      if (u.usuario === usuarioActual()) {
        this.mostrar('error', 'No puede eliminar su propio usuario.');
        return;
      }
      if (!confirm(`¿Eliminar el usuario "${u.usuario}"? Esta acción no se puede deshacer.`)) return;
      const { error } = await this.seguridad.eliminarUsuario(u.id);
      if (error) { this.mostrar('error', 'No se pudo eliminar: ' + error.message); return; }
      this.auditoria.registrar('ELIMINAR', 'USUARIOS', `Usuario ${u.usuario}`);
      this.mostrar('ok', 'Usuario eliminado.');
      if (this.editandoId === u.id) this.nuevo(false);
      await this.cargarUsuarios();
    } finally {
      this.cdr.markForCheck();
    }
  }

  private formVacio(): Usuario {
    return { usuario: '', nombre: '', password: '', rol: '', activo: true };
  }

  private mostrar(tipo: 'ok' | 'error', texto: string) {
    this.mensaje = { tipo, texto };
  }
}
