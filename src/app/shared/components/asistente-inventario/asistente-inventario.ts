import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { timeout } from 'rxjs';
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
  // Texto de <detAdicional nombre="Unidad">, ej. "SCO50KG" (saco de 50 kg)
  unidadFactura?: string;
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
  // Precio ya convertido a la unidad del catálogo (precioFactura ÷ divisor)
  precioNuevo: number;
  seleccionado: boolean;
  estado: 'coincidencia' | 'sin-coincidencia';
  // 0 a 1. 1 = descripción idéntica; menor = coincidencia aproximada (tipo LIKE)
  similitud: number;
  // Precio tal como viene en la factura (por saco, por varilla, por rollo…)
  precioFactura: number;
  // Cuántas unidades del catálogo trae cada unidad de la factura
  // (saco de 50 kg -> 50; varilla de 12 m -> 12). 1 = sin conversión.
  // Sale del XML y de la unidad del material: el usuario no lo modifica.
  divisor: number;
  // Presentación detectada en la factura, ej. "50 kg", "12 m"
  presentacion?: string;
}

// Presentación encontrada en una descripción: "SACO 50 KG" -> { cantidad: 50, unidad: 'kg' }
interface Presentacion {
  cantidad: number;
  unidad: string;
}

// Número encontrado en una descripción, con su unidad si la trae
// (ej. "08MM" -> { valor: '8', unidad: 'mm' })
interface NumeroConUnidad {
  valor: string;
  unidad: string;
}

// Descripción ya "desarmada" en palabras y números para poder compararla
interface TextoIndexado {
  palabras: string[];
  numeros: NumeroConUnidad[];
}

interface MaterialIndexado {
  material: materiales;
  normalizada: string;
  texto: TextoIndexado;
}

// Un material del catálogo que corresponde a una línea de la factura
interface Coincidencia {
  material: materiales;
  similitud: number;
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

  // ==========================================================
  //  AJUSTES DE LA COINCIDENCIA APROXIMADA
  // ==========================================================
  // Por debajo de este valor se considera "sin coincidencia"
  private static readonly SIMILITUD_MINIMA = 0.55;
  // Desde este valor la propuesta aparece marcada por defecto.
  // Entre el mínimo y este valor se muestra, pero la marcas tú.
  private static readonly SIMILITUD_AUTOMATICA = 0.8;
  // Tope de filas por cada línea de la factura (por si un nombre es muy genérico)
  private static readonly MAX_COINCIDENCIAS = 4;

  private static readonly PALABRAS_VACIAS = new Set([
    'de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'o', 'para',
    'con', 'en', 'por', 'un', 'una', 'x', 'tipo', 'unidad', 'und'
  ]);

  // Unidades de medida y sus variantes de escritura (MT, MTS, MTR -> m)
  private static readonly UNIDADES = new Map<string, string>([
    ['mm', 'mm'], ['mms', 'mm'],
    ['cm', 'cm'], ['cms', 'cm'],
    ['m', 'm'], ['mt', 'm'], ['mts', 'm'], ['mtr', 'm'], ['mtrs', 'm'],
    ['metro', 'm'], ['metros', 'm'],
    ['pulg', 'pulg'], ['plg', 'pulg'], ['pulgada', 'pulg'], ['pulgadas', 'pulg'],
    ['kg', 'kg'], ['kgs', 'kg'],
    ['lb', 'lb'], ['lbs', 'lb'],
    ['gl', 'gl'], ['gal', 'gl'], ['galon', 'gl'], ['galones', 'gl'],
    ['lt', 'l'], ['lts', 'l'], ['litro', 'l'], ['litros', 'l'],
    ['awg', 'awg']
  ]);

  // Cómo puede estar escrita la unidad en la columna "unidad" del catálogo
  // (texto libre). Solo se reconocen unidades de medida; "u", "unidad",
  // "saco", etc. no se convierten.
  private static readonly UNIDADES_CATALOGO = new Map<string, string>([
    ['kg', 'kg'], ['kgs', 'kg'], ['kilo', 'kg'], ['kilos', 'kg'],
    ['kilogramo', 'kg'], ['kilogramos', 'kg'],
    ['m', 'm'], ['ml', 'm'], ['mt', 'm'], ['mts', 'm'], ['mtr', 'm'],
    ['mtrs', 'm'], ['mtl', 'm'], ['metro', 'm'], ['metros', 'm'],
    ['lb', 'lb'], ['lbs', 'lb'], ['libra', 'lb'], ['libras', 'lb'],
    ['l', 'l'], ['lt', 'l'], ['lts', 'l'], ['litro', 'l'], ['litros', 'l'],
    ['gl', 'gl'], ['gal', 'gl'], ['galon', 'gl'], ['galones', 'gl']
  ]);

