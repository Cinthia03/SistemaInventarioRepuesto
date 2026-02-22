import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Material {
  id?: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  precio: number;
  stock: number;
  categoria: string;
}

@Injectable({
  providedIn: 'root'
})
export class MaterialeService {

  private apiUrl = 'http://localhost:3000/materiales';

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<Material[]> {
    return this.http.get<Material[]>(this.apiUrl);
  }

  obtenerPorId(id: number): Observable<Material> {
    return this.http.get<Material>(`${this.apiUrl}/${id}`);
  }

  crear(data: Material) {
    return this.http.post(this.apiUrl, data);
  }

  actualizar(id: number, data: Material) {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}