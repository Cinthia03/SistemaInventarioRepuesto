import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MaterialeService, materiales } from '../../../core/services/materiales.service';

// ============================================================
//  MODELOS
// ============================================================

interface ItemFactura {
  codigo?: string;
  descripcion: string;
  descripcionNormalizada: string;
  cantidad?: number;
  precioUnitario: number;
}

interface InfoFacturaProcesada {
  archivo: string;
  razonSocial: string;
  fechaEmision: string;
  totalItems: number;
}

interface PropuestaActualizacion {
  item: ItemFactura;
  material?: materiales;
  precioAnterior?: number;
  precioNuevo: number;
  seleccionado: boolean;
  estado: 'coincidencia' | 'sin-coincidencia';
}

type PantallaAsistente =
  | 'menu'
  | 'stock'
  | 'actividad'
  | 'ayuda'
  | 'subir'
  | 'revision'
  | 'resultado';

@Component({
  selector: 'app-asistente-inventario',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './asistente-inventario.html',
  styleUrls: ['./asistente-inventario.css']
})
export class AsistenteInventarioComponent {

  // ==========================================================
  //  DATOS QUE LLEGAN DEL DASHBOARD (para no duplicar consultas)
  // ==========================================================
  @Input() totalMateriales = 0;
  @Input() itemsStockBajo = 0;
  @Input() actualizadosHoy = 0;
  @Input() alertasStock: any[] = [];
  @Input() actividadReciente: any[] = [];

  // Avisa al componente padre que debe refrescar el dashboard
  @Output() preciosActualizados = new EventEmitter<void>();

  // ==========================================================
  //  ESTADO DEL WIDGET
  // ==========================================================
  abierto = false;
  pantalla: PantallaAsistente = 'menu';
  cargando = false;
  nombreAsistente = 'Sofía';

  // ==========================================================
  //  ESTADO DE CARGA DE XML
  // ==========================================================
  archivosSeleccionados: File[] = [];
  infoFacturas: InfoFacturaProcesada[] = [];
  propuestas: PropuestaActualizacion[] = [];
  erroresArchivos: string[] = [];
  actualizacionesRealizadas: PropuestaActualizacion[] = [];

  constructor(private service: MaterialeService) {}

  // ==========================================================
  //  ABRIR / CERRAR
  // ==========================================================

  toggle(): void {
    this.abierto = !this.abierto;
  }

  cerrar(): void {
    this.abierto = false;
  }

  irAMenu(): void {
    this.pantalla = 'menu';
  }

  irA(pantalla: PantallaAsistente): void {
    this.pantalla = pantalla;
    if (pantalla === 'subir') {
      this.reiniciarCargaXml();
    }
  }

  // ==========================================================
  //  UTILIDADES DE TEXTO
  // ==========================================================

