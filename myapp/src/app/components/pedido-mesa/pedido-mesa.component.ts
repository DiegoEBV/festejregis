import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SocketService, MesaEstado } from '../../services/socket.service';
import { CatalogoService } from '../../services/catalogo.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ProductoPedido {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  notas: string;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  descripcion?: string;
  imagen?: string;
  disponible: boolean;
  tiempoPreparacion?: number;
}

interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  orden: number;
}

@Component({
  selector: 'app-pedido-mesa',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './pedido-mesa.component.html',
  styleUrls: ['./pedido-mesa.component.css']
})
export class PedidoMesaComponent implements OnInit, OnDestroy {
  // Variable estática para controlar la inicialización de productos
  private static productosInicializados: boolean = false;
  
  // Propiedades principales
  mesaNumero: number = 0;
  mesa: MesaEstado | null = null;
  productos: Producto[] = [];
  categorias: Categoria[] = [];
  pedidoActual: ProductoPedido[] = [];
  
  // Estados de UI
  cargando = true;
  enviandoPedido = false;
  conectado = false;
  categoriaSeleccionada = 'todas';
  busqueda = '';
  
  // Configuración
  mostrarCarrito = false;
  modoCompacto = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService,
    private catalogoService: CatalogoService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.inicializarComponente();
    this.configurarSuscripciones();
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private inicializarComponente() {
    // Obtener número de mesa de la ruta
    this.route.params.subscribe(params => {
      this.mesaNumero = +params['numero'];
      if (!this.mesaNumero) {
        this.router.navigate(['/seleccion-mesa']);
        return;
      }
    });

    // Verificar si hay un pedido en progreso en localStorage
    const pedidoGuardado = this.obtenerPedidoEnProgreso();
    if (pedidoGuardado && pedidoGuardado.length > 0) {
      this.pedidoActual = pedidoGuardado;
    }
  }

  private configurarSuscripciones() {
    // Estado de conexión
    const conexionSub = this.socketService.connectionStatus$.subscribe(
      conectado => this.conectado = conectado
    );
    this.subscriptions.push(conexionSub);

    // Estado de mesas
    const mesasSub = this.socketService.mesasEstado$.subscribe(
      mesas => {
        this.mesa = mesas.find(m => m.numero === this.mesaNumero) || null;
        if (!this.mesa) {
          console.error('Mesa no encontrada');
          // Crear mesa por defecto si no existe
          this.mesa = {
            numero: this.mesaNumero,
            ocupada: false,
            pedidoActivo: undefined,
            dispositivos: [],
            capacidad: this.mesaNumero <= 10 ? 4 : 6,
            ubicacion: this.mesaNumero <= 10 ? 'Planta Baja' : 'Segundo Piso',
            estado: 'disponible'
          };
        }
      }
    );
    this.subscriptions.push(mesasSub);

    // Pedidos activos
    const pedidosSub = this.socketService.pedidosActivos$.subscribe(
      pedidos => {
        // Actualizar si hay cambios en los pedidos de esta mesa
        const pedidoMesa = pedidos.find(p => p.mesa === this.mesaNumero);
        if (pedidoMesa) {
          console.log('Pedido actualizado para mesa', this.mesaNumero, pedidoMesa);
        }
      }
    );
    this.subscriptions.push(pedidosSub);
  }

  private async cargarDatos() {
    try {
      this.cargando = true;
      
      // Cargar productos y categorías (simulado - en producción vendría del backend)
      await this.cargarProductos();
      await this.cargarCategorias();
      
      this.cargando = false;
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.cargando = false;
    }
  }

