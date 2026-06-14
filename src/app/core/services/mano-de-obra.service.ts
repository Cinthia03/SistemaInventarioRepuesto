/*import { Injectable } from '@angular/core';
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

  generarCodigo(){
    return this.http.get<{codigo:string}>(`${this.apiUrl}/generar-codigo`);
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
}*/

import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';

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

  constructor(
    private supabaseService: SupabaseService
  ) {}

  obtenerTodos() {

    return from(
      this.supabaseService.supabase
        .from('mano_obra')
        .select('*')
        .order('codigo')
    );

  }

  crear(data: any) {

    return from(
      this.supabaseService.supabase
        .from('mano_obra')
        .insert(data)
    );

  }

  actualizar(codigo: string, data: any) {

    return from(
      this.supabaseService.supabase
        .from('mano_obra')
        .update(data)
        .eq('codigo', codigo)
    );

  }

  eliminar(id: number) {

    return from(
      this.supabaseService.supabase
        .from('mano_obra')
        .delete()
        .eq('id', id)
    );

  }
}