import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface materiales {
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

  obtenerTodos(): Observable<materiales[]> {
    return this.http.get<materiales[]>(this.apiUrl);
  }

  obtenerPorId(id: number): Observable<materiales> {
    return this.http.get<materiales>(`${this.apiUrl}/${id}`);
  }

  crear(data: materiales) {
    return this.http.post(this.apiUrl, data);
  }

  actualizar(codigo: string, data: materiales) {
    return this.http.put(`${this.apiUrl}/${codigo}`, data);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  generarCodigo(categoria:string){
    return this.http.get<any>(`${this.apiUrl}/generar-codigo/${categoria}`)
  }
}