  private async cargarProductos() {
    try {
      // Solo inicializar productos de ejemplo una vez por sesión
      if (!PedidoMesaComponent.productosInicializados) {
        await this.catalogoService.inicializarProductosEjemplo();
        PedidoMesaComponent.productosInicializados = true;
        console.log('Productos inicializados por primera vez');
      }
      
      // Obtener productos del catálogo
      const productosDB = await this.catalogoService.getProductos();
      
      // Convertir formato de base de datos a formato del componente
      this.productos = productosDB.map(p => ({
        id: p.id?.toString() || '',
        nombre: p.nombre,
        precio: p.precio,
        categoria: p.categoria,
        descripcion: p.descripcion || '',
        imagen: p.imagen || '',
        disponible: p.disponible,
        tiempoPreparacion: p.tiempoPreparacion || 15
      }));
    } catch (error) {
      console.error('Error cargando productos:', error);
      // Fallback a productos básicos si hay error
      this.productos = [];
    }
  }

  private async cargarCategorias() {
    try {
      // Obtener categorías del catálogo
      const categoriasDB = this.catalogoService.getCategorias();
      
      // Agregar categoría "Todas" al inicio
      this.categorias = [
        { id: 'todas', nombre: 'Todas', icono: '🍽️', orden: 0 },
        ...categoriasDB.map((cat, index) => ({
          id: cat.id,
          nombre: cat.nombre,
          icono: cat.icono,
          orden: index + 1
        }))
      ];
    } catch (error) {
      console.error('Error cargando categorías:', error);
      // Fallback a categorías básicas si hay error
      this.categorias = [
        { id: 'todas', nombre: 'Todas', icono: '🍽️', orden: 0 }
      ];
    }
  }

  // Métodos de filtrado
  get productosFiltrados(): Producto[] {
    let productos = this.productos;

    // Filtrar por categoría
    if (this.categoriaSeleccionada !== 'todas') {
      productos = productos.filter(p => p.categoria === this.categoriaSeleccionada);
    }

    // Filtrar por búsqueda
    if (this.busqueda.trim()) {
      const termino = this.busqueda.toLowerCase().trim();
      productos = productos.filter(p => 
        p.nombre.toLowerCase().includes(termino) ||
        p.descripcion?.toLowerCase().includes(termino)
      );
    }

    // Filtrar solo disponibles
    return productos.filter(p => p.disponible);
  }

  // Métodos de pedido
  agregarProducto(producto: Producto) {
    const productoExistente = this.pedidoActual.find(p => p.productoId === producto.id);
    
    if (productoExistente) {
      productoExistente.cantidad++;
      productoExistente.subtotal = productoExistente.cantidad * productoExistente.precio;
    } else {
      const nuevoProducto: ProductoPedido = {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
        subtotal: producto.precio,
        notas: ''
      };
      this.pedidoActual.push(nuevoProducto);
    }

    // Guardar pedido en progreso
    this.guardarPedidoEnProgreso(this.pedidoActual);
    
    // Mostrar feedback visual
    this.mostrarNotificacion(`${producto.nombre} agregado al pedido`);
  }

  quitarProducto(productoId: string) {
    const index = this.pedidoActual.findIndex(p => p.productoId === productoId);
    if (index > -1) {
      const producto = this.pedidoActual[index];
      if (producto.cantidad > 1) {
        producto.cantidad--;
        producto.subtotal = producto.cantidad * producto.precio;
      } else {
        this.pedidoActual.splice(index, 1);
      }
      
      this.guardarPedidoEnProgreso(this.pedidoActual);
    }
  }

  eliminarProducto(productoId: string) {
    const index = this.pedidoActual.findIndex(p => p.productoId === productoId);
    if (index > -1) {
      this.pedidoActual.splice(index, 1);
      this.guardarPedidoEnProgreso(this.pedidoActual);
    }
  }

  actualizarNotas(productoId: string, notas: string) {
    const producto = this.pedidoActual.find(p => p.productoId === productoId);
    if (producto) {
      producto.notas = notas;
      this.guardarPedidoEnProgreso(this.pedidoActual);
    }
  }

  // Cálculos
  get totalPedido(): number {
    return this.pedidoActual.reduce((total, producto) => total + producto.subtotal, 0);
  }

  get cantidadItems(): number {
    return this.pedidoActual.reduce((total, producto) => total + producto.cantidad, 0);
  }

