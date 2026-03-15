import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Rubro {
  codigo: string;
  descripcion: string;
  unidad: string;
}


@Component({
  selector: 'app-calculo-apu-component',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './calculo-apu-component.html',
  styleUrl: './calculo-apu-component.css',
})
export class CalculoApuComponent {

  codigoBusqueda: string = '';

  cantidad: number = 1;

  rubroSeleccionado?: Rubro;

  // SUBTOTALES
  equipos: number = 0;
  manoObra: number = 0;
  materiales: number = 0;
  transporte: number = 0;

  precioUnitario: number = 0;

  total: number = 0;

  rubros: Rubro[] = [

    {
      codigo: '1.1.1',
      descripcion: 'Caseta de oficina, bodega y guardiania',
      unidad: 'm2'
    },

    {
      codigo: '1.1.2',
      descripcion: 'Instalación eléctrica provisional',
      unidad: 'Global'
    },

    {
      codigo: '1.1.3',
      descripcion: 'Instalación AAPP provisional',
      unidad: 'Global'
    },

    {
      codigo: '1.1.4',
      descripcion: 'Servicio higienico para obreros',
      unidad: 'Global'
    }

  ];

  buscar() {

    const resultado = this.rubros.find(
      r => r.codigo === this.codigoBusqueda
    );

    if (resultado) {

      this.rubroSeleccionado = resultado;

      this.reiniciarCalculo();

    } else {

      alert("Código no encontrado");

      this.rubroSeleccionado = undefined;

    }

  }

  reiniciarCalculo(){

    this.equipos = 0;
    this.manoObra = 0;
    this.materiales = 0;
    this.transporte = 0;
    this.precioUnitario = 0;
    this.total = 0;

  }

  calcularPrecio(){

    this.precioUnitario =
      this.equipos +
      this.manoObra +
      this.materiales +
      this.transporte;

    this.calcularTotal();

  }

  calcularTotal(){

    this.total = this.cantidad * this.precioUnitario;

  }

}