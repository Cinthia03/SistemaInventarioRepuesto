/*import { Injectable } from '@angular/core';
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
}*/

import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';

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
  detalle_equipos: any;    
  detalle_mano_obra: any; 
  detalle_materiales: any;  
  detalle_transporte: any;  
}

@Injectable({
  providedIn: 'root'
})
export class ApuService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  guardar(apu: any) {
    return from(
      this.supabaseService.supabase
        .from('apus')
        .insert(apu)
        .select()
    );
  }

  obtenerTodos() {
    return from(
      this.supabaseService.supabase
        .from('apus')
        .select('*')
        .order('fecha', { ascending: false })
    );
  }

  eliminar(id: number) {
    return from(
      this.supabaseService.supabase
        .from('apus')
        .delete()
        .eq('id', id)
    );
  }
}