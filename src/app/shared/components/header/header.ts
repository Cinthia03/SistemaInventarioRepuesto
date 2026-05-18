import { Component } from '@angular/core'
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { Login } from '../../../features/login/login';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent {
  constructor(private router: Router) {}

  irInicio() {
    this.router.navigate(['/inicio']);
  }

  irLogin(){
    this.router.navigate(['/login']);
  }
}
