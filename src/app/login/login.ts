import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'

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
    private http: HttpClient,
    private router: Router
  ) {}

  login() {
    this.http.post<any>('http://localhost:3000/login', {
      user: this.user,
      password: this.password
    }).subscribe({
      next: (res) => {
        console.log(res)

        // 🔥 mejor validación
        if (res.tipo) {
          localStorage.setItem('tipo', res.tipo)
          this.router.navigate(['/inicio'])
        }
      },
      error: (err) => {
        console.error(err)
        this.error = err.error?.message || 'Error'
      }
    })
  }
}
