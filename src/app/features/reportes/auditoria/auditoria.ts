import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuditoriaService, RegistroAuditoria } from '../../../core/services/auditoria.service';
import { descargarCsv, hoyIso } from '../../../shared/utilidades/exportar';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador';
import { Paginacion } from '../../../shared/components/paginador/paginacion';

const ICONOS: Record<string, string> = {
  INGRESO: 'login',
  SALIDA: 'logout',
  CREAR: 'add_circle',
  EDITAR: 'edit',
  ELIMINAR: 'delete',
  PERMISOS: 'admin_panel_settings'
};

@Component({
  selector: 'app-reportes-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PaginadorComponent],
  templateUrl: './auditoria.html',
  styleUrls: ['../../../shared/estilos/pagina-admin.css', './auditoria.css']
})
export class ReportesAuditoriaComponent implements OnInit {
  /** Paginación de la tabla (lado cliente). */
  readonly pag = new Paginacion();

  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly auditoria = inject(AuditoriaService);

  readonly acciones = Object.keys(ICONOS);
  registros: RegistroAuditoria[] = [];
  cargando = true;
  sinTabla = false;
  error = '';

  filtro = {
    desde: this.haceDias(30),
    hasta: this.haceDias(0),
    usuario: '',
    accion: '',
    modulo: ''
  };

  async ngOnInit() {
    try {
      await this.buscar();
    } finally {
      this.cdr.markForCheck();
    }
  }

  async buscar() {
    try {
      this.cargando = true;
      this.error = '';
      const { data, error } = await this.auditoria.listar(this.filtro);
      this.cargando = false;
      if (error) {
        // 42P01 = relación inexistente (tabla no creada)
        this.sinTabla = error.code === '42P01' || /does not exist|schema cache/i.test(error.message);
        if (!this.sinTabla) this.error = error.message;
        this.registros = [];
        return;
      }
      this.sinTabla = false;
      this.registros = (data ?? []) as RegistroAuditoria[];
      this.pag.reiniciar();
    } finally {
      this.cdr.markForCheck();
    }
  }

  limpiar() {
    this.filtro = { desde: this.haceDias(30), hasta: this.haceDias(0), usuario: '', accion: '', modulo: '' };
    this.buscar();
  }

  get modulos(): string[] {
    return Array.from(new Set(this.registros.map(r => r.modulo).filter(Boolean) as string[])).sort();
  }

  get usuariosDistintos(): number {
    return new Set(this.registros.map(r => r.usuario).filter(Boolean)).size;
  }

  contar(accion: string): number {
    return this.registros.filter(r => r.accion === accion).length;
  }

  get cambios(): number {
    return this.registros.filter(r => !['INGRESO', 'SALIDA'].includes(r.accion)).length;
  }

  icono(accion: string): string {
    return ICONOS[accion] || 'history';
  }

  claseAccion(accion: string): string {
    switch (accion) {
      case 'ELIMINAR': return 'chip--peligro';
      case 'PERMISOS': return 'chip--acento';
      case 'CREAR': return 'chip--ok';
      case 'EDITAR': return 'chip--info';
      default: return '';
    }
  }

  exportar() {
    descargarCsv(`auditoria-${hoyIso()}`, [
      { titulo: 'Fecha', valor: r => new Date(r.fecha).toLocaleString('es-EC') },
      { titulo: 'Usuario', valor: r => r.usuario },
      { titulo: 'Acción', valor: r => r.accion },
      { titulo: 'Módulo', valor: r => r.modulo },
      { titulo: 'Detalle', valor: r => r.detalle }
    ], this.registros);
  }

  imprimir() {
    // Se imprimen todas las filas, no solo la página visible
    const { tamano, pagina } = this.pag;
    this.pag.tamano = Number.MAX_SAFE_INTEGER;
    this.pag.pagina = 1;
    this.cdr.detectChanges();
    window.print();
    this.pag.tamano = tamano;
    this.pag.pagina = pagina;
    this.cdr.markForCheck();
  }

  private haceDias(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