  // Unidades del catálogo que cuentan piezas o envases completos
  private static readonly UNIDADES_DE_ENVASE = new Set([
    'u', 'un', 'und', 'unid', 'unidad', 'unidades', 'pza', 'pz', 'pieza', 'piezas',
    'saco', 'sacos', 'bolsa', 'bolsas', 'rollo', 'rollos', 'caja', 'cajas',
    'par', 'juego', 'plancha', 'barra', 'lata', 'glb', 'global'
  ]);

  // Medidas que pueden ser el contenido de un envase (saco, galón, varilla…).
  // mm, cm y pulg se ignoran a propósito: son diámetros/espesores, no cantidad.
  private static readonly UNIDADES_DE_PRESENTACION = new Set(['kg', 'lb', 'l', 'gl', 'm']);

  // Conversión entre unidades de la misma magnitud:
  // CONVERSION[unidadFactura][unidadCatalogo] = cuántas del catálogo hay en 1 de la factura
  private static readonly CONVERSION: Record<string, Record<string, number>> = {
    kg: { lb: 2.20462 },
    lb: { kg: 0.453592 },
    l: { gl: 0.264172 },
    gl: { l: 3.78541 }
  };

  constructor(
    private service: MaterialeService,
    private cd: ChangeDetectorRef
  ) {}

  // La app corre sin zone.js: lo que cambia después de un await o de un
  // subscribe no se pinta solo. Por eso, tras cada cambio asíncrono se
  // fuerza el refresco (igual que hace InventarioComponent).
  private refrescar(): void {
    this.cd.detectChanges();
  }

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
      .replace(/\p{M}/gu, '')
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

