import { Component, ChangeDetectorRef, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { SupabaseService } from '../../core/services/supabase.service';
import { PermisosService } from '../../core/services/permisos.service';
import { AuditoriaService } from '../../core/services/auditoria.service';
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
  /** La app es zoneless: tras cada consulta a Supabase se pide repintar la vista. */
  private readonly cdr = inject(ChangeDetectorRef);

  user = ''
  password = ''
  error = ''

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private permisos: PermisosService,
    private auditoria: AuditoriaService
  ) {}

  async login() {
    try {
      const { data } = await this.supabaseService.supabase
        .from('usuarios')
        .select('*')
        .eq('usuario', this.user)
        .eq('password', this.password)
        .maybeSingle();
      if (!data) {
        this.error = 'Usuario o contraseña incorrectos';
        return;
      }
      if (data.activo === false) {
        this.error = 'El usuario está desactivado. Comuníquese con el administrador.';
        return;
      }
      localStorage.setItem('rol', (data.rol || '').trim().toLowerCase());
      localStorage.setItem('usuario', data.usuario);
      await this.permisos.cargar(true);
      this.auditoria.registrar('INGRESO', 'SESION', 'Inicio de sesión', data.usuario);
      this.router.navigate(['/inicio']);
    } finally {
      this.cdr.markForCheck();
    }
  }
}
