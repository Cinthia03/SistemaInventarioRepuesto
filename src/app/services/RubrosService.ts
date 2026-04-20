import { Injectable } from '@angular/core';

export interface Rubro {
  codigo: string;
  descripcion: string;
  categoria: string;
}

@Injectable({
  providedIn: 'root'
})
export class RubrosService {

  private rubros: Rubro[] = [

    // =========================
    // 1.1 INSTALACIONES PROVISIONALES
    // =========================
    { codigo: '1.1.01', descripcion: 'Caseta de oficina, bodega y guardiania', categoria: 'INSTALACIONES PROVISIONALES' },
    { codigo: '1.1.02', descripcion: 'Instalación eléctrica provisional', categoria: 'INSTALACIONES PROVISIONALES' },
    { codigo: '1.1.03', descripcion: 'Instalación AAPP provisional', categoria: 'INSTALACIONES PROVISIONALES' },
    { codigo: '1.1.04', descripcion: 'Cerramiento de Obra', categoria: 'INSTALACIONES PROVISIONALES' },

    // =========================
    // 1.2 MANTENIMIENTO DE OBRA
    // =========================
    { codigo: '1.2.01', descripcion: 'Limpieza general de la obra', categoria: 'MANTENIMIENTO DE OBRA' },
    { codigo: '1.2.02', descripcion: 'Desalojo de limpieza', categoria: 'MANTENIMIENTO DE OBRA' },

    // =========================
    // 1.3 PREPARACION DEL TERRENO
    // =========================
    { codigo: '1.3.01', descripcion: 'Limpieza del terreno', categoria: 'PREPARACION DEL TERRENO' },
    { codigo: '1.3.02', descripcion: 'Replanteo y trazado de cimientos', categoria: 'PREPARACION DEL TERRENO' },

    // =========================
    // 1.4 MOVIMIENTO DE TIERRA
    // =========================
    { codigo: '1.4.01', descripcion: 'Excavación', categoria: 'MOVIMIENTO DE TIERRA' },
    { codigo: '1.4.02', descripcion: 'Relleno compactado con material importado', categoria: 'MOVIMIENTO DE TIERRA' },

    // =========================
    // 1.5 HORMIGON SIMPLE
    // =========================
    { codigo: '1.5.01', descripcion: 'Replantillo e=10cm', categoria: 'HORMIGON SIMPLE' },
    { codigo: '1.5.02', descripcion: 'Muro Ciclópeo', categoria: 'HORMIGON SIMPLE' },

    // =========================
    // 1.6 HORMIGON ARMADO
    // =========================
    { codigo: '1.6.01', descripcion: 'Zapatas y vigas en cimientos', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.02', descripcion: 'Riostras', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.03', descripcion: 'Columnas cimiento a losa vivienda', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.04', descripcion: 'Columnas losa a cubierta', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.05', descripcion: 'Columnas cimiento a losa garaje', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.06', descripcion: 'Vigas losa entrepiso', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.07', descripcion: 'Losa entrepiso e=25cm', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.08', descripcion: 'Escaleras de hormigón', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.09', descripcion: 'Vigas de cubierta', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.10', descripcion: 'Vigas losa de garaje', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.11', descripcion: 'Losa garaje e=25cm', categoria: 'HORMIGON ARMADO' },
    { codigo: '1.6.12', descripcion: 'Cisterna', categoria: 'HORMIGON ARMADO' },

    // =========================
    // 1.7 ESTRUCTURAS METALICAS
    // =========================
    { codigo: '1.7.01', descripcion: 'Estructuras metálicas de cubierta', categoria: 'ESTRUCTURAS METALICAS' },
    { codigo: '1.7.02', descripcion: 'Cubierta Eternit', categoria: 'ESTRUCTURAS METALICAS' },
    { codigo: '1.7.03', descripcion: 'Tejas sobre cubierta', categoria: 'ESTRUCTURAS METALICAS' },

    // =========================
    // 1.8 CONTRAPISOS
    // =========================
    { codigo: '1.8.01', descripcion: 'Contrapiso interior hormigón simple e=10cm', categoria: 'CONTRAPISOS' },

    // =========================
    // 1.9 ALBAÑILERIA
    // =========================
    { codigo: '1.9.01', descripcion: 'Pared mampostería bloque e=19cm', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.02', descripcion: 'Pared mampostería bloque e=9cm', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.03', descripcion: 'Viguetas y pilaretes h. armado 19x20cm', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.04', descripcion: 'Viguetas y pilaretes h. armado 9x20cm', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.05', descripcion: 'Enlucido interior', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.06', descripcion: 'Enlucido exterior', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.07', descripcion: 'Enlucido de columnas', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.08', descripcion: 'Enlucido de tumbado de losa', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.09', descripcion: 'Enlucido sobre losas de cubierta', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.10', descripcion: 'Enlucido de escalera', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.11', descripcion: 'Filos de columnas y paredes', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.12', descripcion: 'Cuadrada de boquetes', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.13', descripcion: 'Molduras en cubiertas', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.14', descripcion: 'Molduras en ventanas', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.15', descripcion: 'Mesón de hormigón en cocina', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.16', descripcion: 'Mesón de hormigón en baños', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.17', descripcion: 'Muro de tina de baño', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.18', descripcion: 'Cajas de registro AA.SS.', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.19', descripcion: 'Cajas de registro AA.LL.', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.20', descripcion: 'Sumidero AA.LL.', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.21', descripcion: 'Cajas de paso eléctrica', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.22', descripcion: 'Enlucido cisterna', categoria: 'ALBAÑILERIA' },
    { codigo: '1.9.23', descripcion: 'Impermeabilización en losa y cisterna', categoria: 'ALBAÑILERIA' }

  ];

  constructor() {}

  // =========================
  // OBTENER TODO
  // =========================
  getRubros(): Rubro[] {
    return this.rubros;
  }

  // =========================
  // POR CATEGORIA
  // =========================
  getRubrosPorCategoria(categoria: string): Rubro[] {
    return this.rubros.filter(r => r.categoria === categoria);
  }

  // =========================
  // BUSCAR POR CODIGO
  // =========================
  getRubroByCodigo(codigo: string): Rubro | undefined {
    return this.rubros.find(r => r.codigo === codigo);
  }

  // =========================
  // LISTA DE CATEGORIAS
  // =========================
  getCategorias(): string[] {
    return [...new Set(this.rubros.map(r => r.categoria))];
  }
}