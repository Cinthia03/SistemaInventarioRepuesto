import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Rol, SeguridadService, Usuario } from '../../../core/services/seguridad.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { PermisosService } from '../../../core/services/permisos.service';
import { esSoloLectura, usuarioActual } from '../../../core/services/rol';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador';
import { Paginacion } from '../../../shared/components/paginador/paginacion';

interface FilaUR {
  id: number;
  usuario: string;
  nombre: string;
  rolGuardado: string;
  rol: string;
  activo: boolean;
}

@Component({
  selector: 'app-usuarios-rol',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PaginadorComponent],
  templateUrl: './usuarios-rol.html',
  styleUrls: ['../../../shared/estilos/pagina-admin.css', './usuarios-rol.css']
})
export class UsuariosRolComponent implements OnInit {
  /** Paginación de la tabla (lado cliente). */
  readonly pag = new Paginacion();

  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly seguridad = inject(SeguridadService);
  private readonly auditoria = inject(AuditoriaService);
  private readonly permisos = inject(PermisosService);

  filas: FilaUR[] = [];
  roles: Rol[] = [];
  sinTablaRoles = false;
  cargando = true;
  guardando = false;

  busqueda = '';
  filtroRol = '';
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  readonly soloLectura = esSoloLectura();

  async ngOnInit() {
    try {
      await this.cargar();
    } finally {
      this.cdr.markForCheck();
    }
  }

  async cargar() {
    try {
      this.cargando = true;
      const [u, r] = await Promise.all([this.seguridad.listarUsuarios(), this.seguridad.listarRoles()]);
      this.cargando = false;

      if (u.error) { this.mostrar('error', 'No se pudieron cargar los usuarios: ' + u.error.message); return; }
      this.filas = ((u.data ?? []) as Usuario[]).map(x => {
        const rol = (x.rol || '').trim().toLowerCase();
        return { id: x.id!, usuario: x.usuario, nombre: x.nombre, rol, rolGuardado: rol, activo: x.activo !== false };
      });

      if (r.error) {
        this.sinTablaRoles = true;
        const codigos = Array.from(new Set(this.filas.map(f => f.rol).filter(Boolean)));
        this.roles = codigos.map(c => ({ codigo: c, nombre: c, solo_lectura: false, activo: true }));
      } else {
        this.roles = (r.data ?? []) as Rol[];
      }
    } finally {
      this.cdr.markForCheck();
    }
  }

  get filtradas(): FilaUR[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.filas.filter(f =>
      (!q || f.usuario.toLowerCase().includes(q) || (f.nombre || '').toLowerCase().includes(q)) &&
      (!this.filtroRol || f.rol === this.filtroRol || (this.filtroRol === '__sin' && !f.rol))
    );
  }

  get pendientes(): FilaUR[] {
    return this.filas.filter(f => f.rol !== f.rolGuardado);
  }

  cantidad(codigo: string): number {
    return this.filas.filter(f => f.rolGuardado === codigo).length;
  }

  get sinRol(): number {
    return this.filas.filter(f => !f.rolGuardado || !this.roles.some(r => r.codigo === f.rolGuardado)).length;
  }

  nombreRol(codigo: string): string {
    return this.roles.find(r => r.codigo === codigo)?.nombre || codigo || 'Sin rol';
  }

  deshacer() {
    this.filas.forEach(f => (f.rol = f.rolGuardado));
  }

  async guardar() {
    try {
      const cambios = this.pendientes;
      if (!cambios.length) return;

      const propio = cambios.find(f => f.usuario === usuarioActual());
      if (propio && !confirm('Está cambiando el rol de su propio usuario. Puede perder acceso a esta pantalla. ¿Continuar?')) return;

      this.guardando = true;
      const errores: string[] = [];
      for (const f of cambios) {
        const { error } = await this.seguridad.actualizarUsuario(f.id, { rol: f.rol });
        if (error) { errores.push(`${f.usuario}: ${error.message}`); continue; }
        this.auditoria.registrar('PERMISOS', 'PARAMETRIZACION',
          `Usuario ${f.usuario}: rol ${f.rolGuardado || '(ninguno)'} → ${f.rol}`);
        f.rolGuardado = f.rol;
        if (f.usuario === usuarioActual()) {
          localStorage.setItem('rol', f.rol);
          await this.permisos.cargar(true);
        }
      }
      this.guardando = false;

      if (errores.length) this.mostrar('error', 'Algunos cambios no se guardaron: ' + errores.join(' · '));
      else this.mostrar('ok', `Se actualizaron ${cambios.length} asignación(es) de rol.`);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private mostrar(tipo: 'ok' | 'error', texto: string) {
    this.mensaje = { tipo, texto };
  }
}
