import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Rol, SeguridadService, Usuario } from '../../core/services/seguridad.service';
import { AuditoriaService, RegistroAuditoria } from '../../core/services/auditoria.service';
import { PermisosService } from '../../core/services/permisos.service';
import { esSoloLectura, rolActual, usuarioActual } from '../../core/services/rol';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrls: ['../../shared/estilos/pagina-admin.css', './perfil.css']
})
export class PerfilComponent implements OnInit {
  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly seguridad = inject(SeguridadService);
  private readonly auditoria = inject(AuditoriaService);
  readonly permisos = inject(PermisosService);

  readonly usuario = usuarioActual();
  readonly codigoRol = rolActual();
  readonly soloLectura = esSoloLectura();

  perfil: (Omit<Usuario, 'password'> & { created_at?: string }) | null = null;
  rol: Rol | null = null;
  actividad: RegistroAuditoria[] = [];
  cargando = true;

  nombre = '';
  guardandoDatos = false;

  pass = { actual: '', nueva: '', confirmar: '' };
  verPass = false;
  guardandoPass = false;

  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  async ngOnInit() {
    try {
      const [p, r, a] = await Promise.all([
        this.seguridad.obtenerPerfil(this.usuario),
        this.seguridad.listarRoles(),
        this.auditoria.listar({ usuario: this.usuario }, 8)
      ]);
      if (p.data) {
        const { password, ...resto } = p.data as Usuario & { created_at?: string };
        this.perfil = resto;
        this.nombre = resto.nombre || '';
      }
      if (!r.error) this.rol = ((r.data ?? []) as Rol[]).find(x => x.codigo === this.codigoRol) ?? null;
      if (!a.error) this.actividad = (a.data ?? []) as RegistroAuditoria[];
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  get iniciales(): string {
    const base = (this.perfil?.nombre || this.usuario || '?').trim().split(/\s+/);
    return ((base[0]?.[0] || '') + (base[1]?.[0] || '')).toUpperCase() || '?';
  }

  /** Opciones del menú a las que tiene acceso, agrupadas por módulo. */
  get accesos() {
    return this.permisos.menu().filter(m => m.codigo !== 'INICIO');
  }

  /** Nivel de la contraseña nueva (0 a 4). */
  get fuerza(): number {
    const p = this.pass.nueva;
    if (!p) return 0;
    let n = 0;
    if (p.length >= 8) n++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
    if (/\d/.test(p)) n++;
    if (/[^A-Za-z0-9]/.test(p)) n++;
    return Math.max(1, n);
  }

  get textoFuerza(): string {
    return ['', 'Débil', 'Aceptable', 'Buena', 'Fuerte'][this.fuerza];
  }

  async guardarDatos() {
    try {
      const nombre = this.nombre.trim();
      if (!nombre) { this.mostrar('error', 'El nombre no puede quedar vacío.'); return; }
      this.guardandoDatos = true;
      const { error } = await this.seguridad.actualizarPerfil(this.usuario, { nombre });
      if (error) { this.mostrar('error', 'No se pudo guardar: ' + error.message); return; }
      if (this.perfil) this.perfil.nombre = nombre;
      this.auditoria.registrar('EDITAR', 'PERFIL', 'Actualizó su nombre');
      this.mostrar('ok', 'Datos actualizados.');
    } finally {
      this.guardandoDatos = false;
      this.cdr.markForCheck();
    }
  }

  async cambiarPassword() {
    try {
      const { actual, nueva, confirmar } = this.pass;
      if (!actual || !nueva || !confirmar) { this.mostrar('error', 'Complete los tres campos de contraseña.'); return; }
      if (nueva.length < 6) { this.mostrar('error', 'La nueva contraseña debe tener al menos 6 caracteres.'); return; }
      if (nueva !== confirmar) { this.mostrar('error', 'La confirmación no coincide con la nueva contraseña.'); return; }
      if (nueva === actual) { this.mostrar('error', 'La nueva contraseña debe ser distinta de la actual.'); return; }

      this.guardandoPass = true;
      if (!(await this.seguridad.verificarPassword(this.usuario, actual))) {
        this.mostrar('error', 'La contraseña actual no es correcta.');
        return;
      }
      const { error } = await this.seguridad.actualizarPerfil(this.usuario, { password: nueva });
      if (error) { this.mostrar('error', 'No se pudo cambiar la contraseña: ' + error.message); return; }
      this.auditoria.registrar('EDITAR', 'PERFIL', 'Cambió su contraseña');
      this.pass = { actual: '', nueva: '', confirmar: '' };
      this.mostrar('ok', 'Contraseña actualizada.');
    } finally {
      this.guardandoPass = false;
      this.cdr.markForCheck();
    }
  }

  private mostrar(tipo: 'ok' | 'error', texto: string) {
    this.mensaje = { tipo, texto };
  }
}
