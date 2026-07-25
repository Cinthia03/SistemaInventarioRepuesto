import { Injectable } from '@angular/core';

export interface RubroHidraulico {
  codigo: string;
  descripcion: string;
  categoria: string;
}

@Injectable({
  providedIn: 'root'
})
export class RubrosHidraulicoService {

  private rubros: RubroHidraulico[] = [

    // ==========================================
    // 3.1 SISTEMA DE AGUA POTABLE
    // ==========================================
    {
      codigo: '3.1.01',
      descripcion: 'Redes de PVC presión roscable 3/4" agua fría',
      categoria: 'SISTEMA DE AGUA POTABLE'
    },
    {
      codigo: '3.1.02',
      descripcion: 'Redes de PVC presión roscable 3/4" agua caliente',
      categoria: 'SISTEMA DE AGUA POTABLE'
    },
    {
      codigo: '3.1.03',
      descripcion: 'Puntos de agua fría',
      categoria: 'SISTEMA DE AGUA POTABLE'
    },
    {
      codigo: '3.1.04',
      descripcion: 'Puntos de agua caliente',
      categoria: 'SISTEMA DE AGUA POTABLE'
    },
    {
      codigo: '3.1.05',
      descripcion: 'Medidor',
      categoria: 'SISTEMA DE AGUA POTABLE'
    },
    {
      codigo: '3.1.06',
      descripcion: 'Válvulas de control',
      categoria: 'SISTEMA DE AGUA POTABLE'
    },

    // ==========================================
    // 3.2 SISTEMA DE AGUAS SERVIDAS
    // ==========================================
    {
      codigo: '3.2.01',
      descripcion: 'Tubería PVC desagüe Ø110 mm',
      categoria: 'SISTEMA DE AGUAS SERVIDAS'
    },
    {
      codigo: '3.2.02',
      descripcion: 'Tubería PVC desagüe Ø50 mm',
      categoria: 'SISTEMA DE AGUAS SERVIDAS'
    },
    {
      codigo: '3.2.03',
      descripcion: 'Bajante PVC desagüe Ø110 mm',
      categoria: 'SISTEMA DE AGUAS SERVIDAS'
    },
    {
      codigo: '3.2.04',
      descripcion: 'Puntos de desagüe Ø110 mm',
      categoria: 'SISTEMA DE AGUAS SERVIDAS'
    },
    {
      codigo: '3.2.05',
      descripcion: 'Puntos de desagüe Ø50 mm',
      categoria: 'SISTEMA DE AGUAS SERVIDAS'
    },
    {
      codigo: '3.2.06',
      descripcion: 'Rejilla desagüe Ø50 mm',
      categoria: 'SISTEMA DE AGUAS SERVIDAS'
    },

    // ==========================================
    // 3.3 SISTEMA DE AGUAS LLUVIAS
    // ==========================================
    {
      codigo: '3.3.01',
      descripcion: 'Tubería PVC aguas lluvias Ø110 mm',
      categoria: 'SISTEMA DE AGUAS LLUVIAS'
    },
    {
      codigo: '3.3.02',
      descripcion: 'Rejilla sumidero Ø110 mm',
      categoria: 'SISTEMA DE AGUAS LLUVIAS'
    },

    // ==========================================
    // 3.4 PIEZAS SANITARIAS
    // ==========================================
    {
      codigo: '3.4.01',
      descripcion: 'Inodoro de tanque principal',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.02',
      descripcion: 'Inodoro de tanque servicio',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.03',
      descripcion: 'Lavamanos de empotrar',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.04',
      descripcion: 'Lavamanos de pedestal',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.05',
      descripcion: 'Lavaplatos',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.06',
      descripcion: 'Ducha principal',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.07',
      descripcion: 'Ducha de servicio',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.08',
      descripcion: 'Lavarropas',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.09',
      descripcion: 'Llave de manguera',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.10',
      descripcion: 'Bomba de agua y tanque de presión',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.11',
      descripcion: 'Calentador',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.12',
      descripcion: 'Juego de accesorios baño principal',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.13',
      descripcion: 'Juego de accesorios baño de servicio',
      categoria: 'PIEZAS SANITARIAS'
    },
    {
      codigo: '3.4.14',
      descripcion: 'Tina de baño',
      categoria: 'PIEZAS SANITARIAS'
    }

  ];

  constructor() {}

  getRubros(): RubroHidraulico[] {
    return this.rubros;
  }

  getCategorias(): string[] {
    return [...new Set(this.rubros.map(r => r.categoria))];
  }

  getRubrosPorCategoria(categoria: string): RubroHidraulico[] {
    return this.rubros.filter(r => r.categoria === categoria);
  }

  getRubroByCodigo(codigo: string): RubroHidraulico | undefined {
    return this.rubros.find(r => r.codigo === codigo);
  }

}