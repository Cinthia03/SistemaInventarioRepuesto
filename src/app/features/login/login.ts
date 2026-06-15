import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { SupabaseService } from '../../core/services/supabase.service';
import { MatButtonModule } from '@angular/material/button'
import { MatInputModule } from '@angular/material/input'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,          
    MatFormFieldModule      
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})

export class Login {
  user = ''
  password = ''
  error = ''

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async login() {
    const { data, error } = await this.supabaseService.supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', this.user)
      .eq('password', this.password)
      .maybeSingle();
    console.log('DATA:', data);
    console.log('ERROR:', error);
    if (!data) {
      this.error = 'Usuario o contraseña incorrectos';
      return;
    }
    localStorage.setItem('rol', data.rol);
    localStorage.setItem('usuario', data.usuario);
    this.router.navigate(['/inicio']);
  }
}
