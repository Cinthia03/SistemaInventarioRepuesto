/*import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface equipos {
  id?: number;
  codigo: string;
  descripcion: string;
  stock: number;
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
}*/

import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';


export interface equipos {
  id?: number;
  codigo: string;
  descripcion: string;
  stock: number;
  unidad: string;
  precio: number;
}

@Injectable({
  providedIn: 'root'
})
export class EquiposService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  obtenerTodos() {
    return from(
      this.supabaseService.supabase
        .from('equipos')
        .select('*')
        .order('codigo')
    );
  }

  generarCodigo() {
    return from(
      this.supabaseService.supabase
        .from('equipos')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(1)
    );
  }

  crear(data: any) {
    return from(
      this.supabaseService.supabase
        .from('equipos')
        .insert(data)
    );
  }

  actualizar(codigo: string, data: any) {
    return from(
      this.supabaseService.supabase
        .from('equipos')
        .update(data)
        .eq('codigo', codigo)
    );
  }

  eliminar(id: number) {
    return from(
      this.supabaseService.supabase
        .from('equipos')
        .delete()
        .eq('id', id)
    );
  }
}