  private normalizar(texto: string | null | undefined): string {
    return (texto ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ==========================================================
  //  CARGA DE ARCHIVOS XML
  // ==========================================================

  reiniciarCargaXml(): void {
    this.archivosSeleccionados = [];
    this.infoFacturas = [];
    this.propuestas = [];
    this.erroresArchivos = [];
    this.actualizacionesRealizadas = [];
  }

  onArchivosSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    this.archivosSeleccionados = Array.from(input.files);
    input.value = '';
  }

  quitarArchivo(index: number): void {
    this.archivosSeleccionados.splice(index, 1);
  }

  private leerArchivoComoTexto(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result ?? ''));
      lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      lector.readAsText(file, 'utf-8');
    });
  }

  private obtenerMaterialesActuales(): Promise<materiales[]> {
    return new Promise((resolve) => {
      this.service.obtenerTodos().subscribe({
        next: ({ data, error }: any) => {
          if (error) {
            console.error('Error obteniendo materiales:', error);
            resolve([]);
            return;
          }
          resolve(data ?? []);
        },
        error: (err: any) => {
          console.error('Error obteniendo materiales:', err);
          resolve([]);
        }
      });
    });
  }

  // ------------------------------------------------------------
  //  PARSEO DE FACTURA ELECTRÓNICA SRI
  // ------------------------------------------------------------

  private parsearFacturaXml(xmlTexto: string): {
    razonSocial: string;
    fechaEmision: string;
    items: ItemFactura[];
  } {
    const parser = new DOMParser();
    let documento = parser.parseFromString(xmlTexto, 'application/xml');

    if (documento.querySelector('parsererror')) {
      throw new Error('El archivo no es un XML válido.');
    }

    // La autorización del SRI trae la factura real dentro de
    // <comprobante><![CDATA[ ... ]]></comprobante>
    let documentoFactura = documento;
    const nodoComprobante = documento.querySelector('comprobante');

    if (nodoComprobante && nodoComprobante.textContent) {
      const docInterno = parser.parseFromString(
        nodoComprobante.textContent,
        'application/xml'
      );
      if (!docInterno.querySelector('parsererror')) {
        documentoFactura = docInterno;
      }
    }

    const detalles = Array.from(
      documentoFactura.querySelectorAll('detalles > detalle')
    );

    if (detalles.length === 0) {
      throw new Error(
        'No se encontraron productos (detalles) dentro del XML.'
      );
    }

    const obtenerTexto = (nodo: Element, etiqueta: string): string =>
      nodo.querySelector(etiqueta)?.textContent?.trim() ?? '';

    const items: ItemFactura[] = detalles
      .map((detalle) => {
        const descripcion = obtenerTexto(detalle, 'descripcion');
        const precioUnitario = parseFloat(
          obtenerTexto(detalle, 'precioUnitario').replace(',', '.')
        );
        const cantidadTexto = obtenerTexto(detalle, 'cantidad').replace(
          ',',
          '.'
        );
        const cantidad = cantidadTexto ? parseFloat(cantidadTexto) : undefined;
        const codigo =
          obtenerTexto(detalle, 'codigoPrincipal') ||
          obtenerTexto(detalle, 'codigoAuxiliar');

        return {
          codigo: codigo || undefined,
          descripcion,
          descripcionNormalizada: this.normalizar(descripcion),
          cantidad,
          precioUnitario
        };
      })
      .filter((item) => item.descripcion && item.precioUnitario > 0);

    if (items.length === 0) {
      throw new Error(
        'Los productos del XML no tienen descripción o precio unitario válidos.'
      );
    }

    const razonSocial =
      obtenerTexto(documentoFactura.documentElement, 'razonSocial') || '';
    const fechaEmision =
      obtenerTexto(documentoFactura.documentElement, 'fechaEmision') || '';

    return { razonSocial, fechaEmision, items };
  }

  // ------------------------------------------------------------
  //  EMPAREJAMIENTO POR DESCRIPCIÓN
  // ------------------------------------------------------------

  private buscarCoincidencia(
    item: ItemFactura,
    listaMateriales: materiales[]
  ): materiales | undefined {

    // 1) Coincidencia exacta (normalizada)
    const exacta = listaMateriales.find(
      (m) => this.normalizar(m.descripcion) === item.descripcionNormalizada
    );
    if (exacta) {
      return exacta;
    }

    // 2) Coincidencia aproximada: una descripción contiene a la otra
    const candidatas = listaMateriales.filter((m) => {
      const desc = this.normalizar(m.descripcion);
      return (
        desc.length > 0 &&
        (desc.includes(item.descripcionNormalizada) ||
          item.descripcionNormalizada.includes(desc))
      );
    });

    if (candidatas.length === 0) {
      return undefined;
    }

    // De las candidatas, se elige la de longitud más parecida
    candidatas.sort((a, b) => {
      const difA = Math.abs(
        this.normalizar(a.descripcion).length -
          item.descripcionNormalizada.length
      );
      const difB = Math.abs(
        this.normalizar(b.descripcion).length -
          item.descripcionNormalizada.length
      );
      return difA - difB;
    });

    return candidatas[0];
  }

  // ------------------------------------------------------------
  //  PROCESAR LOS ARCHIVOS SELECCIONADOS
  // ------------------------------------------------------------

  async procesarArchivos(): Promise<void> {
    if (this.archivosSeleccionados.length === 0) {
      return;
    }

    this.cargando = true;
    this.infoFacturas = [];
    this.propuestas = [];
    this.erroresArchivos = [];

    const listaMateriales = await this.obtenerMaterialesActuales();

    for (const archivo of this.archivosSeleccionados) {
      try {
        const texto = await this.leerArchivoComoTexto(archivo);
        const { razonSocial, fechaEmision, items } =
          this.parsearFacturaXml(texto);

        this.infoFacturas.push({
          archivo: archivo.name,
          razonSocial,
          fechaEmision,
          totalItems: items.length
        });

        for (const item of items) {
          const material = this.buscarCoincidencia(item, listaMateriales);
          const precioAnterior = material ? Number(material.precio) : undefined;
          const huboCambio =
            precioAnterior === undefined ||
            Math.abs(precioAnterior - item.precioUnitario) > 0.0001;

          this.propuestas.push({
            item,
            material,
            precioAnterior,
            precioNuevo: item.precioUnitario,
            seleccionado: !!material && huboCambio,
            estado: material ? 'coincidencia' : 'sin-coincidencia'
          });
        }
      } catch (error: any) {
        this.erroresArchivos.push(
          `${archivo.name}: ${error?.message ?? 'no se pudo procesar el archivo.'}`
        );
      }
    }

    this.cargando = false;
    this.pantalla = 'revision';
  }

  // ------------------------------------------------------------
  //  SELECCIÓN EN LA PANTALLA DE REVISIÓN
  // ------------------------------------------------------------

  toggleSeleccion(propuesta: PropuestaActualizacion): void {
    if (!propuesta.material) {
      return;
    }
    propuesta.seleccionado = !propuesta.seleccionado;
  }

  marcarTodas(marcar: boolean): void {
    this.propuestas
      .filter((p) => p.material)
      .forEach((p) => (p.seleccionado = marcar));
  }

  get totalSeleccionadas(): number {
    return this.propuestas.filter((p) => p.seleccionado).length;
  }

  get totalConCoincidencia(): number {
    return this.propuestas.filter((p) => p.estado === 'coincidencia').length;
  }

  get totalSinCoincidencia(): number {
    return this.propuestas.filter((p) => p.estado === 'sin-coincidencia').length;
  }

  // ------------------------------------------------------------
  //  APLICAR LOS CAMBIOS DE PRECIO
  // ------------------------------------------------------------

  aplicarCambios(): void {
    const seleccionadas = this.propuestas.filter(
      (p) => p.seleccionado && p.material
    );

    if (seleccionadas.length === 0) {
      return;
    }

    this.cargando = true;
    this.actualizacionesRealizadas = [];

    let completados = 0;
    const total = seleccionadas.length;

    seleccionadas.forEach((propuesta) => {
      this.service
        .actualizar(propuesta.material!.codigo, {
          precio: propuesta.precioNuevo
        })
        .subscribe({
          next: () => {
            this.actualizacionesRealizadas.push(propuesta);
            completados++;
            if (completados === total) {
              this.finalizarActualizacion();
            }
          },
          error: (err: any) => {
            console.error('Error actualizando precio:', err);
            completados++;
            if (completados === total) {
              this.finalizarActualizacion();
            }
          }
        });
    });
  }

  private finalizarActualizacion(): void {
    this.cargando = false;
    this.pantalla = 'resultado';
    this.preciosActualizados.emit();
  }

  formatoMoneda(valor: number | undefined): string {
    if (valor === undefined || valor === null || isNaN(valor)) {
      return 'N/D';
    }
    return valor.toLocaleString('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
