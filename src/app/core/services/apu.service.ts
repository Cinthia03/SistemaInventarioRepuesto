import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApuGuardado {
  id?: number;
  rubro_codigo: string;
  rubro_descripcion: string;
  fecha: string;
  subtotal_equipos: number;
  subtotal_mano_obra: number;
  subtotal_materiales: number;
  subtotal_transporte: number;
  total_directo: number;
  detalle_equipos: any;      // ← any, no string
  detalle_mano_obra: any;    // ← any, no string
  detalle_materiales: any;   // ← any, no string
  detalle_transporte: any;   // ← any, no string
}

@Injectable({ providedIn: 'root' })
export class ApuService {
  private apiUrl = 'http://localhost:3000/apus';

  constructor(private http: HttpClient) {}

  guardar(apu: ApuGuardado): Observable<ApuGuardado> {
    return this.http.post<ApuGuardado>(this.apiUrl, apu);
  }

  obtenerTodos(): Observable<ApuGuardado[]> {
    return this.http.get<ApuGuardado[]>(this.apiUrl);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}