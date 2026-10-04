/**
 * Arma el presupuesto con la MISMA estructura del formato Excel de la empresa
 * (hoja "PRESUPUESTO" de ANÁLISIS DE COSTOS UNITARIOS):
 *
 *   FORMATO PARA PRESUPUESTO
 *   PROYECTO DE CONSTRUCCIÓN DE / NÚMERO DE TRÁMITE / FECHA / ÁREA DE CONSTRUCCIÓN
 *   RUBRO | DETALLE | UNIDAD | CANTIDAD | COSTO UNITARIO (incluido iva) | SUBTOTAL | TOTAL | %
 *   1.0  OBRA GRIS ................................................ TOTAL   %
 *   1.1  INSTALACIONES PROVISIONALES .............................. TOTAL   %
 *   1.1.01 Caseta de oficina...   m2   16,00   45,00   720,00
 *   ...
 *   COSTO DIRECTO DE OBRA / COSTO INDIRECTO DE OBRA (20%) / TOTAL COSTOS DIRECTOS + INDIRECTOS
 *
 * Este archivo no depende de Angular: lo usan la vista en pantalla, la impresión y la
 * descarga del .xlsx, para que los tres salgan idénticos.
 */
import { CeldaXlsx, EstiloCelda, HojaXlsx, generarXlsx } from './xlsx-writer';

export interface EncabezadoPresupuesto {
  proyecto: string;
  numeroTramite: string;
  fecha: string;                 // yyyy-mm-dd
  areaConstruccion: number | null;
  porcentajeIndirecto: number;   // 0.20 = 20 %
}

/** Una línea (rubro) incluida en el presupuesto, tal como se guarda en presupuesto_items. */
export interface LineaPresupuesto {
  categoriaCodigo: string;       // '1.0'
  categoriaNombre: string;       // 'OBRA GRIS'
  subcategoriaCodigo: string;    // '1.1' ('' si la categoría no tiene subcategorías, p.ej. Eléctrico)
  subcategoriaNombre: string;
  codigo: string;                // '1.1.01'
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  personalizado?: boolean;
}

export interface ItemFormato {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  personalizado: boolean;
}

export interface SubcategoriaFormato {
  codigo: string;
  nombre: string;
  total: number;
  porcentaje: number;
  items: ItemFormato[];
}

export interface CategoriaFormato {
  codigo: string;
  nombre: string;
  total: number;
  porcentaje: number;
  subcategorias: SubcategoriaFormato[];
}

export interface PresupuestoFormato {
  encabezado: EncabezadoPresupuesto;
  categorias: CategoriaFormato[];
  costoDirecto: number;
  costoIndirecto: number;
  total: number;
}

export const redondear2 = (n: number) => Math.round((Number(n) || 0) * 100 + Number.EPSILON) / 100;
const redondear4 = (n: number) => Math.round((Number(n) || 0) * 10000 + Number.EPSILON) / 10000;

export const compararCodigos = (a: string, b: string) =>
  (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });

export function construirFormato(
  encabezado: EncabezadoPresupuesto,
  lineas: LineaPresupuesto[],
): PresupuestoFormato {
  const categorias: CategoriaFormato[] = [];

  for (const l of lineas) {
    let cat = categorias.find(c => c.codigo === l.categoriaCodigo);
    if (!cat) {
      cat = { codigo: l.categoriaCodigo, nombre: l.categoriaNombre, total: 0, porcentaje: 0, subcategorias: [] };
      categorias.push(cat);
    }
    let sub = cat.subcategorias.find(s => s.codigo === l.subcategoriaCodigo && s.nombre === l.subcategoriaNombre);
    if (!sub) {
      sub = { codigo: l.subcategoriaCodigo, nombre: l.subcategoriaNombre, total: 0, porcentaje: 0, items: [] };
      cat.subcategorias.push(sub);
    }
    const cantidad = Number(l.cantidad) || 0;
    const precioUnitario = redondear2(l.precioUnitario);
    sub.items.push({
      codigo: l.codigo,
      descripcion: l.descripcion,
      unidad: l.unidad,
      cantidad,
      precioUnitario,
      subtotal: redondear2(cantidad * precioUnitario),   // = ROUND(D*E,2) del Excel
      personalizado: !!l.personalizado,
    });
  }

  categorias.sort((a, b) => compararCodigos(a.codigo, b.codigo));
  let costoDirecto = 0;
  for (const cat of categorias) {
    cat.subcategorias.sort((a, b) => compararCodigos(a.codigo, b.codigo));
    for (const sub of cat.subcategorias) {
      sub.items.sort((a, b) => compararCodigos(a.codigo, b.codigo));
      sub.total = redondear2(sub.items.reduce((s, i) => s + i.subtotal, 0));
      cat.total = redondear2(cat.total + sub.total);
    }
    costoDirecto = redondear2(costoDirecto + cat.total);
  }
  for (const cat of categorias) {
    cat.porcentaje = costoDirecto ? redondear4(cat.total / costoDirecto) : 0;
    for (const sub of cat.subcategorias) {
      sub.porcentaje = costoDirecto ? redondear4(sub.total / costoDirecto) : 0;
    }
  }

  const costoIndirecto = redondear2(costoDirecto * (Number(encabezado.porcentajeIndirecto) || 0));
  return {
    encabezado,
    categorias,
    costoDirecto,
    costoIndirecto,
    total: redondear2(costoDirecto + costoIndirecto),
  };
}