  get tiempoEstimado(): number {
    let tiempoMaximo = 0;
    this.pedidoActual.forEach(item => {
      const producto = this.productos.find(p => p.id === item.productoId);
      if (producto?.tiempoPreparacion) {
        tiempoMaximo = Math.max(tiempoMaximo, producto.tiempoPreparacion);
      }
    });
    return tiempoMaximo;
  }

  // Acciones principales
  async confirmarPedido() {
    if (this.pedidoActual.length === 0) {
      this.mostrarNotificacion('Agrega productos al pedido', 'error');
      return;
    }

    if (!this.conectado) {
      this.mostrarNotificacion('Sin conexión al servidor', 'error');
      return;
    }

    try {
      this.enviandoPedido = true;
      
      // Enviar pedido via Socket
      this.socketService.enviarPedido({
        mesa: this.mesaNumero,
        productos: this.pedidoActual,
        total: this.totalPedido,
        timestamp: new Date()
      });
      
      // Limpiar pedido actual
      this.pedidoActual = [];
      this.limpiarPedidoEnProgreso();
      
      this.mostrarNotificacion('Pedido enviado correctamente', 'success');
      
      // Opcional: redirigir o mostrar confirmación
      setTimeout(() => {
        this.router.navigate(['/seleccion-mesa']);
      }, 2000);
      
    } catch (error) {
      console.error('Error enviando pedido:', error);
      this.mostrarNotificacion('Error enviando pedido', 'error');
    } finally {
      this.enviandoPedido = false;
    }
  }

  cancelarPedido() {
    if (this.pedidoActual.length > 0) {
      if (confirm('¿Estás seguro de cancelar el pedido actual?')) {
        this.pedidoActual = [];
        this.limpiarPedidoEnProgreso();
        this.mostrarNotificacion('Pedido cancelado');
      }
    }
  }

  volverASeleccion() {
    if (this.pedidoActual.length > 0) {
      if (confirm('Tienes un pedido en progreso. ¿Deseas salir sin enviarlo?')) {
        this.router.navigate(['/seleccion-mesa']);
      }
    } else {
      this.router.navigate(['/seleccion-mesa']);
    }
  }

  // Métodos de UI
  seleccionarCategoria(categoriaId: string) {
    this.categoriaSeleccionada = categoriaId;
  }

  toggleCarrito() {
    this.mostrarCarrito = !this.mostrarCarrito;
  }

  toggleModoCompacto() {
    this.modoCompacto = !this.modoCompacto;
  }

  // Utilidades
  formatearPrecio(precio: number): string {
    return `$${precio.toFixed(2)}`;
  }

  obtenerProducto(productoId: string): Producto | undefined {
    return this.productos.find(p => p.id === productoId);
  }

  private mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') {
    // Implementar sistema de notificaciones (toast, snackbar, etc.)
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    
    // Ejemplo simple con alert (reemplazar por sistema de notificaciones real)
    if (tipo === 'error') {
      alert(`Error: ${mensaje}`);
    }
  }

  // Métodos de validación
  puedeConfirmarPedido(): boolean {
    return this.pedidoActual.length > 0 && 
           this.conectado && 
           !this.enviandoPedido && 
           this.mesa !== null;
  }

  esMesaValida(): boolean {
    return this.mesa !== null;
  }

  // Métodos para manejo de localStorage
  private obtenerPedidoEnProgreso(): ProductoPedido[] {
    const pedido = localStorage.getItem(`pedido_mesa_${this.mesaNumero}`);
    return pedido ? JSON.parse(pedido) : [];
  }

  private guardarPedidoEnProgreso(pedido: ProductoPedido[]): void {
    localStorage.setItem(`pedido_mesa_${this.mesaNumero}`, JSON.stringify(pedido));
  }

  private limpiarPedidoEnProgreso(): void {
    localStorage.removeItem(`pedido_mesa_${this.mesaNumero}`);
  }
}