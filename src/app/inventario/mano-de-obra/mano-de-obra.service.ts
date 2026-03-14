import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ManoObra {
  id?: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  precio: number;
}

@Injectable({
  providedIn: 'root'
})
export class ManoDeObraService {

  private apiUrl = 'http://localhost:3000/mano-obra';

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<ManoObra[]> {
    return this.http.get<ManoObra[]>(this.apiUrl);
  }

  crear(data: ManoObra) {
    return this.http.post(this.apiUrl, data);
  }

  actualizar(codigo: string, data: ManoObra) {
    return this.http.put(`${this.apiUrl}/${codigo}`, data);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}