export interface ColumnaExport<T> {
  titulo: string;
  valor: (fila: T) => string | number | null | undefined;
}

/**
 * Descarga un CSV (separado por ";" y con BOM para que Excel respete tildes y ñ).
 */
export function descargarCsv<T>(nombreArchivo: string, columnas: ColumnaExport<T>[], filas: T[]): void {
  const escapar = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [
    columnas.map(c => escapar(c.titulo)).join(';'),
    ...filas.map(f => columnas.map(c => escapar(c.valor(f))).join(';'))
  ];
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fecha actual en formato aaaa-mm-dd (para nombres de archivo). */
export function hoyIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
