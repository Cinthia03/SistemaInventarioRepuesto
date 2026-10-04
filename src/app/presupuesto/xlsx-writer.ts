/**
 * Generador mínimo de archivos .xlsx (Office Open XML) SIN dependencias externas.
 *
 * Soporta lo necesario para replicar el formato de presupuesto del Excel de la empresa:
 * textos, números, fórmulas (con su valor ya calculado), celdas combinadas, anchos de
 * columna, fuentes en negrita, rellenos, bordes, alineación, formatos numéricos y
 * configuración de impresión (A4 vertical, ajustado al ancho, filas de título repetidas).
 */

export type EstiloBorde = 'thin' | 'medium' | null;

export interface EstiloCelda {
  bold?: boolean;
  fill?: string;            // color RGB, ej. 'BFBFBF'
  bordes?: { l?: EstiloBorde; r?: EstiloBorde; t?: EstiloBorde; b?: EstiloBorde };
  h?: 'left' | 'center' | 'right';
  v?: 'top' | 'center' | 'bottom';
  wrap?: boolean;
  numFmt?: string;          // ej. '#,##0.00', '0.00%'
}

export interface CeldaXlsx {
  valor?: string | number | null;
  formula?: string;         // sin el "=" inicial
  estilo?: EstiloCelda;
}

export interface HojaXlsx {
  nombre: string;
  anchos: number[];                       // ancho por columna (A, B, C...)
  filas: (CeldaXlsx | null)[][];          // filas[0] = fila 1
  altos?: Record<number, number>;         // fila (1-based) -> alto
  combinadas?: string[];                  // ej. 'A1:H1'
  filasTitulo?: [number, number];         // filas que se repiten al imprimir (ej. [1, 7])
}

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------

const escaparXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function letraColumna(indice: number): string {
  // 0 -> A, 25 -> Z, 26 -> AA
  let n = indice + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ------------------------------------------------------------------
// Estilos (styles.xml): se registran dinámicamente y se deduplican
// ------------------------------------------------------------------

class RegistroEstilos {
  private numFmts = new Map<string, number>();
  private fuentes: string[] = [];
  private rellenos: string[] = [];
  private bordes: string[] = [];
  private xfs: string[] = [];
  private indiceXf = new Map<string, number>();

  private static readonly NUMFMT_INTEGRADOS: Record<string, number> = {
    General: 0, '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9, '0.00%': 10,
  };

  constructor() {
    this.fuentes.push('<font><sz val="10"/><name val="Aptos"/><family val="2"/></font>');
    this.fuentes.push('<font><b/><sz val="10"/><name val="Aptos"/><family val="2"/></font>');
    this.rellenos.push('<fill><patternFill patternType="none"/></fill>');
    this.rellenos.push('<fill><patternFill patternType="gray125"/></fill>');
    this.bordes.push('<border><left/><right/><top/><bottom/><diagonal/></border>');
    this.indice({}); // estilo 0 por defecto
  }

  private agregar(lista: string[], xml: string): number {
    const i = lista.indexOf(xml);
    if (i >= 0) return i;
    lista.push(xml);
    return lista.length - 1;
  }

  private idNumFmt(fmt?: string): number {
    if (!fmt) return 0;
    if (fmt in RegistroEstilos.NUMFMT_INTEGRADOS) return RegistroEstilos.NUMFMT_INTEGRADOS[fmt];
    if (!this.numFmts.has(fmt)) this.numFmts.set(fmt, 164 + this.numFmts.size);
    return this.numFmts.get(fmt)!;
  }

  indice(e: EstiloCelda): number {
    const clave = JSON.stringify(e);
    const existente = this.indiceXf.get(clave);
    if (existente !== undefined) return existente;

    const fontId = e.bold ? 1 : 0;
    const fillId = e.fill
      ? this.agregar(this.rellenos,
          `<fill><patternFill patternType="solid"><fgColor rgb="FF${e.fill}"/><bgColor indexed="64"/></patternFill></fill>`)
      : 0;
    const b = e.bordes || {};
    const lado = (tag: string, st?: EstiloBorde) =>
      st ? `<${tag} style="${st}"><color indexed="64"/></${tag}>` : `<${tag}/>`;
    const borderId = this.agregar(this.bordes,
      `<border>${lado('left', b.l)}${lado('right', b.r)}${lado('top', b.t)}${lado('bottom', b.b)}<diagonal/></border>`);
    const numFmtId = this.idNumFmt(e.numFmt);

    const alineacion = (e.h || e.v || e.wrap)
      ? `<alignment${e.h ? ` horizontal="${e.h}"` : ''}${e.v ? ` vertical="${e.v}"` : ''}${e.wrap ? ' wrapText="1"' : ''}/>`
      : '';

    const xf =
      `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
      `${numFmtId ? ' applyNumberFormat="1"' : ''}${fontId ? ' applyFont="1"' : ''}${fillId ? ' applyFill="1"' : ''}` +
      `${borderId ? ' applyBorder="1"' : ''}${alineacion ? ' applyAlignment="1">' + alineacion + '</xf>' : '/>'}`;

    this.xfs.push(xf);
    const i = this.xfs.length - 1;
    this.indiceXf.set(clave, i);
    return i;
  }

  xml(): string {
    const numFmts = [...this.numFmts.entries()]
      .map(([fmt, id]) => `<numFmt numFmtId="${id}" formatCode="${escaparXml(fmt)}"/>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      (this.numFmts.size ? `<numFmts count="${this.numFmts.size}">${numFmts}</numFmts>` : '') +
      `<fonts count="${this.fuentes.length}">${this.fuentes.join('')}</fonts>` +
      `<fills count="${this.rellenos.length}">${this.rellenos.join('')}</fills>` +
      `<borders count="${this.bordes.length}">${this.bordes.join('')}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>';
  }
}

// ------------------------------------------------------------------
// Hoja (sheet1.xml)
// ------------------------------------------------------------------

function xmlHoja(hoja: HojaXlsx, estilos: RegistroEstilos): string {
  const ultimaCol = letraColumna(Math.max(hoja.anchos.length, 1) - 1);
  const cols = hoja.anchos
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');

  const filasXml = hoja.filas.map((fila, i) => {
    const r = i + 1;
    const alto = hoja.altos?.[r];
    const celdas = (fila || []).map((c, j) => {
      if (!c) return '';
      const ref = `${letraColumna(j)}${r}`;
      const s = c.estilo ? estilos.indice(c.estilo) : 0;
      const attrS = s ? ` s="${s}"` : '';
      const f = c.formula ? `<f>${escaparXml(c.formula)}</f>` : '';
      if (typeof c.valor === 'number' && isFinite(c.valor)) {
        return `<c r="${ref}"${attrS}>${f}<v>${c.valor}</v></c>`;
      }
      if (typeof c.valor === 'string' && c.valor !== '') {
        return c.formula
          ? `<c r="${ref}"${attrS} t="str">${f}<v>${escaparXml(c.valor)}</v></c>`
          : `<c r="${ref}"${attrS} t="inlineStr"><is><t xml:space="preserve">${escaparXml(c.valor)}</t></is></c>`;
      }
      return f ? `<c r="${ref}"${attrS}>${f}</c>` : (s ? `<c r="${ref}"${attrS}/>` : '');
    }).join('');
    return `<row r="${r}"${alto ? ` ht="${alto}" customHeight="1"` : ''}>${celdas}</row>`;
  }).join('');

  const merges = hoja.combinadas?.length
    ? `<mergeCells count="${hoja.combinadas.length}">${hoja.combinadas.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
    : '';

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<dimension ref="A1:${ultimaCol}${Math.max(hoja.filas.length, 1)}"/>` +
    '<sheetViews><sheetView workbookViewId="0" zoomScale="100"/></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="13.2"/>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${filasXml}</sheetData>` +
    merges +
    '<printOptions horizontalCentered="1"/>' +
    '<pageMargins left="0.5" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>';
}

// ------------------------------------------------------------------
// ZIP (método "store", sin compresión) + CRC32
// ------------------------------------------------------------------

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function crearZip(archivos: { nombre: string; contenido: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let offset = 0;

  for (const a of archivos) {
    const nombre = enc.encode(a.nombre);
    const datos = enc.encode(a.contenido);
    const crc = crc32(datos);

    const local = new Uint8Array(30 + nombre.length + datos.length);
    const vl = new DataView(local.buffer);
    vl.setUint32(0, 0x04034b50, true);
    vl.setUint16(4, 20, true);
    vl.setUint16(6, 0x0800, true);          // nombres en UTF-8
    vl.setUint16(8, 0, true);               // store
    vl.setUint16(10, 0, true);
    vl.setUint16(12, 0x21, true);           // fecha 1980-01-01
    vl.setUint32(14, crc, true);
    vl.setUint32(18, datos.length, true);
    vl.setUint32(22, datos.length, true);
    vl.setUint16(26, nombre.length, true);
    vl.setUint16(28, 0, true);
    local.set(nombre, 30);
    local.set(datos, 30 + nombre.length);
    locales.push(local);

    const central = new Uint8Array(46 + nombre.length);
    const vc = new DataView(central.buffer);
    vc.setUint32(0, 0x02014b50, true);
    vc.setUint16(4, 20, true);
    vc.setUint16(6, 20, true);
    vc.setUint16(8, 0x0800, true);
    vc.setUint16(10, 0, true);
    vc.setUint16(12, 0, true);
    vc.setUint16(14, 0x21, true);
    vc.setUint32(16, crc, true);
    vc.setUint32(20, datos.length, true);
    vc.setUint32(24, datos.length, true);
    vc.setUint16(28, nombre.length, true);
    vc.setUint32(42, offset, true);
    central.set(nombre, 46);
    centrales.push(central);

    offset += local.length;
  }

  const tamCentral = centrales.reduce((s, c) => s + c.length, 0);
  const fin = new Uint8Array(22);
  const vf = new DataView(fin.buffer);
  vf.setUint32(0, 0x06054b50, true);
  vf.setUint16(8, archivos.length, true);
  vf.setUint16(10, archivos.length, true);
  vf.setUint32(12, tamCentral, true);
  vf.setUint32(16, offset, true);

  const total = new Uint8Array(offset + tamCentral + 22);
  let p = 0;
  for (const parte of [...locales, ...centrales, fin]) {
    total.set(parte, p);
    p += parte.length;
  }
  return total;
}

// ------------------------------------------------------------------
// Libro completo
// ------------------------------------------------------------------

export function generarXlsx(hoja: HojaXlsx): Uint8Array {
  const estilos = new RegistroEstilos();
  const sheet = xmlHoja(hoja, estilos);
  const nombreHoja = escaparXml(hoja.nombre.slice(0, 31));

  const definidos = hoja.filasTitulo
    ? `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'${nombreHoja.replace(/'/g, "''")}'!$${hoja.filasTitulo[0]}:$${hoja.filasTitulo[1]}</definedName></definedNames>`
    : '';

  return crearZip([
    {
      nombre: '[Content_Types].xml',
      contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
    },
    {
      nombre: '_rels/.rels',
      contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      nombre: 'xl/workbook.xml',
      contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${nombreHoja}" sheetId="1" r:id="rId1"/></sheets>` +
        definidos +
        '<calcPr calcId="191029" fullCalcOnLoad="1"/>' +
        '</workbook>',
    },
    {
      nombre: 'xl/_rels/workbook.xml.rels',
      contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
    },
    { nombre: 'xl/worksheets/sheet1.xml', contenido: sheet },
    { nombre: 'xl/styles.xml', contenido: estilos.xml() },
  ]);
}
