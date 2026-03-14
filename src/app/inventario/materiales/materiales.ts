import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MaterialeService, Material } from './materiales.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatTableModule,
    MatPaginatorModule,  
    MatSortModule,
    MatSnackBarModule
  ],
  templateUrl: './materiales.html',
  styleUrls: ['./materiales.css'],
})
export class Materiales implements AfterViewInit {
  materialForm!: FormGroup;
  displayedColumns = ['codigo','descripcion','unidad','precio','stock','acciones'];
  dataSource = new MatTableDataSource<Material>();
  materiales: Material[] = [];
  materialesFiltrados: Material[] = [];
  categoriaActual = "TODOS";
  filtroTexto = "";
  modoEdicion = false;
  codigoEditar: string | null = null;
  codigoScroll: string | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private service: MaterialeService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ){
    this.materialForm = this.fb.group({
      codigo: [{ value: '', disabled: true }],
      descripcion: ['', Validators.required],
      unidad: ['', Validators.required],
      precio: [0, Validators.required],
      stock: [0, Validators.required],
      categoria: ['', Validators.required]
    });
      this.dataSource.sortingDataAccessor = (item: any, property) => {
      if(property === 'codigo'){
        return Number(item.codigo.replace('.', ''));
      }
      return item[property];
    };
  }

  ngAfterViewInit(){
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.cargarMateriales();
  }

  cargarMateriales(){
    this.service.obtenerTodos().subscribe(data=>{
      this.materiales = data;
      this.materialesFiltrados = [...data];
      this.actualizarTabla();
    })
  }

  generarCodigo(categoria:string){
    this.service.generarCodigo(categoria).subscribe((res:any)=>{
      this.materialForm.patchValue({
        codigo:res.codigo
      })
    })
  }

  aplicarFiltro(event: Event){
    const valor = (event.target as HTMLInputElement).value;
    this.filtroTexto = valor.toLowerCase();
    this.filtrar();
  }

  filtrarCategoria(categoria:string){
    this.categoriaActual = categoria;
    this.filtrar();
  }

  filtrar(){
    this.materialesFiltrados = this.materiales.filter(m => {
      const codigo = (m.codigo ?? '').toLowerCase();
      const descripcion = (m.descripcion ?? '').toLowerCase();
      const categoria = (m.categoria ?? '').toLowerCase();

      const coincideTexto =
        m.codigo.toLowerCase().includes(this.filtroTexto) ||
        m.descripcion.toLowerCase().includes(this.filtroTexto);
      
      const coincideCategoria =
        this.categoriaActual === "TODOS" ||
        m.categoria?.toLowerCase() === this.categoriaActual.toLowerCase();
      
      return coincideTexto && coincideCategoria;
    });
    this.actualizarTabla();
  }

  actualizarTabla(){
   this.dataSource.data = this.materialesFiltrados;
    if(this.paginator){
      this.dataSource.paginator = this.paginator;
    }
  }

  guardarMaterial(){
    const material = this.materialForm.getRawValue();
      if(this.modoEdicion){
        this.service.actualizar(this.codigoEditar!, material).subscribe(()=>{
          const index = this.materiales.findIndex(m => m.codigo === this.codigoEditar);
          if(index !== -1){
            this.materiales[index] = {
              ...this.materiales[index],
              ...material
            };
          }
            this.filtrar();
            this.snackBar.open(
              "✏️ Material actualizado correctamente",
              "Cerrar",
              {
                duration: 3000,
                horizontalPosition: "center",
                verticalPosition: "top"
              }
            );
            this.materialForm.reset();
            this.modoEdicion = false;
            setTimeout(()=>{
              this.scrollToMaterial(this.codigoScroll!);
            },200);
            this.codigoEditar = null;
          });
      }else{
        this.service.crear(material).subscribe(()=>{
          this.snackBar.open(
            "✅ Material registrado correctamente",
            "Cerrar",
            {
              duration: 3000,
              horizontalPosition: "center",
              verticalPosition: "top"
            }
          );
          this.materialForm.reset();
          this.materialForm.patchValue({
            codigo: ''
          });
          this.cargarMateriales();
        });
      }
  }

  nuevoRegistro(){
    this.materialForm.reset();
    this.modoEdicion = false;
    this.codigoEditar = null;
    const categoria = this.materialForm.get('categoria')?.value;
      if(categoria){
        this.generarCodigo(categoria);
      }
    this.cargarMateriales();
  }

  editar(material: Material){
    this.codigoScroll = material.codigo;
    this.modoEdicion = true;
    this.codigoEditar = material.codigo;
    this.materialForm.patchValue({
      codigo: material.codigo,
      descripcion: material.descripcion,
      unidad: material.unidad,
      precio: material.precio,
      stock: material.stock,
      categoria: material.categoria
    });
  }

  scrollToMaterial(codigo: string){
    const fila = document.querySelector(`[data-codigo="${codigo}"]`);
    if(fila){
      fila.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      fila.classList.add("fila-destacada");
      setTimeout(()=>{
        fila.classList.remove("fila-destacada");
      },2000);
    }
  }

  eliminar(id: number){
    this.service.eliminar(id).subscribe(()=>{
      this.materiales = this.materiales.filter(m => m.id !== id);
      this.filtrar();
      this.snackBar.open(
        "🗑️ Material eliminado",
        "Cerrar",
        {
          duration:3000,
          horizontalPosition:"center",
          verticalPosition:"top"
        }
      );
    })
  }

}
