import { Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router'
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { MaterialeService } from './materiales.service';

@Component({
  selector: 'app-materiales',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule
  ],
  templateUrl: './materiales.html',
  styleUrls: ['./materiales.css'],
})
export class Materiales implements OnInit{

  /*materialForm!: FormGroup;
  materiales: any[] = [];
  columnas: string[] = ['codigo','descripcion','unidad','precio','stock','categoria','acciones'];
*/

  materialForm!: FormGroup;
  modoEdicion = false;
  materialId!: number;
  pagina!: number;

  constructor(
  private fb: FormBuilder,
  private router: Router,
  private route: ActivatedRoute,
  private service: MaterialeService
  ) {
    this.materialForm = this.fb.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      unidad: ['', Validators.required],
      precio: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      categoria: ['', Validators.required]
    });
  }


  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.modoEdicion = true;
        this.materialId = Number(id);
        this.pagina = Number(this.route.snapshot.queryParamMap.get('page'));
        this.service.obtenerPorId(this.materialId)
          .subscribe(data => {
            this.materialForm.patchValue(data);
          });
      }
    });
  }

  guardarMaterial() {
    if (!this.materialForm.valid) return;
    if (this.modoEdicion) {
      this.service.actualizar(this.materialId, this.materialForm.value)
        .subscribe(() => {
          this.router.navigate(
            ['/acerovarilla'],
            { queryParams: { page: this.pagina } }
          );
        });
    } else {
      this.service.crear(this.materialForm.value)
        .subscribe(() => {
          this.materialForm.reset();
        });
    }
  }

  abrirAceroVarilla() {
    this.router.navigate(['/acerovarilla']);
  }

  abrirCategoria(ruta: string) {
    this.router.navigate(['/' + ruta.toLowerCase()]);
  }
}
