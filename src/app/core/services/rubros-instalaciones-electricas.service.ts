import { Injectable } from '@angular/core';

export interface RubroInstalacionesElectricas {
  codigo: string;
  descripcion: string;
  categoria: string;
}

@Injectable({
  providedIn: 'root'
})
export class RubrosInstalacionesElectricasService {

  private rubros: RubroInstalacionesElectricas[] = [

    // ==========================================
    // 4.1 INSTALACIONES ELÉCTRICAS
    // ==========================================
    {
      codigo: '4.01',
      descripcion: 'Medidor',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.02',
      descripcion: 'Acometida baja tensión',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.03',
      descripcion: 'Acometida a panel PD-PB',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.04',
      descripcion: 'Acometida a panel PD-PA',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.05',
      descripcion: 'Acometida a panel RESERVA',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.06',
      descripcion: 'Tablero de protección',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.07',
      descripcion: 'Panel de breakers PD-PB',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.08',
      descripcion: 'Panel de breakers PD-PA',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.09',
      descripcion: 'Panel de breakers RESERVA',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.10',
      descripcion: 'Iluminación 120 V (no incluye luminarias)',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.11',
      descripcion: 'Tomacorriente servicios generales 120 V',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.12',
      descripcion: 'Tomacorriente 220 V',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.13',
      descripcion: 'Punto de TV',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.14',
      descripcion: 'Punto de teléfono',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    },
    {
      codigo: '4.15',
      descripcion: 'Ojo de buey',
      categoria: 'INSTALACIONES ELÉCTRICAS'
    }

  ];

  constructor() {}

  // ==========================================
  // OBTENER TODOS LOS RUBROS
  // ==========================================
  getRubros(): RubroInstalacionesElectricas[] {
    return this.rubros;
  }

  // ==========================================
  // OBTENER RUBROS POR CATEGORÍA
  // ==========================================
  getRubrosPorCategoria(categoria: string): RubroInstalacionesElectricas[] {
    return this.rubros.filter(r => r.categoria === categoria);
  }

  // ==========================================
  // BUSCAR RUBRO POR CÓDIGO
  // ==========================================
  getRubroByCodigo(codigo: string): RubroInstalacionesElectricas | undefined {
    return this.rubros.find(r => r.codigo === codigo);
  }

  // ==========================================
  // OBTENER CATEGORÍAS
  // ==========================================
  getCategorias(): string[] {
    return [...new Set(this.rubros.map(r => r.categoria))];
  }
}