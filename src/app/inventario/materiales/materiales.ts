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
    MatSortModule 
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private service: MaterialeService,
    private fb: FormBuilder
  ){

    this.materialForm = this.fb.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      unidad: ['', Validators.required],
      precio: [0, Validators.required],
      stock: [0, Validators.required],
      categoria: ['', Validators.required]
    });

  }

  ngAfterViewInit(){
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.cargarMateriales();
  }

  cargarMateriales(){
    this.service.obtenerTodos().subscribe(data=>{
      this.materiales = data;
      this.materialesFiltrados = data;
      this.actualizarTabla();
    })
  }

  aplicarFiltro(event: Event){
    const valor = (event.target as HTMLInputElement).value;
    this.filtroTexto = valor;
    this.dataSource.filter = valor.trim().toLowerCase();
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  filtrarCategoria(categoria:string){
    this.categoriaActual = categoria;
    this.filtrar();
  }

  filtrar(){
    this.materialesFiltrados = this.materiales.filter(m => {
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
      this.paginator.firstPage();
      this.dataSource.paginator = this.paginator;
    }
  }

  guardarMaterial(){
    const material = this.materialForm.value;
    this.service.crear(material).subscribe(()=>{
      this.materialForm.reset();
      this.cargarMateriales();
    })
  }


  eliminar(id:number){
    this.service.eliminar(id).subscribe(()=>{
      this.cargarMateriales();
    })
  }

  editar(material:Material){
    console.log(material);
  }

}
