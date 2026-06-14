import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  login(data: { user: string; password: string }) {

    return from(
      this.supabaseService.supabase
        .from('usuarios')
        .select('*')
        .eq('usuario', data.user)
        .eq('password', data.password)
        .single()
    );

  }
}