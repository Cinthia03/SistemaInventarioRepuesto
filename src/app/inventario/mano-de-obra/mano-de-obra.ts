import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ManoDeObraService, ManoObra } from './mano-de-obra.service';

@Component({
  selector: 'app-mano-de-obra',
  standalone: true,
  imports:  [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatSnackBarModule
  ],
  templateUrl: './mano-de-obra.html',
  styleUrls: ['./mano-de-obra.css']
})
export class ManoDeObra implements AfterViewInit {

  form!: FormGroup;
  displayedColumns = ['codigo','descripcion','unidad','precio','acciones'];
  dataSource = new MatTableDataSource<ManoObra>();
  manoObra: ManoObra[] = [];
  filtroTexto = "";
  modoEdicion = false;
  codigoEditar:string|null = null;

  @ViewChild(MatPaginator) paginator!:MatPaginator;
  @ViewChild(MatSort) sort!:MatSort;

  constructor(
    private service:ManoDeObraService,
    private fb:FormBuilder,
    private snackBar:MatSnackBar
  ){
    this.form = this.fb.group({
      codigo:['',Validators.required],
      descripcion:['',Validators.required],
      unidad:['',Validators.required],
      precio:[0,Validators.required]
    });
  }

  ngAfterViewInit(){
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.cargarDatos();
  }

  cargarDatos(){
    this.service.obtenerTodos().subscribe({
      next:(data)=>{
        this.manoObra = data;
        this.dataSource.data = data;

        // 🔹 volver a asignar paginator y sort
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error:(err)=>{
        console.error("Error cargando mano de obra",err);
      }
    });
  }

  aplicarFiltro(event:Event){
    const valor = (event.target as HTMLInputElement).value;
    this.filtroTexto = valor.toLowerCase();
    this.dataSource.data = this.manoObra.filter(m =>
      m.codigo.toLowerCase().includes(this.filtroTexto) ||
      m.descripcion.toLowerCase().includes(this.filtroTexto)
    );
  }

  guardar(){
    const data = this.form.value;
    if(this.modoEdicion){
      this.service.actualizar(this.codigoEditar!,data).subscribe({
        next:()=>{
          this.snackBar.open("Mano de obra actualizada","Cerrar",{duration:3000});
          this.form.reset();
          this.modoEdicion=false;
          this.cargarDatos();
        },
        error:(err)=>console.error(err)
      });
    }else{
      this.service.crear(data).subscribe({
        next:()=>{
          this.snackBar.open("Registro guardado","Cerrar",{duration:3000});
          this.form.reset();
          this.cargarDatos();
        },
        error:(err)=>console.error(err)
      });
    }
}

  editar(item:ManoObra){
    this.modoEdicion=true;
    this.codigoEditar=item.codigo;
    this.form.patchValue(item);
  }

  eliminar(id:number){
    this.service.eliminar(id).subscribe(()=>{
      this.snackBar.open("Registro eliminado","Cerrar",{duration:3000});
      this.cargarDatos();
    });
  }

}