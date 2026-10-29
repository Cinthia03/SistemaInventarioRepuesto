import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Opcion, Rol, SeguridadService } from '../../../core/services/seguridad.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { PermisosService } from '../../../core/services/permisos.service';
import { esSoloLectura, rolActual } from '../../../core/services/rol';
import { MENU } from '../../../core/menu/menu.config';

interface GrupoOpciones {
  modulo: string;
  nombre: string;
  icono: string;
  opciones: Opcion[];
}

@Component({
  selector: 'app-opciones-rol',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  templateUrl: './opciones-rol.html',
  styleUrls: ['../../../shared/estilos/pagina-admin.css', './opciones-rol.css']
})
export class OpcionesRolComponent implements OnInit {
  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly seguridad = inject(SeguridadService);
  private readonly auditoria = inject(AuditoriaService);
  private readonly permisos = inject(PermisosService);
  private readonly ruta = inject(ActivatedRoute);

  roles: Rol[] = [];
  grupos: GrupoOpciones[] = [];
  rolSel: Rol | null = null;

  /** Opciones marcadas en pantalla y las que estaban guardadas. */
  marcadas = new Set<number>();
  private guardadas = new Set<number>();

  cargando = true;
  guardando = false;
  sinTablas = false;
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  readonly soloLectura = esSoloLectura();

  async ngOnInit() {
    try {
      await Promise.all([this.cargarRoles(), this.cargarOpciones()]);
      this.cargando = false;
      // Se puede llegar con ?rol=codigo (desde Mantenimiento > Roles)
      const pedido = this.ruta.snapshot.queryParamMap.get('rol');
      const inicial = this.roles.find(r => r.codigo === pedido) ?? this.roles[0];
      if (inicial) await this.seleccionar(inicial);
    } finally {
      this.cdr.markForCheck();
    }
  }

  get hayCambios(): boolean {
    if (this.marcadas.size !== this.guardadas.size) return true;
    for (const id of this.marcadas) if (!this.guardadas.has(id)) return true;
    return false;
  }

  async cargarRoles() {
    try {
      const { data, error } = await this.seguridad.listarRoles();
      if (error) { this.sinTablas = true; return; }
      this.roles = (data ?? []) as Rol[];
    } finally {
      this.cdr.markForCheck();
    }
  }

  async cargarOpciones() {
    try {
      const { data, error } = await this.seguridad.listarOpciones();
      if (error) { this.sinTablas = true; return; }
      const opciones = (data ?? []) as Opcion[];
      this.grupos = MENU
        .map(m => ({
          modulo: m.codigo,
          nombre: m.nombre,
          icono: m.icono,
          opciones: opciones.filter(o => o.modulo === m.codigo)
        }))
        .filter(g => g.opciones.length > 0);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async seleccionar(rol: Rol) {
    try {
      if (this.hayCambios && this.rolSel && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
      this.rolSel = rol;
      this.mensaje = null;
      const { data } = await this.seguridad.opcionesDeRol(rol.id!);
      this.guardadas = new Set((data ?? []).map((f: any) => Number(f.opcion_id)));
      this.marcadas = new Set(this.guardadas);
    } finally {
      this.cdr.markForCheck();
    }
  }

  alternar(op: Opcion) {
    if (this.soloLectura) return;
    if (this.marcadas.has(op.id)) this.marcadas.delete(op.id);
    else this.marcadas.add(op.id);
  }

  todoGrupo(g: GrupoOpciones): boolean {
    return g.opciones.every(o => this.marcadas.has(o.id));
  }

  alternarGrupo(g: GrupoOpciones) {
    if (this.soloLectura) return;
    const marcar = !this.todoGrupo(g);
    g.opciones.forEach(o => { if (marcar) this.marcadas.add(o.id); else this.marcadas.delete(o.id); });
  }

  marcarTodo(valor: boolean) {
    this.grupos.flatMap(g => g.opciones).forEach(o => { if (valor) this.marcadas.add(o.id); else this.marcadas.delete(o.id); });
  }

  deshacer() {
    this.marcadas = new Set(this.guardadas);
  }

  async guardarPermisos() {
    try {
      if (!this.rolSel) return;
      const agregar = [...this.marcadas].filter(id => !this.guardadas.has(id));
      const quitar = [...this.guardadas].filter(id => !this.marcadas.has(id));

      this.guardando = true;
      const { error } = await this.seguridad.guardarOpcionesDeRol(this.rolSel.id!, agregar, quitar);
      this.guardando = false;
      if (error) { this.mostrar('error', 'No se pudieron guardar los permisos: ' + error.message); return; }

      const nombres = (ids: number[]) =>
        this.grupos.flatMap(g => g.opciones).filter(o => ids.includes(o.id)).map(o => o.nombre).join(', ');
      this.auditoria.registrar('PERMISOS', 'PARAMETRIZACION',
        `Rol ${this.rolSel.codigo}: ` +
        [agregar.length ? `+ ${nombres(agregar)}` : '', quitar.length ? `− ${nombres(quitar)}` : ''].filter(Boolean).join(' | '));

      this.guardadas = new Set(this.marcadas);
      this.mostrar('ok', `Permisos del rol "${this.rolSel.nombre}" guardados.`);

      // Si se modificó el rol del usuario conectado, se refresca su menú
      if (this.rolSel.codigo === rolActual()) await this.permisos.cargar(true);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private mostrar(tipo: 'ok' | 'error', texto: string) {
    this.mensaje = { tipo, texto };
  }
}
