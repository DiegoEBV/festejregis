import { Component, OnInit } from '@angular/core';
import { CatalogoService } from '../../services/catalogo.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.css']
})
export class CatalogoComponent implements OnInit {
  categorias: string[] = [
    'menu', 'sopa', 'taper', 'ceviches', 'chicharrones', 
    'arroces', 'sudados', 'sopas', 'bebidas', 'agregados'
  ];
  
  categoriaSeleccionada: string = 'menu';
  
  // Método para cambiar la categoría seleccionada
  cambiarCategoria(categoria: string): void {
    this.categoriaSeleccionada = categoria;
    this.cargarProductos();
  }
  productoSeleccionado: any = null;
  
  nuevoProducto: any = {
    nombre: '',
    precio: 0
  };
  
  constructor(
    public catalogoService: CatalogoService,
    public authService: AuthService,
    private notificationService: NotificationService
  ) { }
  
  ngOnInit(): void {
    // Verificar si el usuario está logueado y es cajero
    if (!this.authService.isAuthenticated() || !this.authService.isCajero()) {
      // Redirigir a la página principal
      window.location.href = '/';
      return;
    }
    
    // Cargar productos iniciales
    this.cargarProductos();
    
    // Inicializar el menú lateral
    this.inicializarMenuLateral();
  }
  
  inicializarMenuLateral(): void {
    const menuButton = document.getElementById('menuButton');
    const sideMenu = document.getElementById('sideMenu');
    
    if (menuButton && sideMenu) {
      menuButton.addEventListener('click', () => {
        sideMenu.classList.toggle('open');
      });
      
      // Cerrar menú al hacer clic fuera
      document.addEventListener('click', (event) => {
        if (!sideMenu.contains(event.target as Node) && 
            event.target !== menuButton) {
          sideMenu.classList.remove('open');
        }
      });
    }
  }
  
  // Propiedad para almacenar los productos
  productos: any[] = [];
  
  // Método para cargar los productos de la categoría seleccionada
  cargarProductos(): void {
    this.catalogoService.getProductosPorCategoria(this.categoriaSeleccionada).then(result => {
      this.productos = result;
    });
  }
  
  // Método para obtener los productos cargados
  obtenerProductos(): any[] {
    return this.productos;
  }
  
  seleccionarProducto(producto: any): void {
    this.productoSeleccionado = { ...producto };
  }
  
  guardarProducto(): void {
    if (!this.productoSeleccionado) return;
    
    if (!this.productoSeleccionado.nombre || this.productoSeleccionado.precio <= 0) {
      this.notificationService.warning('Nombre y precio son obligatorios');
      return;
    }
    
    // Asegurarse de que el producto tenga la categoría correcta
    this.productoSeleccionado.categoria = this.categoriaSeleccionada;
    
    // Convertir el ID a número para asegurar compatibilidad con el servicio
    const id = Number(this.productoSeleccionado.id);
    
    this.catalogoService.actualizarProducto(
      id, 
      this.productoSeleccionado
    ).then(() => {
      this.notificationService.success('Producto actualizado correctamente');
      this.productoSeleccionado = null;
      // Recargar productos
      this.cargarProductos();
    });
  }
  
  agregarProducto(): void {
    if (!this.nuevoProducto.nombre || this.nuevoProducto.precio <= 0) {
      this.notificationService.warning('Nombre y precio son obligatorios');
      return;
    }
    
    // Crear una copia del producto con la categoría correcta
    const producto = { 
      ...this.nuevoProducto,
      categoria: this.categoriaSeleccionada
    };
    
    this.catalogoService.agregarProducto(producto).then(() => {
      this.notificationService.success('Producto agregado correctamente');
      this.nuevoProducto = { nombre: '', precio: 0 };
      // Recargar productos
      this.cargarProductos();
    });
  }
  
  eliminarProducto(producto: any): void {
    if (confirm(`¿Está seguro de eliminar el producto ${producto.nombre}?`)) {
      // Convertir el ID a número para asegurar compatibilidad con el servicio
      const id = Number(producto.id);
      
      this.catalogoService.eliminarProducto(id).then(() => {
        if (this.productoSeleccionado && this.productoSeleccionado.nombre === producto.nombre) {
          this.productoSeleccionado = null;
        }
        
        this.notificationService.success('Producto eliminado correctamente');
        // Recargar productos
        this.cargarProductos();
      });
    }
  }
  
  cancelarEdicion(): void {
    this.productoSeleccionado = null;
  }
}
