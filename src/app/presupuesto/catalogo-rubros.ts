/**
 * Catálogo base de rubros tomado del formato "ANÁLISIS DE COSTOS UNITARIOS" (hoja PRESUPUESTO).
 *
 * Define el ORDEN y la NUMERACIÓN oficial del presupuesto (1.0 Obra Gris, 1.1 Instalaciones
 * provisionales, 1.1.01 ...). Al armar un presupuesto, este catálogo se fusiona con los rubros
 * guardados en Supabase (que aportan el P.U. calculado con su APU): así siempre aparecen TODOS
 * los rubros del formato, aunque todavía no tengan APU calculado.
 */
export interface RubroCatalogo { codigo: string; descripcion: string; unidad: string; }
export interface SubcategoriaCatalogo { codigo: string; nombre: string; rubros: RubroCatalogo[]; }
export interface CategoriaCatalogo { clave: string; codigo: string; nombre: string; subcategorias: SubcategoriaCatalogo[]; }

export const CATALOGO_RUBROS: CategoriaCatalogo[] = [
  {
    clave: 'obra-gris', codigo: '1.0', nombre: 'OBRA GRIS',
    subcategorias: [
      {
        codigo: '1.1', nombre: 'INSTALACIONES PROVISIONALES',
        rubros: [
          { codigo: '1.1.01', descripcion: 'Caseta de oficina, bodega y guardiania', unidad: 'm2' },
          { codigo: '1.1.02', descripcion: 'Instalación eléctrica provisional', unidad: 'Global' },
          { codigo: '1.1.03', descripcion: 'Instalación AAPP provisional', unidad: 'Global' },
          { codigo: '1.1.04', descripcion: 'Cerramiento de Obra', unidad: 'ml' },
        ],
      },
      {
        codigo: '1.2', nombre: 'MANTENIMIENTO DE OBRA',
        rubros: [
          { codigo: '1.2.01', descripcion: 'Limpieza general de la obra', unidad: 'semana' },
          { codigo: '1.2.02', descripcion: 'Desalojo de limpieza', unidad: 'viajes' },
        ],
      },
      {
        codigo: '1.3', nombre: 'PREPARACION DEL TERRENO',
        rubros: [
          { codigo: '1.3.01', descripcion: 'Limpieza del terreno', unidad: 'm2' },
          { codigo: '1.3.02', descripcion: 'Replanteo y trazado de cimientos', unidad: 'm2' },
        ],
      },
      {
        codigo: '1.4', nombre: 'MOVIMIENTOS DE TIERRA',
        rubros: [
          { codigo: '1.4.01', descripcion: 'Excavacion', unidad: 'm3' },
          { codigo: '1.4.02', descripcion: 'Relleno compactado con material importado', unidad: 'm3' },
        ],
      },
      {
        codigo: '1.5', nombre: 'ESTRUCTURAS DE HORMIGON SIMPLE',
        rubros: [
          { codigo: '1.5.01', descripcion: 'Replantillo e= 10cm', unidad: 'm3' },
          { codigo: '1.5.02', descripcion: 'Muro Ciclopeo', unidad: 'm3' },
        ],
      },
      {
        codigo: '1.6', nombre: 'ESTRUCTURAS DE HORMIGON ARMADO',
        rubros: [
          { codigo: '1.6.01', descripcion: 'Zapatas y vigas: en cimientos', unidad: 'm3' },
          { codigo: '1.6.02', descripcion: 'Riostras', unidad: 'm3' },
          { codigo: '1.6.03', descripcion: 'Columnas cimiento a losa vivienda', unidad: 'm3' },
          { codigo: '1.6.04', descripcion: 'Columnas losa a cubierta', unidad: 'm3' },
          { codigo: '1.6.05', descripcion: 'Columnas cimiento a losa garaje', unidad: 'm3' },
          { codigo: '1.6.06', descripcion: 'Vigas losa entrepiso', unidad: 'm3' },
          { codigo: '1.6.07', descripcion: 'Losa entrepiso e= 25cm', unidad: 'm2' },
          { codigo: '1.6.08', descripcion: 'Escaleras de hormigon', unidad: 'm3' },
          { codigo: '1.6.09', descripcion: 'Vigas de cubierta', unidad: 'm3' },
          { codigo: '1.6.10', descripcion: 'Vigas losa de garaje', unidad: 'm3' },
          { codigo: '1.6.11', descripcion: 'Losa garaje e= 25cm', unidad: 'm2' },
          { codigo: '1.6.12', descripcion: 'Cisterna', unidad: 'm3' },
        ],
      },
      {
        codigo: '1.7', nombre: 'ESTRUCTURAS METALICAS Y CUBIERTAS',
        rubros: [
          { codigo: '1.7.01', descripcion: 'Estructuras metalicas: de cubierta', unidad: 'kg' },
          { codigo: '1.7.02', descripcion: 'Cubierta Eternit', unidad: 'm2' },
          { codigo: '1.7.03', descripcion: 'Tejas sobre cubierta', unidad: 'm2' },
        ],
      },
      {
        codigo: '1.8', nombre: 'CONTRAPISOS',
        rubros: [
          { codigo: '1.8.01', descripcion: 'Contrapiso interior hormigon simple e= 10cm', unidad: 'm2' },
        ],
      },
      {
        codigo: '1.9', nombre: 'ALBAÑILERIAS',
        rubros: [
          { codigo: '1.9.01', descripcion: 'Pared mamposteria bloque e= 19cm', unidad: 'm2' },
          { codigo: '1.9.02', descripcion: 'Pared mamposteria bloque e= 9cm', unidad: 'm2' },
          { codigo: '1.9.03', descripcion: 'Viguetas y pilaretes h. armado 19x20cm', unidad: 'ml' },
          { codigo: '1.9.04', descripcion: 'Viguetas y pilaretes h. armado 9x20cm', unidad: 'ml' },
          { codigo: '1.9.05', descripcion: 'Enlucido interior', unidad: 'm2' },
          { codigo: '1.9.06', descripcion: 'Enlucido exterior', unidad: 'm2' },
          { codigo: '1.9.07', descripcion: 'Enlucido de columnas', unidad: 'm2' },
          { codigo: '1.9.08', descripcion: 'Enlucido de tumbado de losa', unidad: 'm2' },
          { codigo: '1.9.09', descripcion: 'Enlucido sobre losas de cubierta', unidad: 'm2' },
          { codigo: '1.9.10', descripcion: 'Enlucido de escalera (rampa y escalones)', unidad: 'm2' },
          { codigo: '1.9.11', descripcion: 'Filos de columnas y paredes', unidad: 'ml' },
          { codigo: '1.9.12', descripcion: 'Cuadrada de boquetes', unidad: 'ml' },
          { codigo: '1.9.13', descripcion: 'Molduras en cubiertas', unidad: 'ml' },
          { codigo: '1.9.14', descripcion: 'Molduras en ventanas', unidad: 'ml' },
          { codigo: '1.9.15', descripcion: 'Meson de h. armado en cocina', unidad: 'ml' },
          { codigo: '1.9.16', descripcion: 'Meson de h. armado en baños', unidad: 'ml' },
          { codigo: '1.9.17', descripcion: 'Muro de tina de baño (inc. EnlucIdo)', unidad: 'ml' },
          { codigo: '1.9.18', descripcion: 'Cajas de registro (h. simple) AA.SS.', unidad: 'u' },
          { codigo: '1.9.19', descripcion: 'Cajas de registro (h. simple) AA.LL.', unidad: 'u' },
          { codigo: '1.9.20', descripcion: 'Sumidero (h. simple) AA.LL.', unidad: 'u' },
          { codigo: '1.9.21', descripcion: 'Cajas de paso (mamposteria.) Electrica', unidad: 'u' },
          { codigo: '1.9.22', descripcion: 'Enlucido cisterna', unidad: 'm2' },
          { codigo: '1.9.23', descripcion: 'Impermeabilizacion en losa de cubiertas y cisterna', unidad: 'm2' },
        ],
      },
    ],
  },
  {
    clave: 'obra-de-acabados', codigo: '2.0', nombre: 'OBRAS DE ACABADOS',
    subcategorias: [
      {
        codigo: '2.1', nombre: 'REVESTIMIENTOS',
        rubros: [
          { codigo: '2.1.01', descripcion: 'Pintura Interior: caucho (paredes)', unidad: 'm2' },
          { codigo: '2.1.02', descripcion: 'Pintura Interior: caucho (tumbado)', unidad: 'm2' },
          { codigo: '2.1.03', descripcion: 'Pintura exterior: elastomérica', unidad: 'm2' },
          { codigo: '2.1.04', descripcion: 'Cerámica en paredes', unidad: 'm2' },
          { codigo: '2.1.05', descripcion: 'Revestimiento de meson en cocina', unidad: 'ml' },
          { codigo: '2.1.06', descripcion: 'Revestimiento de meson en baños', unidad: 'ml' },
          { codigo: '2.1.07', descripcion: 'Porcelanato en pisos', unidad: 'm2' },
          { codigo: '2.1.08', descripcion: 'Cerámica en pisos de baños, servicio, bodega, lavanderia', unidad: 'm2' },
          { codigo: '2.1.09', descripcion: 'Revestimiento de escalera', unidad: 'm2' },
          { codigo: '2.1.10', descripcion: 'Rastreras de porcelanato; sala-comedor-estar-dormitorios', unidad: 'ml' },
        ],
      },
      {
        codigo: '2.2', nombre: 'CIELOS RASOS',
        rubros: [
          { codigo: '2.2.01', descripcion: 'Gypsum (tipo losa)', unidad: 'm2' },
        ],
      },
      {
        codigo: '2.3', nombre: 'CARPINTERIA: ALUMINIO - VIDRIO',
        rubros: [
          { codigo: '2.3.01', descripcion: 'Ventanas aluminio y vidrio', unidad: 'm2' },
          { codigo: '2.3.02', descripcion: 'Puertas aluminio y vidrio', unidad: 'm2' },
          { codigo: '2.3.03', descripcion: 'Pasamanos', unidad: 'ml' },
        ],
      },
      {
        codigo: '2.4', nombre: 'CARPINTERIA: MADERA',
        rubros: [
          { codigo: '2.4.01', descripcion: 'Puertas madera (1,60m x 2. 50m) Principal', unidad: 'u' },
          { codigo: '2.4.02', descripcion: 'Puertas madera (0.80m x 2. 00m) Cocina', unidad: 'u' },
          { codigo: '2.4.03', descripcion: 'Puertas madera (0.80m x 2. 00m)', unidad: 'u' },
          { codigo: '2.4.04', descripcion: 'Puertas madera (0.70m x 2. 00m)', unidad: 'u' },
          { codigo: '2.4.05', descripcion: 'Puertas madera (0.60m x 2. 00m)', unidad: 'u' },
          { codigo: '2.4.06', descripcion: 'Closets', unidad: 'Global' },
          { codigo: '2.4.07', descripcion: 'Anaqueles de cocina bajo meson', unidad: 'ml' },
          { codigo: '2.4.08', descripcion: 'Anaqueles de cocina sobre meson', unidad: 'ml' },
        ],
      },
      {
        codigo: '2.5', nombre: 'OBRAS ADICIONALES',
        rubros: [
          { codigo: '2.5.01', descripcion: 'Cerramiento (inc. Mamposteria y estructura)', unidad: 'm2' },
          { codigo: '2.5.02', descripcion: 'Enlucido Cerramiento ( lateral 1 lado)', unidad: 'm2' },
          { codigo: '2.5.03', descripcion: 'Enlucido Cerramiento (frontal 2 lados)', unidad: 'm2' },
          { codigo: '2.5.04', descripcion: 'Pintura cerramiento: ( lateral 1 lado+frontal 2 lados)', unidad: 'm2' },
          { codigo: '2.5.05', descripcion: 'Pavimento en ingreso y parqueos (con malla elect.)', unidad: 'm2' },
          { codigo: '2.5.06', descripcion: 'Pavimento en patios y area posterior (h. simple)', unidad: 'm2' },
          { codigo: '2.5.07', descripcion: 'Escalones de hormigon simple', unidad: 'ml' },
          { codigo: '2.5.08', descripcion: 'Revestimiento de escalones', unidad: 'ml' },
          { codigo: '2.5.09', descripcion: 'Puertas metálicas (0.90m x 2. 00m).', unidad: 'U' },
          { codigo: '2.5.10', descripcion: 'Tapa metalica de cisterna', unidad: 'U' },
        ],
      },
    ],
  },
  {
    clave: 'sistema-hidraulico-sanitario', codigo: '3.0', nombre: 'SISTEMA HIDRÁULICO SANITARIO',
    subcategorias: [
      {
        codigo: '3.1', nombre: 'SISTEMA DE AGUA POTABLE',
        rubros: [
          { codigo: '3.1.01', descripcion: 'Redes de PVC presión roscable 3/4 fria', unidad: 'ml' },
          { codigo: '3.1.02', descripcion: 'Redes de PVC presión roscable 3/4 caliente', unidad: 'ml' },
          { codigo: '3.1.03', descripcion: 'Puntos de agua fria', unidad: 'U' },
          { codigo: '3.1.04', descripcion: 'Puntos de agua caliente', unidad: 'U' },
          { codigo: '3.1.05', descripcion: 'Medidor', unidad: 'U' },
          { codigo: '3.1.06', descripcion: 'Valvulas de control', unidad: 'U' },
        ],
      },
      {
        codigo: '3.2', nombre: 'SISTEMA DE AGUAS SERVIDAS',
        rubros: [
          { codigo: '3.2.01', descripcion: 'Tuberia PVC des ø 110mm', unidad: 'ml' },
          { codigo: '3.2.02', descripcion: 'Tuberia PVC des ø 50mm', unidad: 'ml' },
          { codigo: '3.2.03', descripcion: 'Bajante PVC des ø 110mm', unidad: 'ml' },
          { codigo: '3.2.04', descripcion: 'Puntos de 110mm', unidad: 'U' },
          { codigo: '3.2.05', descripcion: 'Puntos de 50mm', unidad: 'U' },
          { codigo: '3.2.06', descripcion: 'Rejilla des 50mm', unidad: 'U' },
        ],
      },
      {
        codigo: '3.3', nombre: 'SISTEMA DE AGUAS LLUVIAS',
        rubros: [
          { codigo: '3.3.01', descripcion: 'Tuberia PVC des ø 110mm', unidad: 'ml' },
          { codigo: '3.3.02', descripcion: 'Rejilla sumidero 110mm', unidad: 'U' },
        ],
      },
      {
        codigo: '3.4', nombre: 'PIEZAS SANITARIAS',
        rubros: [
          { codigo: '3.4.01', descripcion: 'Inodoros de tanque principales', unidad: 'U' },
          { codigo: '3.4.02', descripcion: 'Inodoros de tanque servicio', unidad: 'U' },
          { codigo: '3.4.03', descripcion: 'Lavamanos de empotrar', unidad: 'U' },
          { codigo: '3.4.04', descripcion: 'Lavamanos de pedestal', unidad: 'U' },
          { codigo: '3.4.05', descripcion: 'Lavaplatos', unidad: 'U' },
          { codigo: '3.4.06', descripcion: 'Duchas principales', unidad: 'U' },
          { codigo: '3.4.07', descripcion: 'Ducha servicio', unidad: 'U' },
          { codigo: '3.4.08', descripcion: 'Lavarropas', unidad: 'U' },
          { codigo: '3.4.09', descripcion: 'Llaves de manguera', unidad: 'U' },
          { codigo: '3.4.10', descripcion: 'Bomba de agua y tanque de presion', unidad: 'U' },
          { codigo: '3.4.11', descripcion: 'Calentador', unidad: 'U' },
          { codigo: '3.4.12', descripcion: 'Juego Accesorios de baños principales', unidad: 'U' },
          { codigo: '3.4.13', descripcion: 'Juego Accesorios de baño servicio', unidad: 'U' },
          { codigo: '3.4.14', descripcion: 'Tina de baño', unidad: 'U' },
        ],
      },
    ],
  },
  {
    clave: 'sistema-instalaciones-electricas', codigo: '4.0', nombre: 'SISTEMA INSTALACIONES ELECTRICAS',
    subcategorias: [
      {
        codigo: '', nombre: 'SISTEMA INSTALACIONES ELECTRICAS',
        rubros: [
          { codigo: '4.01', descripcion: 'Medidor', unidad: 'U' },
          { codigo: '4.02', descripcion: 'Acometida Baja tension', unidad: 'm' },
          { codigo: '4.03', descripcion: 'Acometida a paneles PD-PB', unidad: 'm' },
          { codigo: '4.04', descripcion: 'Acometida a paneles PD-PA', unidad: 'm' },
          { codigo: '4.05', descripcion: 'Acometida a paneles RESERVA', unidad: 'm' },
          { codigo: '4.06', descripcion: 'Tablero de proteccion', unidad: 'U' },
          { codigo: '4.07', descripcion: 'Paneles de Breakers: PD-PB', unidad: 'U' },
          { codigo: '4.08', descripcion: 'Paneles de Breakers: PD-PA', unidad: 'U' },
          { codigo: '4.09', descripcion: 'Paneles de Breakers: RESERVA', unidad: 'U' },
          { codigo: '4.10', descripcion: 'Iluminacion 120 V. (no se inc. Luminarias)', unidad: 'U' },
          { codigo: '4.11', descripcion: 'Tomacorriente servicios generales 120 V.', unidad: 'U' },
          { codigo: '4.12', descripcion: 'Tomacorriente 220 V.', unidad: 'U' },
          { codigo: '4.13', descripcion: 'Punto de Tv', unidad: 'U' },
          { codigo: '4.14', descripcion: 'Punto de telefono', unidad: 'U' },
          { codigo: '4.15', descripcion: 'Ojos de buey', unidad: 'U' },
        ],
      },
    ],
  },
];
