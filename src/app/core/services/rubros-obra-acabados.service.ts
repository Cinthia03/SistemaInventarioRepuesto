import { Injectable } from '@angular/core';

export interface RubroAcabado {
  codigo: string;
  descripcion: string;
  categoria: string;
}

@Injectable({
  providedIn: 'root'
})
export class RubrosObraAcabadosService {

  private rubros: RubroAcabado[] = [

    // ==========================================
    // 2.1 REVESTIMIENTOS
    // ==========================================
    {
      codigo: '2.1.01',
      descripcion: 'Pintura Interior: caucho (paredes)',
      categoria: 'REVESTIMIENTOS'
    },
    {
      codigo: '2.1.02',
      descripcion: 'Pintura Interior: caucho (tumbado)',
      categoria: 'REVESTIMIENTOS'
    },
    {
      codigo: '2.1.03',
      descripcion: 'Pintura exterior: elastomérica',
      categoria: 'REVESTIMIENTOS'
    },
    {
      codigo: '2.1.04',
      descripcion: 'Cerámica en paredes',
      categoria: 'REVESTIMIENTOS'
    },
    {
      codigo: '2.1.05',
      descripcion: 'Revestimiento de mesón en cocina',
      categoria: 'REVESTIMIENTOS'
    },
    {
      codigo: '2.1.06',
      descripcion: 'Revestimiento de mesón en baños',
      categoria: 'REVESTIMIENTOS'
    },
    {
      codigo: '2.1.07',
      descripcion: 'Porcelanato en pisos',
      categoria: 'REVESTIMIENTOS'
    },
    {
      codigo: '2.1.08',
      descripcion: 'Cerámica en pisos de baños, servicio, bodega y lavandería',
      categoria: 'REVESTIMIENTOS'
    },
    {
      codigo: '2.1.09',
      descripcion: 'Revestimiento de escalera',
      categoria: 'REVESTIMIENTOS'
    },
    {
      codigo: '2.1.10',
      descripcion: 'Rastreras de porcelanato (sala, comedor, estar y dormitorios)',
      categoria: 'REVESTIMIENTOS'
    },

    // ==========================================
    // 2.2 CIELOS RASOS
    // ==========================================
    {
      codigo: '2.2.01',
      descripcion: 'Gypsum (tipo losa)',
      categoria: 'CIELOS RASOS'
    },

    // ==========================================
    // 2.3 CARPINTERÍA: ALUMINIO - VIDRIO
    // ==========================================
    {
      codigo: '2.3.01',
      descripcion: 'Ventanas aluminio y vidrio',
      categoria: 'CARPINTERÍA: ALUMINIO - VIDRIO'
    },
    {
      codigo: '2.3.02',
      descripcion: 'Puertas aluminio y vidrio',
      categoria: 'CARPINTERÍA: ALUMINIO - VIDRIO'
    },
    {
      codigo: '2.3.03',
      descripcion: 'Pasamanos',
      categoria: 'CARPINTERÍA: ALUMINIO - VIDRIO'
    },

    // ==========================================
    // 2.4 CARPINTERÍA: MADERA
    // ==========================================
    {
      codigo: '2.4.01',
      descripcion: 'Puerta madera principal (1.60 x 2.50 m)',
      categoria: 'CARPINTERÍA: MADERA'
    },
    {
      codigo: '2.4.02',
      descripcion: 'Puerta madera cocina (0.80 x 2.00 m)',
      categoria: 'CARPINTERÍA: MADERA'
    },
    {
      codigo: '2.4.03',
      descripcion: 'Puerta madera (0.80 x 2.00 m)',
      categoria: 'CARPINTERÍA: MADERA'
    },
    {
      codigo: '2.4.04',
      descripcion: 'Puerta madera (0.70 x 2.00 m)',
      categoria: 'CARPINTERÍA: MADERA'
    },
    {
      codigo: '2.4.05',
      descripcion: 'Puerta madera (0.60 x 2.00 m)',
      categoria: 'CARPINTERÍA: MADERA'
    },
    {
      codigo: '2.4.06',
      descripcion: 'Closets',
      categoria: 'CARPINTERÍA: MADERA'
    },
    {
      codigo: '2.4.07',
      descripcion: 'Anaqueles de cocina bajo mesón',
      categoria: 'CARPINTERÍA: MADERA'
    },
    {
      codigo: '2.4.08',
      descripcion: 'Anaqueles de cocina sobre mesón',
      categoria: 'CARPINTERÍA: MADERA'
    },

    // ==========================================
    // 2.5 OBRAS ADICIONALES
    // ==========================================
    {
      codigo: '2.5.01',
      descripcion: 'Cerramiento (incluye mampostería y estructura)',
      categoria: 'OBRAS ADICIONALES'
    },
    {
      codigo: '2.5.02',
      descripcion: 'Enlucido cerramiento (lateral 1 lado)',
      categoria: 'OBRAS ADICIONALES'
    },
    {
      codigo: '2.5.03',
      descripcion: 'Enlucido cerramiento (frontal 2 lados)',
      categoria: 'OBRAS ADICIONALES'
    },
    {
      codigo: '2.5.04',
      descripcion: 'Pintura cerramiento (lateral 1 lado + frontal 2 lados)',
      categoria: 'OBRAS ADICIONALES'
    },
    {
      codigo: '2.5.05',
      descripcion: 'Pavimento en ingreso y parqueos (con malla electrosoldada)',
      categoria: 'OBRAS ADICIONALES'
    },
    {
      codigo: '2.5.06',
      descripcion: 'Pavimento en patios y área posterior (hormigón simple)',
      categoria: 'OBRAS ADICIONALES'
    },
    {
      codigo: '2.5.07',
      descripcion: 'Escalones de hormigón simple',
      categoria: 'OBRAS ADICIONALES'
    },
    {
      codigo: '2.5.08',
      descripcion: 'Revestimiento de escalones',
      categoria: 'OBRAS ADICIONALES'
    },
    {
      codigo: '2.5.09',
      descripcion: 'Puerta metálica (0.90 x 2.00 m)',
      categoria: 'OBRAS ADICIONALES'
    },
    {
      codigo: '2.5.10',
      descripcion: 'Tapa metálica de cisterna',
      categoria: 'OBRAS ADICIONALES'
    }

  ];

  constructor() {}

  getRubros(): RubroAcabado[] {
    return this.rubros;
  }

  getCategorias(): string[] {
    return [...new Set(this.rubros.map(r => r.categoria))];
  }

  getRubrosPorCategoria(categoria: string): RubroAcabado[] {
    return this.rubros.filter(r => r.categoria === categoria);
  }

  getRubroByCodigo(codigo: string): RubroAcabado | undefined {
    return this.rubros.find(r => r.codigo === codigo);
  }
}