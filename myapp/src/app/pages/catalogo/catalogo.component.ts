import { Component, OnInit } from '@angular/core';
import { CatalogoService } from '../../services/catalogo.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { AutomationService } from '../../services/automation.service';

@Component({
  selector: 'app-catalogo',
  standalone: false,
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
  
  // Variables para automatización
  backupAutomaticoActivo: boolean = true;
  sincronizacionNubeActiva: boolean = false;
  impresionAutomaticaActiva: boolean = true;
  estadoAutomation: any = {};
  
  constructor(
    public catalogoService: CatalogoService,
    public authService: AuthService,
    public notificationService: NotificationService,
    private automationService: AutomationService
  ) {}
  
  ngOnInit(): void {
    // Verificar si el usuario está logueado y es cajero
    if (!this.authService.isAuthenticated() || !this.authService.isCaja()) {
      // Redirigir a la página principal
      window.location.href = '/';
      return;
    }
    
    // Cargar productos iniciales
    this.cargarProductos();
    
    // Inicializar el menú lateral
    this.inicializarMenuLateral();
    
    // Inicializar servicios de automatización
    this.inicializarAutomation();
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
    console.log(`🔍 Cargando productos para categoría: ${this.categoriaSeleccionada}`);
    this.catalogoService.getProductosPorCategoria(this.categoriaSeleccionada).then(result => {
      console.log(`📦 Productos obtenidos:`, result);
      
      // Verificar duplicados
      const nombres = result.map(p => p.nombre);
      const duplicados = nombres.filter((nombre, index) => nombres.indexOf(nombre) !== index);
      if (duplicados.length > 0) {
        console.warn(`⚠️ Productos duplicados encontrados:`, duplicados);
      }
      
      // Filtrar duplicados basándose en nombre y categoría
      const productosUnicos = result.filter((producto, index, array) => 
        array.findIndex(p => p.nombre === producto.nombre && p.categoria === producto.categoria) === index
      );
      
      console.log(`✅ Productos únicos después del filtro:`, productosUnicos);
      this.productos = productosUnicos;
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
  
  // ========== MÉTODOS DE AUTOMATIZACIÓN ==========
  
  inicializarAutomation(): void {
    // Suscribirse a los estados del AutomationService
    this.automationService.isBackupEnabled.subscribe((enabled: boolean) => {
      this.backupAutomaticoActivo = enabled;
    });
    
    this.automationService.isCloudSyncEnabled.subscribe((enabled: boolean) => {
      this.sincronizacionNubeActiva = enabled;
    });
    
    this.automationService.isAutoPrintEnabled.subscribe((enabled: boolean) => {
      this.impresionAutomaticaActiva = enabled;
    });
    
    // Obtener estado inicial
    this.estadoAutomation = this.automationService.getBackupStatus();
  }
  
  toggleBackupAutomatico(): void {
    this.automationService.toggleBackup(!this.backupAutomaticoActivo);
  }
  
  toggleSincronizacionNube(): void {
    this.automationService.toggleCloudSync(!this.sincronizacionNubeActiva);
  }
  
  toggleImpresionAutomatica(): void {
    this.automationService.toggleAutoPrint(!this.impresionAutomaticaActiva);
  }
  
  ejecutarBackupManual(): void {
    this.automationService.performManualBackup();
  }
  
  ejecutarSincronizacionManual(): void {
    this.automationService.performManualSync();
  }
}