/** dd/mm/aaaa a partir de 'yyyy-mm-dd' (o de un ISO completo). */
export function fechaFormato(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (fecha || '');
}

// ------------------------------------------------------------------
// Exportación a Excel (.xlsx) con el formato de la empresa
// ------------------------------------------------------------------

const FMT_NUM = '#,##0.00';
const FMT_MONEDA = '_ "$"* #,##0.00_ ;_ "$"* \\-#,##0.00_ ;_ "$"* "-"??_ ;_ @_ ';
const FMT_PCT = '0.00%';
const GRIS = 'BFBFBF';

export function construirHojaExcel(p: PresupuestoFormato): HojaXlsx {
  const filas: (CeldaXlsx | null)[][] = [];
  const combinadas: string[] = [];
  const fila = (celdas: (CeldaXlsx | null)[]) => { filas.push(celdas); return filas.length; };

  const borde = 'thin' as const;
  const caja = { l: borde, r: borde, t: borde, b: borde };
  const etiqueta = (v: string): CeldaXlsx => ({ valor: v, estilo: { bold: true, h: 'left', v: 'center', bordes: caja } });
  const valorEnc = (v: string | number | null, numFmt?: string): CeldaXlsx =>
    ({ valor: v ?? '', estilo: { bold: true, h: 'center', v: 'center', bordes: caja, numFmt } });
  const bordeSolo: CeldaXlsx = { estilo: { bordes: caja } };

  // --- Encabezado (filas 1 a 5) ---
  const e = p.encabezado;
  fila([{ valor: 'FORMATO PARA PRESUPUESTO', estilo: { bold: true, h: 'center', v: 'center' } }]);
  combinadas.push('A1:H1');
  const datos: [string, string | number | null][] = [
    ['PROYECTO DE CONSTRUCCIÓN DE:', e.proyecto],
    ['NÚMERO DE TRÁMITE:', e.numeroTramite],
    ['FECHA:', fechaFormato(e.fecha)],
    ['AREA DE CONSTRUCCIÓN: m²', e.areaConstruccion],
  ];
  for (const [et, v] of datos) {
    const r = fila([etiqueta(et), bordeSolo,
      valorEnc(v, typeof v === 'number' ? FMT_NUM : undefined), bordeSolo, bordeSolo, bordeSolo, bordeSolo, bordeSolo]);
    combinadas.push(`A${r}:B${r}`, `C${r}:H${r}`);
  }

  // --- Cabecera de la tabla (filas 6 y 7 combinadas verticalmente) ---
  const titulos = ['RUBRO', 'DETALLE', 'UNIDAD', 'CANTIDAD', 'COSTO UNITARIO (incluido iva)', 'SUBTOTAL', 'TOTAL', '%'];
  const estTitulo = (i: number): EstiloCelda => ({
    bold: true, h: 'center', v: 'center', wrap: i === 4,
    bordes: { l: i === 0 || i === 7 ? 'medium' : 'thin', r: i >= 6 ? 'medium' : 'thin', t: 'medium', b: 'medium' },
  });
  const rTit = fila(titulos.map((t, i) => ({ valor: t, estilo: estTitulo(i) })));
  fila(titulos.map((_, i) => ({ estilo: estTitulo(i) })));
  'ABCDEFGH'.split('').forEach(c => combinadas.push(`${c}${rTit}:${c}${rTit + 1}`));
  fila([]); // fila 8 en blanco

  // --- Cuerpo ---
  // Las fórmulas de % se completan al final, cuando se conoce la fila de COSTO DIRECTO.
  const pendientesPct: { celda: CeldaXlsx; filaTotal: number }[] = [];

  for (const cat of p.categorias) {
    const estCat = (extra: EstiloCelda = {}): EstiloCelda =>
      ({ bold: true, fill: GRIS, v: 'center', bordes: { t: 'medium', b: 'medium' }, ...extra });
    const celdaPctCat: CeldaXlsx = { valor: cat.porcentaje, estilo: estCat({ numFmt: FMT_PCT, bordes: { r: 'medium', t: 'medium', b: 'medium' } }) };
    const celdaTotCat: CeldaXlsx = {
      valor: cat.total,
      estilo: estCat({ h: 'right', numFmt: FMT_MONEDA, bordes: { l: 'medium', r: 'medium', t: 'medium', b: 'medium' } }),
    };
    const rCat = fila([
      { valor: cat.codigo, estilo: estCat({ h: 'center', bordes: { l: 'medium', t: 'medium', b: 'medium' } }) },
      { valor: cat.nombre, estilo: estCat({ h: 'left' }) },
      { estilo: estCat() }, { estilo: estCat() }, { estilo: estCat() }, { estilo: estCat() },
      celdaTotCat, celdaPctCat,
    ]);
    pendientesPct.push({ celda: celdaPctCat, filaTotal: rCat });
    fila([]);

    const inicioCat = filas.length + 1;
    cat.subcategorias.forEach(sub => {
      let inicioSub = filas.length + 1;
      // Si la categoría no tiene subcategorías (ej. Eléctrico: 4.01, 4.02...) no se imprime la fila de subcategoría.
      const conFilaSub = !!sub.codigo || cat.subcategorias.length > 1;
      let celdaTotSub: CeldaXlsx | null = null;
      if (conFilaSub) {
        const celdaPctSub: CeldaXlsx = { valor: sub.porcentaje, estilo: { bold: true, v: 'center', numFmt: FMT_PCT } };
        celdaTotSub = {
          valor: sub.total,
          estilo: { h: 'right', v: 'center', numFmt: FMT_MONEDA, bordes: { l: 'medium', r: 'medium', t: 'medium', b: 'medium' } },
        };
        const rSub = fila([
          { valor: sub.codigo, estilo: { bold: true, h: 'center', v: 'center' } },
          { valor: sub.nombre, estilo: { bold: true, v: 'center' } },
          null, null, null, null, celdaTotSub, celdaPctSub,
        ]);
        pendientesPct.push({ celda: celdaPctSub, filaTotal: rSub });
        inicioSub = rSub;
      }

      for (const it of sub.items) {
        const r = filas.length + 1;
        fila([
          { valor: it.codigo, estilo: { h: 'center', v: 'center' } },
          { valor: it.descripcion, estilo: { v: 'center', wrap: true } },
          { valor: it.unidad, estilo: { h: 'center', v: 'center' } },
          { valor: it.cantidad, estilo: { h: 'right', v: 'center', numFmt: FMT_NUM } },
          { valor: it.precioUnitario, estilo: { h: 'right', v: 'center', numFmt: FMT_NUM } },
          { valor: it.subtotal, formula: `ROUND(D${r}*E${r},2)`, estilo: { h: 'right', v: 'center', numFmt: FMT_NUM } },
        ]);
      }
      if (celdaTotSub) celdaTotSub.formula = `SUM(F${inicioSub}:F${filas.length})`;
      fila([]); // fila en blanco entre subcategorías, como en el formato
    });
    celdaTotCat.formula = `SUM(F${inicioCat}:F${filas.length})`;
  }

  // --- Totales ---
  fila([]);
  const estTot = (extra: EstiloCelda = {}): EstiloCelda => ({ v: 'center', bordes: caja, ...extra });
  const rDir = fila([
    null,
    { valor: 'COSTO DIRECTO DE OBRA:', estilo: estTot({ bold: true, h: 'left' }) },
    { estilo: estTot() }, { estilo: estTot() }, { estilo: estTot() },
    { valor: p.costoDirecto, formula: `SUM(F9:F${filas.length})`, estilo: estTot({ bold: true, numFmt: FMT_NUM }) },
  ]);
  const rInd = fila([
    null,
    { valor: 'COSTO INDIRECTO DE OBRA:', estilo: estTot({ bold: true, h: 'left' }) },
    { estilo: estTot() }, { estilo: estTot() },
    { valor: Number(p.encabezado.porcentajeIndirecto) || 0, estilo: estTot({ bold: true, h: 'center', numFmt: FMT_PCT }) },
    { valor: p.costoIndirecto, formula: `ROUND(F${rDir}*E${filas.length + 1},2)`, estilo: estTot({ numFmt: FMT_NUM }) },
  ]);
  fila([
    null,
    { valor: 'TOTAL COSTOS DIRECTOS + INDIRECTOS', estilo: estTot({ bold: true }) },
    { estilo: estTot() }, { estilo: estTot() }, { estilo: estTot() },
    { valor: p.total, formula: `ROUND(SUM(F${rDir}:F${rInd}),2)`, estilo: estTot({ bold: true, numFmt: FMT_NUM }) },
  ]);

  for (const { celda, filaTotal } of pendientesPct) {
    celda.formula = `IF($F$${rDir}=0,0,ROUND(G${filaTotal}/$F$${rDir},4))`;
  }

  return {
    nombre: 'PRESUPUESTO',
    anchos: [8.5, 48, 8.5, 11, 15.5, 12.5, 15.7, 8.5],
    filas,
    altos: { 6: 15, 7: 15 },
    combinadas,
    filasTitulo: [1, 7],
  };
}

