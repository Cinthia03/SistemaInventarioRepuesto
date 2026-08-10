import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApuDetalle {
  id?: number;
  tipo: 'EQUIPO' | 'MANO_OBRA' | 'MATERIAL' | 'TRANSPORTE';
  orden: number;
  codigo?: string;
  descripcion: string;
  unidad?: string;
  cantidad: number;
  tarifa: number;
  costoHora?: number;
  rendimiento?: number;
  costo: number;
}

export interface ApuRubro {
  id?: number;
  categoria: string;
  codigo: string;
  descripcion: string;
  unidad?: string;
  fuente_excel?: string;
  bloque_excel?: number;

  subtotal_equipos: number;
  subtotal_mano_obra: number;
  subtotal_materiales: number;
  subtotal_transporte: number;
  total_directo: number;

  detalles: ApuDetalle[];
}

export interface NuevoApu {
  codigo: string;
  descripcion: string;
  unidad?: string;
  detalles: ApuDetalle[];
}

@Injectable({
  providedIn: 'root'
})
export class ApuObraGrisService {

  private readonly apiUrl = '/api/apus';

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<ApuRubro[]> {
    return this.http.get<ApuRubro[]>(
      `${this.apiUrl}/obra-gris`
    );
  }

  obtenerPorId(id: number): Observable<ApuRubro> {
    return this.http.get<ApuRubro>(
      `${this.apiUrl}/${id}`
    );
  }

  crear(nuevo: NuevoApu): Observable<ApuRubro> {
    return this.http.post<ApuRubro>(
      `${this.apiUrl}/obra-gris`,
      nuevo
    );
  }

  actualizar(id: number, nuevo: NuevoApu): Observable<ApuRubro> {
    return this.http.put<ApuRubro>(
      `${this.apiUrl}/${id}`,
      nuevo
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}
