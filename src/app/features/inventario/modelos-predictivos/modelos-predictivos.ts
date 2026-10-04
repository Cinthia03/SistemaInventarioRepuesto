import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  ModelosPredictivosService,
  TipoInventario,
  PrediccionItem,
  PuntoHistorico
} from '../../../core/services/modelos-predictivos.service';

@Component({
  selector: 'app-modelos-predictivos',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './modelos-predictivos.html',
  styleUrls: ['./modelos-predictivos.css']
})
export class ModelosPredictivos implements OnInit {

  tipoActual: TipoInventario = 'materiales';

  cargando = true;
  generandoSnapshot = false;

  predicciones: PrediccionItem[] = [];

  // KPIs
  totalAnalizados = 0;
  totalCritico = 0;
  totalAlto = 0;
  tendenciaPrecioPromedio = 0;
  diasHistorialDisponibles = 0;

  constructor(
    private router: Router,
    private cd: ChangeDetectorRef,
    private supabaseService: SupabaseService,
    private service: ModelosPredictivosService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarPredicciones();
  }

  // ======================
  // NAVEGACION
  // ======================

  volverAInventario(): void {
    this.router.navigate(['/inventario'])
      .catch(err => console.error('Error navegación:', err));
  }

  cambiarTipo(tipo: TipoInventario): void {
    if (this.tipoActual === tipo) return;
    this.tipoActual = tipo;
    this.cargarPredicciones();
  }

  // ======================
  // SNAPSHOT DE HOY
  // ======================

  generarSnapshotYRecalcular(): void {
    this.generandoSnapshot = true;
    this.service.registrarSnapshot(this.tipoActual).subscribe({
      next: ({ error }: any) => {
        if (error) {
          console.error(error);
          this.snackBar.open('No se pudo registrar el historial de hoy', 'Cerrar', { duration: 3000 });
          this.generandoSnapshot = false;
          this.cd.detectChanges();
          return;
        }
        this.snackBar.open('📊 Punto de hoy registrado para el modelo', 'Cerrar', { duration: 3000 });
        this.cargarPredicciones();
      },
      error: (err: any) => {
        console.error(err);
        this.snackBar.open('No se pudo registrar el historial de hoy', 'Cerrar', { duration: 3000 });
        this.generandoSnapshot = false;
        this.cd.detectChanges();
      }
    });
  }

  // ======================
  // CARGA Y CALCULO DE PREDICCIONES
  // ======================

  async cargarPredicciones(): Promise<void> {
    this.cargando = true;
    this.cd.detectChanges();

    try {
      const { data: items, error: errorItems } = await this.supabaseService.supabase
        .from(this.tipoActual)
        .select('*');

      if (errorItems) throw errorItems;

      const { data: historialCompleto, error: errorHistorial } = await this.supabaseService.supabase
        .from('historial_inventario')
        .select('codigo,fecha,stock,precio')
        .eq('tipo', this.tipoActual)
        .order('fecha', { ascending: true });

      if (errorHistorial) throw errorHistorial;

      const historialPorCodigo = new Map<string, PuntoHistorico[]>();
      (historialCompleto ?? []).forEach((h: any) => {
        const lista = historialPorCodigo.get(h.codigo) ?? [];
        lista.push({
          fecha: h.fecha,
          stock: h.stock === null || h.stock === undefined ? null : Number(h.stock),
          precio: Number(h.precio)
        });
        historialPorCodigo.set(h.codigo, lista);
      });

      const ordenRiesgo: Record<string, number> = {
        critico: 0, alto: 1, medio: 2, bajo: 3, 'sin-datos': 4
      };

      this.predicciones = (items ?? [])
        .map((item: any) =>
          ModelosPredictivosService.construirPrediccion(
            this.tipoActual,
            item,
            historialPorCodigo.get(item.codigo) ?? []
          )
        )
        .sort((a, b) => ordenRiesgo[a.riesgo] - ordenRiesgo[b.riesgo]);

      this.totalAnalizados = this.predicciones.length;
      this.totalCritico = this.predicciones.filter(p => p.riesgo === 'critico').length;
      this.totalAlto = this.predicciones.filter(p => p.riesgo === 'alto').length;

      const conTendencia = this.predicciones.filter(p => p.tendenciaPrecioPorcentaje !== null);
      this.tendenciaPrecioPromedio = conTendencia.length > 0
        ? conTendencia.reduce((s, p) => s + (p.tendenciaPrecioPorcentaje ?? 0), 0) / conTendencia.length
        : 0;

      const fechasUnicas = new Set((historialCompleto ?? []).map((h: any) => h.fecha));
      this.diasHistorialDisponibles = fechasUnicas.size;

    } catch (err) {
      console.error('Error generando predicciones:', err);
      this.snackBar.open('Ocurrió un error generando las predicciones', 'Cerrar', { duration: 3000 });
    } finally {
      this.cargando = false;
      this.generandoSnapshot = false;
      this.cd.detectChanges();
    }
  }

  // ======================
  // AYUDAS PARA LA PLANTILLA
  // ======================

  manejaStock(): boolean {
    return this.tipoActual !== 'mano_obra';
  }

  etiquetaRiesgo(riesgo: string): string {
    switch (riesgo) {
      case 'critico': return 'Crítico';
      case 'alto': return 'Alto';
      case 'medio': return 'Medio';
      case 'bajo': return 'Bajo';
      default: return 'Sin datos';
    }
  }

  etiquetaTipo(tipo: TipoInventario): string {
    switch (tipo) {
      case 'materiales': return 'Materiales';
      case 'equipos': return 'Equipos';
      default: return 'Mano de Obra';
    }
  }
}
