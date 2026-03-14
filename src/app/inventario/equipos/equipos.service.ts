import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface equipos {
  id?: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  precio: number;
}

@Injectable({
  providedIn: 'root'
})
export class EquiposService {

  private apiUrl = 'http://localhost:3000/equipos';

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<equipos[]> {
    return this.http.get<equipos[]>(this.apiUrl);
  }

  generarCodigo(){
    return this.http.get<{codigo:string}>(`${this.apiUrl}/generar-codigo`);
  }

  crear(data: equipos) {
    return this.http.post(this.apiUrl, data);
  }

  actualizar(codigo: string, data: equipos) {
    return this.http.put(`${this.apiUrl}/${codigo}`, data);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}