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
import { EquiposService, equipos } from '../../services/equipos.service';

@Component({
  selector: 'app-equipos',
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
  templateUrl: './equipos.html',
  styleUrls: ['../materiales/materiales.css']
})
export class Equipos implements AfterViewInit {

  form!: FormGroup;
  displayedColumns = ['codigo','descripcion','stock', 'unidad','precio','acciones'];
  dataSource = new MatTableDataSource<equipos>();
  Equipos: equipos[] = [];
  filtroTexto = "";
  modoEdicion = false;
  codigoEditar:string|null = null;
  filaActualizada:string|null = null;

  @ViewChild(MatPaginator) paginator!:MatPaginator;
  @ViewChild(MatSort) sort!:MatSort;

  constructor(
    private service:EquiposService,
    private fb:FormBuilder,
    private snackBar:MatSnackBar
  ){
    this.form = this.fb.group({
      codigo:['',Validators.required],
      descripcion:['',Validators.required],
      stock:[0, [Validators.required, Validators.min(0)]],
      unidad:['',Validators.required],
      precio:[0, [Validators.required, Validators.min(0)]]
    });
  }

  ngAfterViewInit(){
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.cargarDatos();
    this.generarCodigo();
  }

  cargarDatos(){
    this.service.obtenerTodos().subscribe({
      next:(data)=>{
        console.log("TOTAL:", data.length);
        console.table(data);

        this.Equipos = data;
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error:(err)=>{
        console.error("Error cargando equipos de construccion",err);
      }
    });
  }

  aplicarFiltro(event:Event){
    const valor = (event.target as HTMLInputElement).value;
    this.filtroTexto = valor.toLowerCase();
    this.dataSource.data = this.Equipos.filter(m =>
      m.codigo.toLowerCase().includes(this.filtroTexto) ||
      m.descripcion.toLowerCase().includes(this.filtroTexto)
    );
  }

  irAFilaActualizada(codigo:string){
    const index = this.Equipos.findIndex(m => m.codigo === codigo);
    if(index === -1) return;
    const pageSize = this.paginator.pageSize;
    const pageIndex = Math.floor(index / pageSize);
    this.paginator.pageIndex = pageIndex;
    this.dataSource.paginator = this.paginator;
    setTimeout(()=>{
      const fila = document.querySelector(
        `[data-codigo="${codigo}"]`
      );
      if(fila){
        fila.scrollIntoView({
          behavior:'smooth',
          block:'center'
        });
      }
      setTimeout(()=>{
        this.filaActualizada = null;
      },3000);
    },400);
  }

  generarCodigo(){
    this.service.generarCodigo().subscribe({
      next:(res)=>{
        this.form.patchValue({
          codigo: res.codigo
        });
      },
      error:(err)=>console.error(err)
    });
  }


  guardar(){
      const data = this.form.value;
      if(this.modoEdicion){
        this.service.actualizar(this.codigoEditar!,data).subscribe({
          next:()=>{
            this.filaActualizada = this.codigoEditar;
            this.snackBar.open(
                "✏️ Equipo actualizado correctamente",
                "Cerrar",
                {
                  duration: 3000,
                  horizontalPosition: "center",
                  verticalPosition: "top"
                }
              );
            const codigo = this.codigoEditar!;
            this.form.reset();
            this.modoEdicion=false;
            this.cargarDatos();
              setTimeout(()=>{
                this.irAFilaActualizada(codigo);
                },300);
          },
          error:(err)=>console.error(err)
        });
      }else{
        this.service.crear(data).subscribe({
          next:()=>{
            this.snackBar.open(
              "✅ Equipo registrado correctamente",
              "Cerrar",
              {
                duration: 3000,
                horizontalPosition: "center",
                verticalPosition: "top"
              }
            );
            this.form.reset();
            this.generarCodigo();
            this.cargarDatos();
          },
          error:(err)=>console.error(err)
        });
      }
  }

  nuevoRegistro(){
    this.form.reset();
    this.modoEdicion = false;
    this.codigoEditar = null;
    this.generarCodigo();
    this.cargarDatos();
  }


  editar(item:equipos){
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