export function generarExcelPresupuesto(p: PresupuestoFormato): Uint8Array {
  return generarXlsx(construirHojaExcel(p));
}

/** Descarga el presupuesto como .xlsx en el navegador. */
export function descargarExcelPresupuesto(p: PresupuestoFormato): void {
  const bytes = generarExcelPresupuesto(p);
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const nombreBase = (p.encabezado.proyecto || 'presupuesto')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'presupuesto';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PRESUPUESTO_${nombreBase}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ------------------------------------------------------------------
// Impresión / PDF: SOLO la hoja con el formato (no la pantalla completa)
// ------------------------------------------------------------------

const ESTILOS_IMPRESION = `
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; }
  body { font-family: Aptos, Calibri, Arial, sans-serif; font-size: 9.5px; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hoja-formato { width: 100%; border-collapse: collapse; }
  .hoja-formato thead { display: table-header-group; }
  .hoja-formato tr { break-inside: avoid; page-break-inside: avoid; }
  .hoja-formato td, .hoja-formato th { padding: 2px 5px; vertical-align: middle; }
  .hf-c-rubro { width: 7%; } .hf-c-detalle { width: 38%; } .hf-c-unidad { width: 7%; }
  .hf-c-cant { width: 9%; } .hf-c-pu { width: 12%; } .hf-c-sub { width: 10%; }
  .hf-c-total { width: 11%; } .hf-c-pct { width: 6%; }
  .hf-titulo { text-align: center; font-weight: 700; padding-bottom: 6px !important; font-size: 11px; }
  .hf-enc th, .hf-enc td { border: 1px solid #000; font-weight: 700; }
  .hf-enc th { text-align: left; } .hf-enc td { text-align: center; }
  .hf-cols th { border: 2px solid #000; border-left-width: 1px; border-right-width: 1px;
                text-align: center; font-weight: 700; padding: 6px 3px; }
  .hf-cols th:first-child { border-left-width: 2px; }
  .hf-cols th:nth-last-child(-n+2) { border-right-width: 2px; }
  .hf-espacio td { height: 6px; padding: 0; }
  .hf-cat td { background: #bfbfbf; font-weight: 700; border-top: 2px solid #000; border-bottom: 2px solid #000; }
  .hf-cat td:first-child { border-left: 2px solid #000; }
  .hf-cat td:last-child { border-right: 2px solid #000; }
  .hf-sub td { font-weight: 700; }
  .hf-total { text-align: right; white-space: nowrap; border: 2px solid #000; }
  .hf-sub .hf-total { font-weight: 400; }
  .hf-num { text-align: right; white-space: nowrap; }
  .hf-centro { text-align: center; white-space: nowrap; }
  .hf-negrita { font-weight: 700; }
  .hf-pie th, .hf-pie td { border: 1px solid #000; }
  .hf-pie th { text-align: left; font-weight: 700; }
  .hf-pie td:first-child, .hf-pie .hf-sin-borde { border: none; }
`;

/**
 * Imprime (o guarda como PDF desde el diálogo del navegador) únicamente la tabla del
 * formato, usando un iframe oculto: así no salen el menú, el banner, los botones ni el footer.
 */
export function imprimirHojaFormato(hoja: HTMLElement, titulo: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    iframe.remove();
    window.print();
    return;
  }

  const tituloSeguro = titulo.replace(/[<>&]/g, '');
  doc.open();
  doc.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${tituloSeguro}</title>`
    + `<style>${ESTILOS_IMPRESION}</style></head><body>${hoja.outerHTML}</body></html>`);
  doc.close();

  const ventana = iframe.contentWindow;
  const limpiar = () => setTimeout(() => iframe.remove(), 500);
  ventana.addEventListener('afterprint', limpiar);
  setTimeout(() => {
    ventana.focus();
    ventana.print();
    setTimeout(() => iframe.isConnected && iframe.remove(), 60000);   // por si el navegador no emite afterprint
  }, 250);
}