  // Devuelve null si no se pudo cargar el catálogo (error o sin respuesta),
  // para no confundirlo con un catálogo realmente vacío.
  private obtenerMaterialesActuales(): Promise<materiales[] | null> {
    return new Promise((resolve) => {
      this.service.obtenerTodos().pipe(timeout(20000)).subscribe({
        next: ({ data, error }: any) => {
          if (error) {
            console.error('Error obteniendo materiales:', error);
            resolve(null);
            return;
          }
          resolve(data ?? []);
        },
        error: (err: any) => {
          console.error('Error obteniendo materiales:', err);
          resolve(null);
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
        const unidadFactura =
          detalle
            .querySelector('detAdicional[nombre="Unidad"]')
            ?.getAttribute('valor')
            ?.trim() || undefined;

        return {
          codigo: codigo || undefined,
          descripcion,
          descripcionNormalizada: this.normalizar(descripcion),
          cantidad,
          precioUnitario,
          unidadFactura
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
  //  EMPAREJAMIENTO POR DESCRIPCIÓN (aproximado, tipo LIKE)
  //
  //  El proveedor casi nunca escribe el producto igual que el
  //  catálogo (ej. factura: "VARILLA CORR. 08MM*12MT" / catálogo:
  //  "Varilla corrugada 8mm x 12m"). Por eso no se compara el texto
  //  completo: cada descripción se separa en palabras y medidas, y
  //  se puntúa qué tanto se parecen.
  //   - Palabras: iguales, en plural/singular o abreviadas
  //     ("corr" ~ "corrugada").
  //   - Medidas: "08mm" = "8mm". Si la unidad es la misma pero el
  //     número es distinto (8mm vs 10mm) NO se considera el mismo
  //     producto.
  // ------------------------------------------------------------

  // Quita plural y terminación de género: corrugadas/corrugado -> corrugad
  private raiz(palabra: string): string {
    let r = palabra;
    if (r.length > 4 && r.endsWith('s')) {
      r = r.slice(0, -1);
    }
    if (r.length >= 6 && /[aeo]$/.test(r)) {
      r = r.slice(0, -1);
    }
    return r;
  }

  private indexar(texto: string): TextoIndexado {
    const base = (texto ?? '')
      .toString()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();

    // Separa letras de números: "08mm*12mt" -> 08, mm, 12, mt
    const tokens = base.match(/\d+(?:[.,]\d+)?|[a-z]+/g) ?? [];

    const palabras: string[] = [];
    const numeros: NumeroConUnidad[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (/^\d/.test(token)) {
        const valor = String(parseFloat(token.replace(',', '.')));
        const siguiente = tokens[i + 1];
        const unidad = siguiente
          ? AsistenteInventarioComponent.UNIDADES.get(siguiente)
          : undefined;
        if (unidad) {
          i++; // la unidad se une al número que la precede
        }
        numeros.push({ valor, unidad: unidad ?? '' });
        continue;
      }

      if (
        token.length < 2 ||
        AsistenteInventarioComponent.PALABRAS_VACIAS.has(token) ||
        AsistenteInventarioComponent.UNIDADES.has(token)
      ) {
        continue;
      }

      palabras.push(this.raiz(token));
    }

    return { palabras, numeros };
  }

  private indexarCatalogo(lista: materiales[]): MaterialIndexado[] {
    return lista.map((material) => ({
      material,
      normalizada: this.normalizar(material.descripcion),
      texto: this.indexar(material.descripcion)
    }));
  }

  private palabrasSimilares(a: string, b: string): boolean {
    if (a === b) {
      return true;
    }
    // Una empieza como la otra (abreviatura): "corr" ~ "corrugad"
    return (
      Math.min(a.length, b.length) >= 3 &&
      (a.startsWith(b) || b.startsWith(a))
    );
  }

  // Devuelve un valor entre 0 y 1 (0 = no son el mismo producto)
  private puntuar(a: TextoIndexado, b: TextoIndexado): number {
    const totalA = a.palabras.length + a.numeros.length;
    const totalB = b.palabras.length + b.numeros.length;
    if (totalA === 0 || totalB === 0) {
      return 0;
    }

    // Medidas incompatibles: misma unidad pero ningún número en común
    const unidades = new Set([...a.numeros, ...b.numeros].map((n) => n.unidad));
    for (const unidad of unidades) {
      const valoresA = a.numeros.filter((n) => n.unidad === unidad).map((n) => n.valor);
      const valoresB = b.numeros.filter((n) => n.unidad === unidad).map((n) => n.valor);
      if (
        valoresA.length > 0 &&
        valoresB.length > 0 &&
        !valoresA.some((v) => valoresB.includes(v))
      ) {
        return 0;
      }
    }

    let palabrasCoinciden = 0;
    for (const palabra of a.palabras) {
      if (b.palabras.some((otra) => this.palabrasSimilares(palabra, otra))) {
        palabrasCoinciden++;
      }
    }

    // Con solo medidas iguales (sin ninguna palabra en común) no basta
    if (palabrasCoinciden === 0) {
      return 0;
    }

    let numerosCoinciden = 0;
    for (const numero of a.numeros) {
      const hay = b.numeros.some(
        (otro) =>
          otro.valor === numero.valor &&
          (otro.unidad === numero.unidad || !otro.unidad || !numero.unidad)
      );
      if (hay) {
        numerosCoinciden++;
      }
    }

    const coinciden = palabrasCoinciden + numerosCoinciden;
    const solapamiento = coinciden / Math.min(totalA, totalB); // ¿una está dentro de la otra?
    const dice = (2 * coinciden) / (totalA + totalB);          // ¿son de largo parecido?

    return 0.5 * solapamiento + 0.5 * dice;
  }

  // Devuelve TODOS los materiales que corresponden a la línea de la factura.
  // Normalmente es uno; pero si el catálogo tiene el mismo producto más de una
  // vez (ej. "CEMENTO" por SACO y "CEMENTO" por KG) salen todos, y cada uno se
  // revisa y actualiza por separado con su propia unidad.
  private buscarCoincidencias(
    item: ItemFactura,
    catalogo: MaterialIndexado[]
  ): Coincidencia[] {

    // 1) Descripción idéntica (ignorando mayúsculas, tildes y signos)
    const exactas = catalogo.filter(
      (c) => c.normalizada === item.descripcionNormalizada
    );
    if (exactas.length > 0) {
      return exactas
        .slice(0, AsistenteInventarioComponent.MAX_COINCIDENCIAS)
        .map((c) => ({ material: c.material, similitud: 1 }));
    }

    // 2) Coincidencia aproximada: el material más parecido y los que están
    //    igual de parecidos que él
    const textoItem = this.indexar(item.descripcion);

    const candidatos = catalogo
      .map((c) => ({
        material: c.material,
        similitud: this.puntuar(textoItem, c.texto)
      }))
      .filter((c) => c.similitud >= AsistenteInventarioComponent.SIMILITUD_MINIMA)
      .sort((a, b) => b.similitud - a.similitud);

    if (candidatos.length === 0) {
      return [];
    }

    const mejor = candidatos[0].similitud;
    return candidatos
      .filter((c) => mejor - c.similitud < 0.03)
      .slice(0, AsistenteInventarioComponent.MAX_COINCIDENCIAS);
  }

  // ------------------------------------------------------------
  //  CONVERSIÓN DE PRECIO A LA UNIDAD DEL CATÁLOGO
  //
  //  La factura cobra por presentación (un saco de 50 kg, una
  //  varilla de 12 m) pero el catálogo guarda el precio por
  //  unidad de medida (1 kg, 1 m). Entonces:
  //     precio catálogo = precio factura ÷ contenido de la presentación
  //  Ej.: cemento $7.8095 el saco de 50 kg -> $0.1562 el kg
  //       varilla $5.0041 la de 12 m       -> $0.4170 el m
  // ------------------------------------------------------------

  // Busca "50 kg", "12mt", "50KG" (también dentro de "SCO50KG")
  private detectarPresentaciones(texto: string | undefined): Presentacion[] {
    if (!texto) {
      return [];
    }

    const base = texto
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();

    const unidades = Array.from(AsistenteInventarioComponent.UNIDADES.keys())
      .sort((a, b) => b.length - a.length) // "mm" antes que "m"
      .join('|');

    // (?![a-z0-9]) evita confundir "m2" o "m3" con metros
    const patron = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${unidades})(?![a-z0-9])`, 'g');

    const encontradas: Presentacion[] = [];
    for (const coincidencia of base.matchAll(patron)) {
      const cantidad = parseFloat(coincidencia[1].replace(',', '.'));
      const unidad = AsistenteInventarioComponent.UNIDADES.get(coincidencia[2]);
      if (unidad && cantidad > 0) {
        encontradas.push({ cantidad, unidad });
      }
    }
    return encontradas;
  }

  // "Metro lineal", "ML", "Mts" -> 'm'; "KG" -> 'kg'; "SACO"/"U" -> undefined
  private unidadDelCatalogo(unidad: string | null | undefined): string | undefined {
    const limpia = this.normalizar(unidad)
      .replace(/\b(lineal|lineales|lin)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return AsistenteInventarioComponent.UNIDADES_CATALOGO.get(limpia);
  }

  private esUnidadDeEnvase(unidad: string | null | undefined): boolean {
    return AsistenteInventarioComponent.UNIDADES_DE_ENVASE.has(this.normalizar(unidad));
  }

  private calcularPresentacion(
    item: ItemFactura,
    material: materiales | undefined
  ): { divisor: number; presentacion?: string } {
    const encontradas = [
      ...this.detectarPresentaciones(item.descripcion),
      ...this.detectarPresentaciones(item.unidadFactura)
    ].filter((p) => AsistenteInventarioComponent.UNIDADES_DE_PRESENTACION.has(p.unidad));

    if (encontradas.length === 0) {
      return { divisor: 1 };
    }

    // Catálogo por pieza ("SACO", "U", "ROLLO"…): el precio de la factura
    // ya es por esa pieza, no hay nada que dividir ni que avisar.
    if (material && this.esUnidadDeEnvase(material.unidad)) {
      return { divisor: 1 };
    }

    const texto = (p: Presentacion) => `${p.cantidad} ${p.unidad}`;
    const destino = material ? this.unidadDelCatalogo(material.unidad) : undefined;

    if (destino) {
      // Misma unidad que el catálogo (12 m -> m) o convertible (50 kg -> lb)
      for (const p of encontradas) {
        const factor =
          p.unidad === destino
            ? 1
            : AsistenteInventarioComponent.CONVERSION[p.unidad]?.[destino];
        if (factor) {
          const divisor = this.redondear(p.cantidad * factor, 4);
          // "1 GL" con catálogo en galones: ya está por unidad, nada que dividir
          if (Math.abs(divisor - 1) < 0.005) {
            return { divisor: 1 };
          }
          return { divisor, presentacion: texto(p) };
        }
      }
    }

    // Hay contenido en la factura, pero el catálogo no está en esa unidad:
    // no se divide solo, se avisa para que el usuario decida.
    // (Un envase de "1" de algo no necesita conversión ni aviso.)
    const relevante = encontradas.find((p) => p.cantidad !== 1);
    return relevante ? { divisor: 1, presentacion: texto(relevante) } : { divisor: 1 };
  }

  private redondear(valor: number, decimales = 4): number {
    const factor = Math.pow(10, decimales);
    return Math.round(valor * factor) / factor;
  }

  // Enlaza la línea de la factura con un material y calcula su precio por
  // la unidad del catálogo (precio de la factura ÷ divisor)
  private asignarMaterial(
    propuesta: PropuestaActualizacion,
    material: materiales,
    similitud: number
  ): void {
    const { divisor, presentacion } = this.calcularPresentacion(propuesta.item, material);

    propuesta.material = material;
    propuesta.estado = 'coincidencia';
    propuesta.similitud = similitud;
    propuesta.precioAnterior = Number(material.precio);
    propuesta.divisor = divisor;
    propuesta.presentacion = presentacion;
    propuesta.precioNuevo = this.redondear(propuesta.precioFactura / divisor);
  }

  private hayCambioDePrecio(propuesta: PropuestaActualizacion): boolean {
    return (
      propuesta.precioAnterior === undefined ||
      Math.abs(propuesta.precioAnterior - propuesta.precioNuevo) > 0.0001
    );
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
    this.refrescar();

    try {
      const listaMateriales = await this.obtenerMaterialesActuales();

      if (listaMateriales === null) {
        this.erroresArchivos.push(
          'No pude cargar el catálogo de materiales. Revisa tu conexión e inténtalo de nuevo.'
        );
        return;
      }

      const catalogo = this.indexarCatalogo(listaMateriales);

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
            const coincidencias = this.buscarCoincidencias(item, catalogo);

            const nuevaPropuesta = (): PropuestaActualizacion => ({
              item,
              material: undefined,
              precioAnterior: undefined,
              precioNuevo: item.precioUnitario,
              seleccionado: false,
              estado: 'sin-coincidencia',
              similitud: 0,
              precioFactura: item.precioUnitario,
              divisor: 1,
              presentacion: undefined
            });

            // Sin coincidencia: una fila informativa
            if (coincidencias.length === 0) {
              this.propuestas.push(nuevaPropuesta());
              continue;
            }

            // Varias filas para un producto sin contenido en la factura (ej. solo
            // "CEMENTO"): no hay cómo saber cuál unidad corresponde, que marque el usuario.
            const traeContenido = [
              ...this.detectarPresentaciones(item.descripcion),
              ...this.detectarPresentaciones(item.unidadFactura)
            ].some(
              (p) =>
                AsistenteInventarioComponent.UNIDADES_DE_PRESENTACION.has(p.unidad) &&
                p.cantidad !== 1
            );
            const unidadIncierta = coincidencias.length > 1 && !traeContenido;

            // Una fila por cada material del catálogo que coincide, cada una
            // con su propia unidad, su divisor y su precio nuevo
            for (const coincidencia of coincidencias) {
              const propuesta = nuevaPropuesta();
              this.asignarMaterial(propuesta, coincidencia.material, coincidencia.similitud);

              const segura =
                coincidencia.similitud >= AsistenteInventarioComponent.SIMILITUD_AUTOMATICA;

              // Si la factura trae un contenido (50 kg) que no se pudo aplicar,
              // el precio podría estar en otra unidad: que lo confirme el usuario.
              const conversionPendiente = !!propuesta.presentacion && propuesta.divisor === 1;

              propuesta.seleccionado =
                segura &&
                !conversionPendiente &&
                !unidadIncierta &&
                this.hayCambioDePrecio(propuesta);

              this.propuestas.push(propuesta);
            }
          }
        } catch (error: any) {
          this.erroresArchivos.push(
            `${archivo.name}: ${error?.message ?? 'no se pudo procesar el archivo.'}`
          );
        }
      }

      this.pantalla = 'revision';
    } finally {
      // Siempre se quita el "Analizando…", pase lo que pase
      this.cargando = false;
      this.refrescar();
    }
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
    this.refrescar();

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
    this.refrescar();
  }

  formatoMoneda(valor: number | undefined): string {
    if (valor === undefined || valor === null || isNaN(valor)) {
      return 'N/D';
    }
    return valor.toLocaleString('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4 // precios por kg o por metro necesitan más de 2 decimales
    });
  }
}
