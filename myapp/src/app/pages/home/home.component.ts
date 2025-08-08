import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { CatalogoService } from '../../services/catalogo.service';
import { DexieService } from '../../services/dexie.service';
import { LoginModalComponent } from '../../components/login-modal/login-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LoginModalComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  fechaActual: string = '';
  cajaApertura: number = 0;
  efectivoTotal: number = 0;
  yapeTotal: number = 0;
  tarjetaTotal: number = 0;
  totalDia: number = 0;
  ganancia: number = 0;
  
  // Variables para cierre automático
  fechaAnterior: string = '';
  cierreAutomaticoActivo: boolean = true;
  ultimaVerificacionCierre: Date = new Date();
  

  
  // Variables para reportes
  fechaInicioReporte: string = '';
  fechaFinReporte: string = '';
  mostrarResumenReporte: boolean = false;
  efectivoReporte: number = 0;
  yapeReporte: number = 0;
  tarjetaReporte: number = 0;
  totalReporte: number = 0;
  gananciaReporte: number = 0;
  detallesReporte: any[] = [];
  
  pedidosParaLlevar: any[] = [];
  pedidosDelivery: any[] = [];
  historialPagados: any[] = [];
  
  // Gestión de mesas
  mesas: any[] = [];
  mesasDivididas: any = {};
  TOTAL_MESAS = 27;
  MESA_ESTADOS = { LIBRE: 'libre', OCUPADA: 'ocupada', PARCIAL: 'parcial' };
  
  // Modal de mesa
  showMesaModal: boolean = false;
  mesaModalContent: string = '';
  mesaSeleccionada: any = null;
  
  // Estados del modal
  modalType: string = ''; // 'libre', 'ocupada', 'dividir'
  modalMesa: any = null;
  modalIdPedido: number | null = null;
  modalMonto: number = 0;
  modalPagado: number = 0;
  modalSaldoPendiente: number = 0;
  modalAbonosStr: string = '';
  modalBaseNum: number = 0;
  selectedPaymentMethod: string = '';
  
  // Pedido actual
  pedidoActual: any = null;
  showPedidoModal: boolean = false;
  
  // Variables para formularios de pedidos
  pedidoDetalle: any[] = [];
  productoSeleccionado: any = null;
  productoInput: string = '';
  cantidadInput: number = 1;
  observacionInput: string = '';
  montoDirecto: number = 0;
  totalPedido: number = 0;
  
  // Autocompletado
  sugerenciasProductos: any[] = [];
  showSugerencias: boolean = false;
  
  // Catálogo de productos
  catalogoProductos: any[] = [];
  catalogoCargado: boolean = false;

  // Variables para edición de pedidos
  editandoPedido: boolean = false;
  idPedidoEditando: number | null = null;
  
  // Variables para el modal de login
  showLoginModal: boolean = true;
  usuario: string = 'cajero';
  nombreMozo: string = '';
  clave: string = '';
  usuarioActual: any = null;
  
  // Variables para navegación con teclado en autocompletado
  selectedSuggestionIndex: number = -1;
  
  // Variables para filtros de categoría
  categoriaSeleccionada: string = 'todos';
  categorias: any[] = [];
  productosFiltrados: any[] = [];
  
  constructor(
    private dexieService: DexieService,
    private socketService: SocketService,
    public authService: AuthService,
    public notificationService: NotificationService,
    private catalogoService: CatalogoService,

    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.actualizarFecha();
    this.inicializarCierreAutomatico();
    setInterval(() => this.actualizarFecha(), 60000); // Actualizar cada minuto
    setInterval(() => this.verificarCierreAutomatico(), 300000); // Verificar cierre cada 5 minutos
    
    // Inicializar fechas por defecto para reportes
    this.inicializarFechasReporte();
    
    // Verificar si hay un usuario autenticado
    this.usuarioActual = this.authService.currentUserValue;
    if (!this.usuarioActual) {
      this.showLoginModal = true;
    } else {
      this.showLoginModal = false;
      this.inicializarAplicacion();
    }

    // Suscribirse a cambios de autenticación
    this.authService.currentUser.subscribe(user => {
      this.usuarioActual = user;
      if (user) {
        this.showLoginModal = false;
        this.inicializarAplicacion();
      }
    });
    
    // Inicializar el menú lateral
    this.inicializarMenuLateral();
    
    // Inicializar el modo oscuro
    this.inicializarModoOscuro();
    
    // Configurar eventos de teclado para autocompletado
    this.configurarEventosTeclado();
    

  }
  

  
  actualizarFecha(): void {
    const ahora = new Date();
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    this.fechaActual = ahora.toLocaleDateString('es-ES', opciones);
    
    // Verificar cambio de día para cierre automático
    const fechaHoyStr = ahora.toISOString().split('T')[0];
    if (this.fechaAnterior && this.fechaAnterior !== fechaHoyStr) {
      this.ejecutarCierreAutomatico(this.fechaAnterior);
    }
    this.fechaAnterior = fechaHoyStr;
  }

  inicializarFechasReporte(): void {
    const hoy = new Date();
    const fechaFormateada = hoy.toISOString().split('T')[0];
    this.fechaInicioReporte = fechaFormateada;
    this.fechaFinReporte = fechaFormateada;
  }
  
  inicializarCierreAutomatico(): void {
    const hoy = new Date();
    this.fechaAnterior = hoy.toISOString().split('T')[0];
    this.ultimaVerificacionCierre = hoy;
    
    // Verificar si hay una caja del día anterior que no se cerró
    this.verificarCierresPendientes();
  }
  
  async verificarCierresPendientes(): Promise<void> {
    try {
      const hoy = new Date();
      const ayer = new Date(hoy);
      ayer.setDate(ayer.getDate() - 1);
      const fechaAyer = ayer.toISOString().split('T')[0];
      
      // Verificar si la caja de ayer está cerrada
      const cajaCerrada = await this.dexieService.verificarCajaCerrada(fechaAyer);
      if (!cajaCerrada) {
        const cajaAyer = await this.dexieService.getCajaPorFecha(fechaAyer);
        if (cajaAyer) {
          console.log('Detectada caja pendiente de cierre:', fechaAyer);
          await this.ejecutarCierreAutomatico(fechaAyer);
        }
      }
    } catch (error) {
      console.error('Error al verificar cierres pendientes:', error);
    }
  }
  
  async verificarCierreAutomatico(): Promise<void> {
    if (!this.cierreAutomaticoActivo) return;
    
    try {
      const ahora = new Date();
      const hora = ahora.getHours();
      
      // Verificar si es después de las 23:00 (11 PM)
      if (hora >= 23) {
        const fechaHoy = ahora.toISOString().split('T')[0];
        const cajaCerrada = await this.dexieService.verificarCajaCerrada(fechaHoy);
        
        if (!cajaCerrada) {
          console.log('Iniciando cierre automático de caja para:', fechaHoy);
          await this.ejecutarCierreAutomatico(fechaHoy);
        }
      }
      
      this.ultimaVerificacionCierre = ahora;
    } catch (error) {
      console.error('Error en verificación de cierre automático:', error);
    }
  }
  
  async ejecutarCierreAutomatico(fecha: string): Promise<void> {
    try {
      console.log('Ejecutando cierre automático para la fecha:', fecha);
      
      const resultadoCierre = await this.dexieService.cerrarCajaAutomatico(fecha);
      
      if (resultadoCierre) {
        const mensaje = `🔒 CIERRE AUTOMÁTICO DE CAJA\n` +
                       `Fecha: ${fecha}\n` +
                       `Total Ventas: S/. ${resultadoCierre.total.toFixed(2)}\n` +
                       `Efectivo: S/. ${resultadoCierre.efectivo.toFixed(2)}\n` +
                       `Yape: S/. ${resultadoCierre.yape.toFixed(2)}\n` +
                       `Tarjeta: S/. ${resultadoCierre.tarjeta.toFixed(2)}\n` +
                       `Ganancia: S/. ${resultadoCierre.ganancia.toFixed(2)}`;
        
        this.notificationService.success('Caja cerrada automáticamente');
        console.log(mensaje);
        
        // Actualizar los totales si es el día actual
        const hoy = new Date().toISOString().split('T')[0];
        if (fecha === hoy) {
          await this.calcularTotales();
        }
      } else {
        console.log('No se pudo cerrar la caja automáticamente para:', fecha);
      }
    } catch (error) {
      console.error('Error al ejecutar cierre automático:', error);
      this.notificationService.error('Error en el cierre automático de caja');
    }
  }
  
  toggleCierreAutomatico(): void {
    this.cierreAutomaticoActivo = !this.cierreAutomaticoActivo;
    const estado = this.cierreAutomaticoActivo ? 'activado' : 'desactivado';
    this.notificationService.success(`Cierre automático ${estado}`);
    console.log(`Cierre automático de caja ${estado}`);
  }
  
  inicializarMenuLateral(): void {
    this.inicializarMenuMobile();
  }

  inicializarMenuMobile(): void {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('show');
      });
      
      // Cerrar menú al hacer clic fuera
      document.addEventListener('click', (event) => {
        if (!mobileMenu.contains(event.target as Node) && 
            event.target !== mobileMenuBtn) {
          mobileMenu.classList.remove('show');
        }
      });
      
      // Cerrar menú al hacer clic en un enlace
      const menuItems = mobileMenu.querySelectorAll('.mobile-menu-item');
      menuItems.forEach(item => {
        item.addEventListener('click', () => {
          mobileMenu.classList.remove('show');
        });
      });
    }
  }

  inicializarModoOscuro(): void {
    const toggleDarkMode = document.getElementById('toggleDarkMode');
    const hostElement = document.querySelector('app-home');
    
    if (toggleDarkMode && hostElement) {
      // Verificar preferencia guardada
      const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
      if (darkModeEnabled) {
        hostElement.classList.add('dark-mode');
        toggleDarkMode.textContent = '☀️';
      }
      
      toggleDarkMode.addEventListener('click', () => {
        hostElement.classList.toggle('dark-mode');
        const isDarkMode = hostElement.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode.toString());
        toggleDarkMode.textContent = isDarkMode ? '☀️' : '🌙';
      });
    }
  }
  
  logout(): void {
    this.authService.logout();
    this.showLoginModal = true;
    this.usuarioActual = null;
  }
  
  async inicializarAplicacion(): Promise<void> {
    // Cargar catálogo de productos
    await this.cargarCatalogoProductos();
    
    // Cargar datos iniciales directamente ya que Dexie se inicializa automáticamente
    this.cargarDatos();
    
    // Configurar eventos de teclado para autocompletado
    this.configurarEventosTeclado();
    
    // Conectar socket si es necesario
    if (this.authService.isCaja() || this.authService.isMoso() || this.authService.isCocina()) {
      this.socketService.connect(this.authService.currentUserValue);
      this.configurarEventosSocket();
    }
    
    // No es necesario solicitar permisos de notificación ya que el servicio no tiene este método
  }
  
  async cargarCatalogoProductos(): Promise<void> {
    // Evitar múltiples cargas del catálogo
    if (this.catalogoCargado) {
      return;
    }
    
    try {
      this.catalogoProductos = await this.catalogoService.getProductos();
      // Si no hay productos, inicializar con productos de ejemplo
      if (this.catalogoProductos.length === 0) {
        await this.catalogoService.inicializarProductosEjemplo();
        this.catalogoProductos = await this.catalogoService.getProductos();
      }
      
      // Cargar categorías
      this.categorias = this.catalogoService.getCategorias();
      
      this.catalogoCargado = true;
    } catch (error) {
      console.error('Error al cargar catálogo:', error);
    }
  }

  cargarDatos(): void {
    // Cargar caja inicial
    this.dexieService.getCajaActual().then((caja: any) => {
      if (caja) {
        this.cajaApertura = caja.monto;
      }
    });
    
    // Cargar pedidos para llevar
    this.cargarPedidosParaLlevar();
    
    // Cargar pedidos delivery
    this.cargarPedidosDelivery();
    
    // Cargar historial de pagados
    this.cargarHistorialPagados();
    
    // Calcular totales
    this.calcularTotales();
    
    // Renderizar mesas
    this.renderMesas();
  }
  
  cargarPedidosParaLlevar(): void {
    this.dexieService.getPedidosEspecialesPorTipo('llevar').then((pedidos: any[]) => {
      this.pedidosParaLlevar = pedidos;
    });
  }
  
  cargarPedidosDelivery(): void {
    this.dexieService.getPedidosEspecialesPorTipo('delivery').then((pedidos: any[]) => {
      this.pedidosDelivery = pedidos;
    });
  }
  
  cargarHistorialPagados(): void {
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const finDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999).toISOString();
    
    this.dexieService.getHistorialPagos().then((historial: any[]) => {
      // Filtrar por fecha del día actual
      const pagosFiltrados = historial.filter(pago => {
        const fechaPago = new Date(pago.fecha);
        const fechaHoy = new Date();
        return fechaPago.toDateString() === fechaHoy.toDateString();
      });
      
      // Agrupar pagos por pedido
      const pagosAgrupados = new Map();
      
      pagosFiltrados.forEach(pago => {
        const key = `${pago.pedidoId}-${pago.tipo}-${pago.numero}`;
        
        if (pagosAgrupados.has(key)) {
          const pagoExistente = pagosAgrupados.get(key);
          // Agregar el nuevo pago a la lista de detalles
          pagoExistente.detallesPagos.push({
            monto: pago.total,
            metodo: pago.metodoPago,
            fecha: pago.fecha
          });
          // Sumar el total
          pagoExistente.total += pago.total;
          // Mantener la fecha más reciente
          if (new Date(pago.fecha) > new Date(pagoExistente.fecha)) {
            pagoExistente.fecha = pago.fecha;
          }
        } else {
          // Crear nueva entrada agrupada
          pagosAgrupados.set(key, {
            pedidoId: pago.pedidoId,
            tipo: pago.tipo,
            numero: pago.numero,
            total: pago.total,
            fecha: pago.fecha,
            items: pago.items || [],
            detallesPagos: [{
              monto: pago.total,
              metodo: pago.metodoPago,
              fecha: pago.fecha
            }]
          });
        }
      });
      
      // Convertir el Map a array y ordenar por fecha
      this.historialPagados = Array.from(pagosAgrupados.values()).sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
    });
  }
  
  calcularTotales(): void {
    // Obtener todos los pagos y filtrar por fecha del día actual
    this.dexieService.getHistorialPagos().then((todosLosPagos: any[]) => {
      const hoy = new Date();
      const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const finDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
      
      // Filtrar pagos del día actual
      const pagosDelDia = todosLosPagos.filter(pago => {
        const fechaPago = new Date(pago.fecha);
        return fechaPago >= inicioDelDia && fechaPago <= finDelDia;
      });
      
      // Inicializar totales
      let efectivo = 0;
      let yape = 0;
      let tarjeta = 0;
      
      // Calcular totales por método de pago
      pagosDelDia.forEach(pago => {
        const monto = pago.total || pago.monto || 0;
        if (pago.metodoPago === 'efectivo') {
          efectivo += monto;
        } else if (pago.metodoPago === 'yape') {
          yape += monto;
        } else if (pago.metodoPago === 'tarjeta') {
          tarjeta += monto;
        }
      });
      
      // Actualizar propiedades
      this.efectivoTotal = efectivo;
      this.yapeTotal = yape;
      this.tarjetaTotal = tarjeta;
      this.totalDia = this.efectivoTotal + this.yapeTotal + this.tarjetaTotal;
      this.ganancia = this.totalDia - this.cajaApertura;
    });
  }

  // Gestión de mesas
  async renderMesas(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const pedidosArr = await this.dexieService.getPedidosPorFecha(today);
    
    const todosLosPedidos = pedidosArr;
    console.log('Total pedidos:', todosLosPedidos.length);
    
    let pedidos: any = {};
    todosLosPedidos.forEach((p: any) => {
      if (!pedidos[p.mesa]) pedidos[p.mesa] = [];
      pedidos[p.mesa].push(p);
    });

    this.mesas = [];
    
    // Cargar mesas divididas del localStorage
    const savedMesasDivididas = localStorage.getItem('mesasDivididas');
    if (savedMesasDivididas) {
      try {
        this.mesasDivididas = JSON.parse(savedMesasDivididas);
      } catch (e) {
        console.error('Error al leer mesas divididas:', e);
      }
    }

    for (let n = 1; n <= this.TOTAL_MESAS; n++) {
      if (this.mesasDivididas[n]) {
        // Mesa dividida
        for (const sub of this.mesasDivididas[n]) {
          let estado = this.MESA_ESTADOS.LIBRE;
          let monto = 0;
          let pagado = 0;
          let idPedido = null;
          
          const mesaPedidos = pedidos[sub] || [];
          if (mesaPedidos.length > 0) {
          const pedidoActivo = mesaPedidos.find((p: any) => p.monto > p.pagado && p.estado !== 'anulado');
          if (pedidoActivo) {
            estado = pedidoActivo.pagado === 0 ? this.MESA_ESTADOS.OCUPADA : this.MESA_ESTADOS.PARCIAL;
            monto = pedidoActivo.monto;
            pagado = pedidoActivo.pagado;
            idPedido = pedidoActivo.id;
          }
        }
          
          this.mesas.push({
            numero: sub,
            estado: estado,
            monto: monto,
            pagado: pagado,
            idPedido: idPedido,
            dividida: true
          });
        }
      } else {
        // Mesa normal
        const mesaPedidos = pedidos[n] || [];
        let estado = this.MESA_ESTADOS.LIBRE;
        let monto = 0;
        let pagado = 0;
        let idPedido = null;
        
        if (mesaPedidos.length > 0) {
          const pedidoActivo = mesaPedidos.find((p: any) => p.monto > p.pagado && p.estado !== 'anulado');
          if (pedidoActivo) {
            estado = pedidoActivo.pagado === 0 ? this.MESA_ESTADOS.OCUPADA : this.MESA_ESTADOS.PARCIAL;
            monto = pedidoActivo.monto;
            pagado = pedidoActivo.pagado;
            idPedido = pedidoActivo.id;
            console.log(`Mesa ${n}: estado=${estado}, monto=${monto}, pagado=${pagado}`);
          }
        }
        
        this.mesas.push({
          numero: n,
          estado: estado,
          monto: monto,
          pagado: pagado,
          idPedido: idPedido,
          dividida: false
        });
      }
    }
    
    // Log final para verificar el estado de las mesas
    console.log('Estado final de mesas:', this.mesas);
    console.log('Mesas con estado ocupada:', this.mesas.filter(m => m.estado === 'ocupada'));
    console.log('Mesas con estado parcial:', this.mesas.filter(m => m.estado === 'parcial'));
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  async clickMesa(mesa: any): Promise<void> {
    console.log('Click en mesa:', mesa);
    
    // Si la mesa está dividida, mostrar opciones de unir
    if (mesa.dividida) {
      const baseNum = typeof mesa.numero === 'string' ? parseInt(mesa.numero.match(/^\d+/)?.[0] || mesa.numero) : mesa.numero;
      this.modalType = 'unir';
      this.modalMesa = baseNum;
      this.modalBaseNum = baseNum;
      this.showMesaModal = true;
      return;
    }
    
    if (mesa.estado === this.MESA_ESTADOS.LIBRE) {
      // Mesa libre - mostrar opciones para nuevo pedido
      this.modalType = 'libre';
      this.modalMesa = mesa.numero;
      this.modalBaseNum = typeof mesa.numero === 'string' ? parseInt(mesa.numero.match(/^\d+/)?.[0] || mesa.numero) : mesa.numero;
      this.showMesaModal = true;
    } else {
      // Mesa ocupada - mostrar detalles del pedido
      console.log('Mesa ocupada clickeada:', { numero: mesa.numero, idPedido: mesa.idPedido, monto: mesa.monto });
      this.modalType = 'ocupada';
      this.modalMesa = mesa.numero;
      this.modalIdPedido = mesa.idPedido;
      this.modalMonto = mesa.monto;
      this.modalPagado = mesa.pagado;
      this.modalSaldoPendiente = mesa.monto - mesa.pagado;
      console.log('modalIdPedido establecido a:', this.modalIdPedido);
      this.modalBaseNum = mesa.monto - mesa.pagado > 0 ? 1 : 0;
      
      // Cargar detalles de abonos si existen
      if (mesa.idPedido) {
        try {
          const pedido = await this.dexieService.getPedidoPorId(mesa.idPedido);
          if (pedido && pedido.abonos && Array.isArray(pedido.abonos) && pedido.abonos.length > 0) {
            const pagadoActual = pedido.abonos.reduce((sum: number, a: any) => sum + Number(a.monto), 0);
            this.modalPagado = pagadoActual;
            this.modalSaldoPendiente = mesa.monto - pagadoActual;
            this.modalAbonosStr = pedido.abonos.map((a: any) =>
              `<div style="font-size:0.97em; color:#444; margin-bottom:2px;">
                ${a.tipo_pago.charAt(0).toUpperCase() + a.tipo_pago.slice(1)}: S/ ${Number(a.monto).toFixed(2)}
              </div>`
            ).join('');
          } else {
            this.modalAbonosStr = '';
          }
        } catch (error) {
          console.error('Error al cargar detalles del pedido:', error);
        }
      }
      
      this.showMesaModal = true;
    }
  }

  mostrarOpcionesMesa(mesa: any, event: MouseEvent): void {
    event.preventDefault();
    const baseNum = typeof mesa.numero === 'string' ? parseInt(mesa.numero.match(/^\d+/)?.[0] || mesa.numero) : mesa.numero;
    
    this.modalType = mesa.dividida ? 'unir' : 'dividir';
    this.modalMesa = baseNum;
    this.modalBaseNum = baseNum;
    this.showMesaModal = true;
  }

  dividirMesa(baseNum: number): void {
    this.mesasDivididas[baseNum] = [`${baseNum}A`, `${baseNum}B`];
    localStorage.setItem('mesasDivididas', JSON.stringify(this.mesasDivididas));
    this.closeMesaModal();
    this.renderMesas();
  }

  unirMesa(baseNum: number): void {
    delete this.mesasDivididas[baseNum];
    localStorage.setItem('mesasDivididas', JSON.stringify(this.mesasDivididas));
    this.closeMesaModal();
    this.renderMesas();
  }

  // Métodos para el modal de login
  onLoginSuccess(user: any): void {
    this.usuarioActual = user;
    this.showLoginModal = false;
    this.inicializarAplicacion();
  }

  onCloseLoginModal(): void {
    this.showLoginModal = false;
  }

  closeMesaModal() {
    this.showMesaModal = false;
    this.mesaModalContent = '';
    this.modalType = '';
    this.selectedPaymentMethod = '';
    
    // Limpiar variables del formulario de pedidos para evitar que persistan entre mesas
    this.pedidoDetalle = [];
    this.totalPedido = 0;
    this.productoSeleccionado = null;
    this.productoInput = '';
    this.cantidadInput = 1;
    this.observacionInput = '';
    this.montoDirecto = 0;
    this.showSugerencias = false;
    this.sugerenciasProductos = [];
    
    // Resetear modo de edición
    this.editandoPedido = false;
    this.idPedidoEditando = null;
    
    // Resetear variables de pedidos especiales
    this.nombreClienteEspecial = '';
    this.direccionEspecial = '';
    this.telefonoEspecial = '';
    this.montoEspecial = 0;
    this.observacionEspecial = '';
  }

  selectPaymentMethod(method: string) {
    this.selectedPaymentMethod = method;
  }

  async onAbonoSubmit(form: any) {
    const formData = new FormData(form);
    const abono = parseFloat(formData.get('abono') as string);
    const tipoPago = this.selectedPaymentMethod;
    
    if (abono && tipoPago && this.modalIdPedido) {
      await this.abonarPedido(this.modalIdPedido, abono, tipoPago, this.modalMonto, this.modalPagado, this.modalMesa);
    }
  }

  crearNuevoPedido(mesa: any): void {
    // Implementar creación de nuevo pedido
    console.log('Crear nuevo pedido para mesa:', mesa);
  }

  verPedido(idPedido: number): void {
    // Implementar visualización de pedido existente
    console.log('Ver pedido:', idPedido);
  }

  async mostrarFormularioPorPlato(num: string): Promise<void> {
    console.log('Mostrar formulario por plato para mesa:', num);
    
    // Siempre resetear variables del pedido para evitar que persistan entre mesas
    // Solo mantener los datos si estamos editando el mismo pedido de la misma mesa
    const mismaMesaEditando = this.editandoPedido && this.modalMesa === parseInt(num);
    
    if (!mismaMesaEditando) {
      this.pedidoDetalle = [];
      this.totalPedido = 0;
      // Si estamos cambiando de mesa, resetear el modo de edición
      if (this.modalMesa !== parseInt(num)) {
        this.editandoPedido = false;
        this.idPedidoEditando = null;
      }
    }
    
    this.productoSeleccionado = null;
    this.productoInput = '';
    this.cantidadInput = 1;
    this.observacionInput = '';
    this.showSugerencias = false;
    this.sugerenciasProductos = [];
    
    // Inicializar filtros
    this.categoriaSeleccionada = 'todos';
    await this.filtrarProductosPorCategoria();
    
    // Configurar modal Angular
    this.modalType = 'pedido-platos';
    this.modalMesa = parseInt(num);
    this.showMesaModal = true;
  }

  mostrarFormularioPorMonto(num: string): void {
    console.log('Mostrar formulario por monto para mesa:', num);
    
    // Resetear variables
    this.montoDirecto = 0;
    this.observacionInput = '';
    
    // Configurar modal Angular
    this.modalType = 'pedido-monto';
    this.modalMesa = parseInt(num);
    this.showMesaModal = true;
  }

  async abonarPedido(idPedido: number, abono: number, tipoPago: string, monto: number, pagadoActual: number, num: string): Promise<void> {
    // Validar que el abono no sea mayor al saldo pendiente
    const saldoPendiente = monto - pagadoActual;
    
    if (abono > saldoPendiente) {
      this.notificationService.error('El monto no puede ser mayor al saldo pendiente');
      return;
    }
    
    try {
      await this.dexieService.abonarPedido(idPedido, abono, tipoPago);
      this.notificationService.success('Abono registrado correctamente');
      
      // Actualizar los datos del modal inmediatamente
      const pedidoActualizado = await this.dexieService.getPedidoPorId(idPedido);
      if (pedidoActualizado) {
        this.modalPagado = pedidoActualizado.pagado || 0;
        this.modalSaldoPendiente = this.modalMonto - this.modalPagado;
        
        // Actualizar el detalle de abonos
        if (pedidoActualizado.abonos && Array.isArray(pedidoActualizado.abonos) && pedidoActualizado.abonos.length > 0) {
          this.modalAbonosStr = pedidoActualizado.abonos.map((a: any) =>
            `<div style="font-size:0.97em; color:#444; margin-bottom:2px;">
              ${a.tipo_pago.charAt(0).toUpperCase() + a.tipo_pago.slice(1)}: S/ ${Number(a.monto).toFixed(2)} - ${new Date(a.fecha).toLocaleString()}
            </div>`
          ).join('');
        }
        
        // Si el pago está completo, limpiar la mesa
        if (this.modalSaldoPendiente <= 0) {
          await this.limpiarMesa(num);
          this.closeMesaModal();
          this.notificationService.success('Pago completado. Mesa limpiada y lista para nuevos clientes.');
        }
      }
      
      await this.renderMesas();
      await this.calcularTotales();
      await this.cargarHistorialPagados();
    } catch (error) {
      console.error('Error al abonar pedido:', error);
      this.notificationService.error('Error al registrar el abono');
    }
  }

  pagarPedidoEspecial(pedido: any): void {
    // Configurar el modal para pago de pedido especial
    this.modalType = 'pago-especial';
    this.pedidoEspecialSeleccionado = pedido;
    this.montoAbonoPedidoEspecial = pedido.monto - (pedido.pagado || 0);
    this.selectedPaymentMethod = '';
    this.showMesaModal = true;
  }

  async anularPedido(idPedido: number | null, num: string): Promise<void> {
    if (!idPedido) {
      this.notificationService.error('No se encontró un pedido válido para anular');
      return;
    }
    
    if (confirm('¿Está seguro de anular este pedido?')) {
      try {
        await this.dexieService.anularPedido(idPedido);
        await this.limpiarMesa(num);
        this.notificationService.success('Pedido anulado correctamente. Mesa limpiada y lista para nuevos clientes.');
        this.closeMesaModal();
        await this.renderMesas();
        await this.calcularTotales();
      } catch (error) {
        console.error('Error al anular pedido:', error);
        this.notificationService.error('Error al anular el pedido');
      }
    }
  }

  /**
   * Limpia la mesa eliminando todos los productos seleccionados y reseteando las variables del pedido
   * @param num Número de la mesa a limpiar
   */
  async limpiarMesa(num: string): Promise<void> {
    try {
      // Resetear variables del pedido
      this.pedidoDetalle = [];
      this.totalPedido = 0;
      this.productoSeleccionado = null;
      this.productoInput = '';
      this.cantidadInput = 1;
      this.observacionInput = '';
      this.montoDirecto = 0;
      this.showSugerencias = false;
      this.sugerenciasProductos = [];
      
      // Resetear variables del modal
      this.modalMonto = 0;
      this.modalPagado = 0;
      this.modalSaldoPendiente = 0;
      this.modalAbonosStr = '';
      this.modalIdPedido = null;
      
      // Resetear modo de edición si estaba activo
      this.editandoPedido = false;
      this.idPedidoEditando = null;
      
      // Limpiar elementos del DOM si existen
      const platosDiv = document.getElementById('platosSeleccionados');
      if (platosDiv) {
        platosDiv.innerHTML = '';
      }
      
      const totalSpan = document.getElementById('totalPedido');
      if (totalSpan) {
        totalSpan.textContent = '0.00';
      }
      
      console.log(`Mesa ${num} limpiada correctamente`);
    } catch (error) {
      console.error('Error al limpiar mesa:', error);
    }
  }

  async mostrarPrecuenta(idPedido: number | null): Promise<void> {
    if (!idPedido) {
      this.notificationService.error('No se encontró un pedido válido para mostrar la precuenta');
      return;
    }
    
    try {
      const pedido = await this.dexieService.getPedidoPorId(idPedido);
      if (pedido) {
        const precuentaContent = `
          <h3>Precuenta - Mesa ${pedido.mesa}</h3>
          <div style="margin: 15px 0;">
            <strong>Detalles del pedido:</strong><br>
            ${pedido.detalles || 'Sin detalles específicos'}
          </div>
          <div style="margin: 15px 0;">
            <strong>Monto total:</strong> S/ ${pedido.monto.toFixed(2)}<br>
            <strong>Pagado:</strong> S/ ${pedido.pagado.toFixed(2)}<br>
            <strong>Saldo pendiente:</strong> S/ ${(pedido.monto - pedido.pagado).toFixed(2)}
          </div>
          <div style="margin: 15px 0;">
            <strong>Fecha:</strong> ${new Date(pedido.fecha).toLocaleDateString()}<br>
            <strong>Mozo:</strong> ${pedido.mozo || 'No asignado'}
          </div>
        `;
        
        // Mostrar en modal o imprimir
        if (confirm('¿Desea imprimir la precuenta?')) {
          const ventanaImpresion = window.open('', '_blank');
          if (ventanaImpresion) {
            ventanaImpresion.document.write(`
              <html>
                <head><title>Precuenta - Mesa ${pedido.mesa}</title></head>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                  ${precuentaContent}
                </body>
              </html>
            `);
            ventanaImpresion.document.close();
            ventanaImpresion.print();
          }
        } else {
          this.notificationService.info(precuentaContent.replace(/<[^>]*>/g, '\n'));
        }
      } else {
        this.notificationService.error('Pedido no encontrado');
      }
    } catch (error) {
      console.error('Error al mostrar precuenta:', error);
      this.notificationService.error('Error al generar la precuenta');
    }
  }

  async editarPedidoModal(idPedido: number | null, num: string): Promise<void> {
    console.log('editarPedidoModal llamado con:', { idPedido, num });
    console.log('modalIdPedido actual:', this.modalIdPedido);
    
    if (!idPedido) {
      console.log('Error: idPedido es null o undefined');
      this.notificationService.error('No se encontró un pedido válido para editar');
      return;
    }
    
    try {
      const pedido = await this.dexieService.getPedidoPorId(idPedido);
      if (pedido) {
        // Configurar modo de edición
        this.editandoPedido = true;
        this.idPedidoEditando = idPedido;
        
        // Siempre mostrar formulario por platos para agregar más productos
        this.mostrarFormularioPorPlato(num);
        
        // Pre-cargar los platos existentes si los hay
        setTimeout(() => {
          try {
            // Si el pedido tiene productos guardados, usarlos directamente
            if (pedido.productos && Array.isArray(pedido.productos)) {
              this.pedidoDetalle = pedido.productos.map((producto: { nombre: string; cantidad: number; precio: number }) => ({
                nombre: producto.nombre,
                cantidad: producto.cantidad,
                precio: producto.precio,
                observacion: ''
              }));
            } else if (pedido.detalles && pedido.detalles.includes('Plato:')) {
              // Fallback: parsear los detalles con el formato actual para pedidos por platos
              const lineas = pedido.detalles.split('\n');
              this.pedidoDetalle = [];
              
              for (const linea of lineas) {
                // Formato: "1. Nombre (cantidadx) - S/ precio = S/ subtotal"
                const match = linea.match(/\d+\. (.+) \((\d+)x\) - S\/ ([\d.]+) = S\/ [\d.]+/);
                if (match) {
                  this.pedidoDetalle.push({
                    nombre: match[1],
                    cantidad: parseInt(match[2]),
                    precio: parseFloat(match[3]),
                    observacion: ''
                  });
                }
              }
            } else {
              // Para pedidos por monto, inicializar vacío para agregar platos
              this.pedidoDetalle = [];
            }
            
            this.calcularTotalPlatos();
          } catch (error) {
            console.error('Error al parsear detalles del pedido:', error);
          }
        }, 100);
        
        this.notificationService.info('Agregando platos al pedido existente');
      } else {
        this.notificationService.error('Pedido no encontrado');
      }
    } catch (error) {
      console.error('Error al editar pedido:', error);
      this.notificationService.error('Error al cargar el pedido para edición');
    }
  }

  nuevoPedidoModal(mesa: number, tipo: string): void {
    // Si la mesa está dividida, mostrar selector de submesa
    if (this.mesasDivididas[mesa]) {
      this.modalType = tipo === 'platos' ? 'selector-submesa-platos' : 'selector-submesa-monto';
      this.modalMesa = mesa;
      this.showMesaModal = true;
      return;
    }
    
    this.closeMesaModal();
    
    const mesaStr = mesa.toString();
    
    if (tipo === 'platos') {
      this.mostrarFormularioPorPlato(mesaStr);
    } else if (tipo === 'monto') {
      this.mostrarFormularioPorMonto(mesaStr);
    }
  }

  async agregarPlato(): Promise<void> {
    const nombre = this.productoInput.trim();
    const cantidad = this.cantidadInput || 1;
    
    if (!nombre) {
      this.notificationService.error('Debe ingresar el nombre del producto');
      return;
    }
    
    if (cantidad <= 0) {
      this.notificationService.error('La cantidad debe ser mayor a 0');
      return;
    }
    
    try {
      // Obtener productos actualizados del catálogo
      const productos = await this.catalogoService.getProductos();
      
      // Buscar el producto en el catálogo (búsqueda exacta o similar)
      let producto = productos.find(p => 
        p.nombre.toLowerCase() === nombre.toLowerCase() && p.disponible
      );
      
      // Si no se encuentra exacto, buscar coincidencia parcial
      if (!producto) {
        producto = productos.find(p => 
          p.nombre.toLowerCase().includes(nombre.toLowerCase()) && p.disponible
        );
      }
      
      // Si aún no se encuentra, usar el producto seleccionado del autocompletado
      if (!producto && this.productoSeleccionado) {
        producto = this.productoSeleccionado;
      }
      
      if (!producto) {
        this.notificationService.error('Producto no encontrado en el catálogo o no disponible');
        return;
      }
      
      if (!producto.disponible) {
        this.notificationService.error('El producto no está disponible');
        return;
      }
      
      // Verificar si el producto ya está en el pedido
      const existente = this.pedidoDetalle.find(p => p.id === producto.id);
      
      if (existente) {
        existente.cantidad += cantidad;
        this.notificationService.info(`Cantidad actualizada: ${existente.nombre} (${existente.cantidad})`);
      } else {
        this.pedidoDetalle.push({
          ...producto,
          cantidad: cantidad
        });
        this.notificationService.success(`Producto agregado: ${producto.nombre} (${cantidad})`);
      }
      
      // Limpiar inputs
      this.productoInput = '';
      this.cantidadInput = 1;
      this.productoSeleccionado = null;
      this.ocultarSugerenciasProductos();
      
      // Recalcular total
      this.calcularTotalPlatos();
      
      // Enfocar nuevamente el campo de producto para agregar más
      setTimeout(() => {
        const productoInput = document.getElementById('productoInput') as HTMLInputElement;
        if (productoInput) {
          productoInput.focus();
        }
      }, 100);
      
    } catch (error) {
      console.error('Error al agregar producto:', error);
      this.notificationService.error('Error al agregar el producto');
    }
  }

  agregarPlatoModerno(): void {
    const buscarInput = document.getElementById('buscarProducto') as HTMLInputElement;
    const cantidadInput = document.getElementById('cantidadProducto') as HTMLInputElement;
    const platosDiv = document.getElementById('platosSeleccionados');
    
    if (!buscarInput || !cantidadInput || !platosDiv) return;
    
    const nombreProducto = buscarInput.value.trim();
    const cantidad = parseInt(cantidadInput.value) || 1;
    
    if (!nombreProducto) {
      this.notificationService.error('Por favor ingrese el nombre del producto');
      return;
    }
    
    // Buscar el producto en el catálogo para obtener el precio
    this.catalogoService.getProductos().then(productos => {
      const producto = productos.find(p => 
        p.nombre.toLowerCase().includes(nombreProducto.toLowerCase()) && p.disponible
      );
      
      const precio = producto ? producto.precio : 0;
      const subtotal = precio * cantidad;
      
      const fila = document.createElement('tr');
      fila.dataset['producto'] = nombreProducto;
      fila.dataset['precio'] = producto['precio']?.toString() || '0';
      fila.dataset['cantidad'] = cantidad.toString();
      
      fila.innerHTML = `
        <td style="padding: 8px; border: 1px solid #ddd;">${nombreProducto}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${cantidad}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">S/ ${precio.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">S/ ${subtotal.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
          <button type="button" class="btn-eliminar-producto" 
                  style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">×</button>
        </td>
      `;
      
      // Agregar evento para eliminar
      const btnEliminar = fila.querySelector('.btn-eliminar-producto');
      if (btnEliminar) {
        btnEliminar.addEventListener('click', this.eliminarProductoEvent);
      }
      
      platosDiv.appendChild(fila);
      
      // Limpiar campos
      buscarInput.value = '';
      cantidadInput.value = '1';
      
      // Recalcular total
      this.calcularTotalPlatosModerno();
      
      if (!producto) {
        this.notificationService.warning(`Producto "${nombreProducto}" no encontrado en catálogo. Precio establecido en S/ 0.00`);
      }
    });
  }

  configurarBusquedaProductos(input: HTMLInputElement): void {
    let timeoutId: any;
    
    input.addEventListener('input', () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const query = input.value.toLowerCase().trim();
        
        if (query.length >= 2) {
          this.catalogoService.getProductos().then(productos => {
            const productosCoincidentes = productos
              .filter(p => p.nombre.toLowerCase().includes(query) && p.disponible)
              .slice(0, 5);
            
            this.mostrarSugerenciasProductos(productosCoincidentes, input);
          });
        } else {
          this.ocultarSugerenciasProductos();
        }
      }, 300);
    });
    
    // Ocultar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target as Node)) {
        this.ocultarSugerenciasProductos();
      }
    });
  }

  mostrarSugerenciasProductos(productos: any[], input: HTMLInputElement): void {
    this.ocultarSugerenciasProductos();
    
    if (productos.length === 0) return;
    
    const sugerenciasDiv = document.createElement('div');
    sugerenciasDiv.id = 'sugerenciasProductos';
    sugerenciasDiv.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    `;
    
    productos.forEach(producto => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
      `;
      
      item.innerHTML = `
        <span>${producto.nombre}</span>
        <span style="color: #28a745; font-weight: 500;">S/ ${producto.precio.toFixed(2)}</span>
      `;
      
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f8f9fa';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });
      
      item.addEventListener('click', () => {
        input.value = producto.nombre;
        this.ocultarSugerenciasProductos();
      });
      
      sugerenciasDiv.appendChild(item);
    });
    
    // Posicionar relativo al input
    const inputParent = input.parentElement;
    if (inputParent) {
      inputParent.style.position = 'relative';
      inputParent.appendChild(sugerenciasDiv);
    }
  }

  ocultarSugerenciasProductos(): void {
    const sugerencias = document.getElementById('sugerenciasProductos');
    if (sugerencias) {
      sugerencias.remove();
    }
    this.showSugerencias = false;
    this.selectedSuggestionIndex = -1;
    this.sugerenciasProductos = [];
  }

  buscarProductos(query: string): void {
    // Usar el nuevo método mejorado
    this.buscarProductosEnCatalogo(query);
  }

  seleccionarProducto(producto: any): void {
    this.productoSeleccionado = producto;
    this.productoInput = producto.nombre;
    this.showSugerencias = false;
    this.sugerenciasProductos = [];
    
    // Enfocar el campo de cantidad después de seleccionar un producto
    setTimeout(() => {
      const cantidadInput = document.getElementById('cantidadInput') as HTMLInputElement;
      if (cantidadInput) {
        cantidadInput.focus();
        cantidadInput.select();
      }
    }, 100);
  }

  onProductoInputChange(value: string): void {
    this.productoInput = value;
    this.selectedSuggestionIndex = -1; // Resetear selección
    this.buscarProductos(value);
  }
  
  // Configurar eventos de teclado para navegación en autocompletado
  configurarEventosTeclado(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.showSugerencias || this.sugerenciasProductos.length === 0) return;
      
      const activeElement = document.activeElement;
      const isProductInput = activeElement && activeElement.id === 'productoInput';
      
      if (!isProductInput) return;
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.selectedSuggestionIndex = Math.min(
            this.selectedSuggestionIndex + 1,
            this.sugerenciasProductos.length - 1
          );
          this.actualizarSeleccionVisual();
          break;
          
        case 'ArrowUp':
          event.preventDefault();
          this.selectedSuggestionIndex = Math.max(
            this.selectedSuggestionIndex - 1,
            -1
          );
          this.actualizarSeleccionVisual();
          break;
          
        case 'Enter':
          event.preventDefault();
          if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < this.sugerenciasProductos.length) {
            this.seleccionarProducto(this.sugerenciasProductos[this.selectedSuggestionIndex]);
          } else if (this.sugerenciasProductos.length === 1) {
            // Si solo hay una sugerencia, seleccionarla
            this.seleccionarProducto(this.sugerenciasProductos[0]);
          } else {
            // Si no hay selección específica, intentar agregar el producto
            this.agregarPlato();
          }
          break;
          
        case 'Escape':
          this.ocultarSugerenciasProductos();
          break;
      }
    });
  }
  
  // Actualizar la selección visual en las sugerencias
  actualizarSeleccionVisual(): void {
    setTimeout(() => {
      const sugerencias = document.querySelectorAll('.producto-sugerencia');
      sugerencias.forEach((sugerencia, index) => {
        if (index === this.selectedSuggestionIndex) {
          sugerencia.classList.add('selected');
          sugerencia.scrollIntoView({ block: 'nearest' });
        } else {
          sugerencia.classList.remove('selected');
        }
      });
    }, 10);
  }

  // Método mejorado para buscar productos con filtrado más preciso
  async buscarProductosEnCatalogo(query: string): Promise<void> {
    if (query.length < 1) {
      this.sugerenciasProductos = [];
      this.showSugerencias = false;
      return;
    }

    try {
      // Obtener productos del catálogo
      const productos = await this.catalogoService.getProductos();
      
      // Filtrar productos disponibles que coincidan con la búsqueda
      this.sugerenciasProductos = productos
        .filter(p => {
          if (!p.disponible) return false;
          
          const nombreLower = p.nombre.toLowerCase();
          const queryLower = query.toLowerCase();
          
          // Buscar coincidencias al inicio del nombre (prioridad alta)
          if (nombreLower.startsWith(queryLower)) return true;
          
          // Buscar coincidencias en cualquier parte del nombre
          if (nombreLower.includes(queryLower)) return true;
          
          // Buscar por palabras individuales
          const palabrasQuery = queryLower.split(' ');
          const palabrasNombre = nombreLower.split(' ');
          
          return palabrasQuery.every(palabra => 
            palabrasNombre.some((nombrePalabra: string) => nombrePalabra.includes(palabra))
          );
        })
        .sort((a, b) => {
          // Ordenar por relevancia: primero los que empiezan con la query
          const aStartsWith = a.nombre.toLowerCase().startsWith(query.toLowerCase());
          const bStartsWith = b.nombre.toLowerCase().startsWith(query.toLowerCase());
          
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          
          // Luego ordenar alfabéticamente
          return a.nombre.localeCompare(b.nombre);
        })
        .slice(0, 8); // Mostrar máximo 8 sugerencias
      
      this.showSugerencias = this.sugerenciasProductos.length > 0;
    } catch (error) {
      console.error('Error al buscar productos:', error);
      this.sugerenciasProductos = [];
      this.showSugerencias = false;
    }
  }

  eliminarProductoPedido(index: number): void {
    this.pedidoDetalle.splice(index, 1);
    this.calcularTotalPlatos();
  }
  
  // Método para cambiar categoría seleccionada
  cambiarCategoriaFiltro(categoria: string): void {
    this.categoriaSeleccionada = categoria;
    this.filtrarProductosPorCategoria();
  }
  
  // Método para filtrar productos por categoría
  async filtrarProductosPorCategoria(): Promise<void> {
    try {
      if (this.categoriaSeleccionada === 'todos') {
        this.productosFiltrados = await this.catalogoService.getProductos();
      } else {
        this.productosFiltrados = await this.catalogoService.getProductosPorCategoria(this.categoriaSeleccionada);
      }
      // Filtrar solo productos disponibles
      this.productosFiltrados = this.productosFiltrados.filter(p => p.disponible);
    } catch (error) {
      console.error('Error al filtrar productos:', error);
      this.productosFiltrados = [];
    }
  }
  
  // Método para editar cantidad directamente
  editarCantidad(index: number, nuevaCantidad: number): void {
    if (nuevaCantidad > 0) {
      this.pedidoDetalle[index].cantidad = nuevaCantidad;
      this.calcularTotalPlatos();
    }
  }
  
  // Método para aumentar cantidad
  aumentarCantidad(index: number): void {
    this.pedidoDetalle[index].cantidad += 1;
    this.calcularTotalPlatos();
  }
  
  // Método para disminuir cantidad
  disminuirCantidad(index: number): void {
    if (this.pedidoDetalle[index].cantidad > 1) {
      this.pedidoDetalle[index].cantidad -= 1;
      this.calcularTotalPlatos();
    }
  }
  
  // Método para agregar producto desde filtros
  agregarProductoDesdeCategoria(producto: any): void {
    // Verificar si el producto ya está en el pedido
    const existente = this.pedidoDetalle.find(p => p.id === producto.id);
    
    if (existente) {
      existente.cantidad += 1;
      this.notificationService.info(`Cantidad actualizada: ${existente.nombre} (${existente.cantidad})`);
    } else {
      this.pedidoDetalle.push({
        ...producto,
        cantidad: 1
      });
      this.notificationService.success(`Producto agregado: ${producto.nombre}`);
    }
    
    this.calcularTotalPlatos();
  }

  calcularTotalPlatosModerno(): void {
    const platosDiv = document.getElementById('platosSeleccionados');
    const totalSpan = document.getElementById('totalPedido');
    
    if (!platosDiv || !totalSpan) return;
    
    let total = 0;
    const filas = platosDiv.querySelectorAll('tr');
    
    filas.forEach((fila: any) => {
      const precio = parseFloat(fila.dataset.precio) || 0;
      const cantidad = parseInt(fila.dataset.cantidad) || 0;
      total += precio * cantidad;
    });
    
    totalSpan.textContent = total.toFixed(2);
  }

  eliminarProductoEvent = (event: Event) => {
    const button = event.target as HTMLButtonElement;
    const fila = button.closest('tr');
    if (fila) {
      fila.remove();
      this.calcularTotalPlatosModerno();
    }
  }

  calcularTotalPlatos(): void {
    this.totalPedido = this.pedidoDetalle.reduce((total, item) => {
      return total + (item.precio * item.cantidad);
    }, 0);
    
    // También actualizar el DOM si existe
    const totalSpan = document.getElementById('totalPedido');
    if (totalSpan) {
      totalSpan.textContent = this.totalPedido.toFixed(2);
    }
  }

  async registrarPedidoPorPlatos(num: string): Promise<void> {
    // Validar que hay productos en el pedido
    if (this.pedidoDetalle.length === 0) {
      this.notificationService.error('Debe agregar al menos un producto');
      return;
    }
    
    let detalles = '';
    let total = 0;
    const productos: any[] = [];
    
    // Procesar productos del pedido usando las variables de Angular
    this.pedidoDetalle.forEach((item, index) => {
      const subtotal = item.precio * item.cantidad;
      
      detalles += `${index + 1}. ${item.nombre} (${item.cantidad}x) - S/ ${item.precio.toFixed(2)} = S/ ${subtotal.toFixed(2)}\n`;
      total += subtotal;
      
      productos.push({
        id: item.id || `temp_${index}`,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
        categoria: item.categoria || 'General',
        listo: false
      });
    });
    
    // Agregar observación si existe
    const observacion = this.observacionInput?.trim();
    if (observacion) {
      detalles += `\nObservación: ${observacion}`;
    }
    
    try {
      const fecha = new Date();
      
      if (this.editandoPedido && this.idPedidoEditando) {
        // Modo edición: actualizar pedido existente
        const pedidoExistente = await this.dexieService.getPedidoPorId(this.idPedidoEditando);
        if (pedidoExistente) {
          const pedidoActualizado = {
            ...pedidoExistente,
            monto: total,
            detalles: detalles,
            productos: productos,
            observacion: observacion || '',
            modificado_por: this.usuarioActual?.nombre || 'Sistema',
            fecha_modificacion: fecha.toISOString()
          };
          
          await this.dexieService.actualizarPedido(this.idPedidoEditando, pedidoActualizado);
          
          this.notificationService.success(`Pedido actualizado para mesa ${num} - Total: S/ ${total.toFixed(2)}`);
        }
        
        // Resetear modo edición
        this.editandoPedido = false;
        this.idPedidoEditando = null;
      } else {
        // Modo normal: crear nuevo pedido
        const pedido = {
          mesa: num,
          monto: total,
          pagado: 0,
          estado: 'pendiente',
          fecha: fecha.toISOString().split('T')[0],
          hora: fecha.toLocaleTimeString(),
          detalles: detalles,
          mozo: this.usuarioActual?.nombre || 'Sistema',
          tipo: 'mesa',
          productos: productos,
          observacion: observacion || '',
          timestamp: fecha.toISOString(),
          creado_por: this.usuarioActual?.nombre || 'Sistema',
          tipo_pedido: 'mesa',
          abonos: [],
          enviado_cocina: false
        };

        const idPedido = await this.dexieService.agregarPedido(pedido);
        
        // Enviar notificación via socket si está disponible
        if (this.socketService.isConnected()) {
          this.socketService.emit('nuevoPedido', {
            mesa: num,
            tipo_pedido: 'mesa',
            id: idPedido,
            productos: productos
          });
        }
        
        this.notificationService.success(`Pedido registrado para mesa ${num} - Total: S/ ${total.toFixed(2)}`);
      }
      
      this.closeMesaModal();
      await this.renderMesas();
      await this.calcularTotales();
    } catch (error) {
      console.error('Error al registrar/actualizar pedido:', error);
      this.notificationService.error('Error al procesar el pedido');
    }
  }

  async registrarPedidoPorMonto(num: string): Promise<void> {
    // Usar las variables de Angular en lugar de manipulación del DOM
    const monto = this.montoDirecto;
    const observacion = this.observacionInput || '';

    if (!monto || monto <= 0) {
      this.notificationService.error('Debe ingresar un monto válido');
      return;
    }

    try {
      const fecha = new Date();
      
      // Verificar si estamos editando un pedido existente
      if (this.editandoPedido && this.idPedidoEditando) {
        // Actualizar pedido existente
        const pedidoActualizado = {
          monto: monto,
          detalles: `Pedido por monto directo: S/ ${monto.toFixed(2)}${observacion ? '\nObservación: ' + observacion : ''}`,
          productos: [{
            id: 'monto_directo',
            nombre: 'Pedido por monto',
            precio: monto,
            cantidad: 1,
            categoria: 'General',
            listo: true
          }],
          observacion: observacion,
          modificado_por: this.usuarioActual?.nombre || 'Sistema',
          fecha_modificacion: fecha.toISOString()
        };

        await this.dexieService.actualizarPedido(this.idPedidoEditando, pedidoActualizado);
        this.notificationService.success(`Pedido actualizado para mesa ${num} - Total: S/ ${monto.toFixed(2)}`);
        
        // Resetear modo de edición
        this.editandoPedido = false;
        this.idPedidoEditando = null;
      } else {
        // Crear nuevo pedido
        const pedido = {
          mesa: num,
          monto: monto,
          pagado: 0,
          estado: 'pendiente',
          fecha: fecha.toISOString().split('T')[0],
          hora: fecha.toLocaleTimeString(),
          detalles: `Pedido por monto directo: S/ ${monto.toFixed(2)}${observacion ? '\nObservación: ' + observacion : ''}`,
          mozo: this.usuarioActual?.nombre || 'Sistema',
          tipo: 'mesa',
          productos: [{
            id: 'monto_directo',
            nombre: 'Pedido por monto',
            precio: monto,
            cantidad: 1,
            categoria: 'General',
            listo: true
          }],
          observacion: observacion,
          timestamp: fecha.toISOString(),
          creado_por: this.usuarioActual?.nombre || 'Sistema',
          tipo_pedido: 'mesa',
          abonos: [],
          enviado_cocina: false
        };

        const idPedido = await this.dexieService.agregarPedido(pedido);
        
        // Enviar notificación via socket si está disponible
        if (this.socketService.isConnected()) {
          this.socketService.emit('nuevoPedido', {
            mesa: num,
            tipo_pedido: 'mesa',
            id: idPedido,
            monto: monto
          });
        }
        
        this.notificationService.success(`Pedido registrado para mesa ${num} - Total: S/ ${monto.toFixed(2)}`);
      }
      
      this.closeMesaModal();
      await this.renderMesas();
      await this.calcularTotales();
    } catch (error) {
      console.error('Error al registrar/actualizar pedido:', error);
      this.notificationService.error('Error al procesar el pedido');
    }
  }

  // Funcionalidades para pedidos especiales
  crearPedidoParaLlevar(): void {
    this.modalType = 'para-llevar';
    this.showMesaModal = true;
  }

  crearPedidoDelivery(): void {
    this.modalType = 'delivery';
    this.showMesaModal = true;
  }
  
  establecerCajaApertura(monto: number): void {
    if (monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }
    
    const fechaHoy = new Date().toISOString().split('T')[0];
    const cajaInicial = {
      fecha: fechaHoy,
      montoInicial: monto,
      efectivo: 0,
      yape: 0,
      tarjeta: 0,
      total: 0,
      ganancia: 0
    };
    
    this.dexieService.iniciarCaja(cajaInicial).then(() => {
      this.cajaApertura = monto;
      this.calcularTotales();
      this.notificationService.success('Caja inicial establecida correctamente');
    });
  }
  
  configurarEventosSocket(): void {
    if (this.authService.isCaja()) {
      this.socketService.listen('nuevoPedido').subscribe((pedido) => {
        if (pedido.tipo === 'llevar' || pedido.tipo === 'delivery') {
          this.notificationService.success(
            `Nuevo pedido ${pedido.tipo} recibido - Cliente: ${pedido.cliente}`
          );
        } else {
          this.notificationService.success(
            `Nuevo pedido recibido - Mesa ${pedido.mesa} - ${pedido.items.length} items`
          );
        }
        this.sincronizarDatos();
      });
      
      this.socketService.listen('nuevoPedidoEspecial').subscribe((pedido) => {
        this.notificationService.success(
          `Nuevo pedido ${pedido.tipo} recibido - Cliente: ${pedido.cliente}`
        );
        this.sincronizarDatos();
      });
      
      this.socketService.listen('pagoRealizado').subscribe((pago) => {
        if (pago.tipo === 'especial') {
          this.notificationService.success(
            `Pago recibido - Cliente: ${pago.cliente} - Monto: S/${pago.monto}`
          );
        } else {
          this.notificationService.success(
            `Pago recibido - Mesa ${pago.mesa} - Monto: S/${pago.monto}`
          );
        }
        this.sincronizarDatos();
      });
      
      this.socketService.listen('pedidoEspecialAnulado').subscribe((pedido) => {
        this.notificationService.info(
          `Pedido anulado - Cliente: ${pedido.cliente}`
        );
        this.sincronizarDatos();
      });
    }
    
    if (this.authService.isMoso()) {
      this.socketService.listen('respuestaCaja').subscribe((respuesta) => {
        this.notificationService.info(
          `Respuesta de caja: ${respuesta.mensaje}`
        );
        this.sincronizarDatos();
      });
    }
    
    if (this.authService.isCocina()) {
      this.socketService.listen('pedidoRecibido').subscribe((pedido) => {
        this.notificationService.info(
          `Nuevo pedido para cocina - Mesa ${pedido.mesa} - ${pedido.items.length} items`
        );
        this.sincronizarDatos();
      });
    }
  }
  
  exportarBD(): void {
    this.dexieService.exportarDB().then((data: any) => {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `festejos_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  
  importarBD(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse((e.target?.result || '') as string);
        this.dexieService.importarDB(data).then(() => {
          this.notificationService.success('Base de datos importada correctamente');
          this.cargarDatos();
        });
      } catch (error) {
        alert('Error al importar la base de datos');
        console.error(error);
      }
    };
    reader.readAsText(file);
  }
  
  limpiarBD(): void {
    if (confirm('¿Está seguro de limpiar la base de datos? Esta acción no se puede deshacer.')) {
      this.dexieService.limpiarDB().then(() => {
        this.notificationService.success('Base de datos limpiada correctamente');
        this.cargarDatos();
      });
    }
  }

  async registrarPedidoParaLlevar(): Promise<void> {
    if (!this.nombreClienteEspecial || !this.montoEspecial) {
      this.notificationService.error('Debe completar todos los campos obligatorios');
      return;
    }

    if (this.montoEspecial <= 0) {
      this.notificationService.error('Debe ingresar un monto válido');
      return;
    }

    try {
      const pedido = {
        cliente: this.nombreClienteEspecial,
        monto: this.montoEspecial,
        pagado: 0,
        estado: 'pendiente',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString(),
        observacion: this.observacionEspecial || '',
        tipo: 'llevar'
      };

      await this.dexieService.agregarPedidoEspecial(pedido);
      this.notificationService.success('Pedido para llevar registrado correctamente');
      this.closeMesaModal();
      this.limpiarFormularioEspecial();
      await this.cargarPedidosParaLlevar();
      await this.calcularTotales();
    } catch (error) {
      console.error('Error al registrar pedido para llevar:', error);
      this.notificationService.error('Error al registrar el pedido');
    }
  }

  async registrarPedidoDelivery(): Promise<void> {
    if (!this.nombreClienteEspecial) {
      this.notificationService.error('Debe ingresar el nombre del cliente');
      return;
    }

    try {
      const pedido = {
        cliente: this.nombreClienteEspecial,
        direccion: this.direccionEspecial,
        telefono: this.telefonoEspecial || '',
        monto: this.montoEspecial,
        pagado: 0,
        estado: 'pendiente',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString(),
        observacion: this.observacionEspecial || '',
        tipo: 'delivery'
      };

      await this.dexieService.agregarPedidoEspecial(pedido);
      this.notificationService.success('Pedido delivery registrado correctamente');
      this.closeMesaModal();
      this.limpiarFormularioEspecial();
      await this.cargarPedidosDelivery();
      await this.calcularTotales();
    } catch (error) {
      console.error('Error al registrar pedido delivery:', error);
      this.notificationService.error('Error al registrar el pedido');
    }
  }

  // Variables para pedidos especiales
  nombreClienteEspecial: string = '';
  direccionEspecial: string = '';
  telefonoEspecial: string = '';
  montoEspecial: number = 0;
  observacionEspecial: string = '';
  
  // Variables para pago de pedidos especiales
  pedidoEspecialSeleccionado: any = null;
  montoAbonoPedidoEspecial: number = 0;

  limpiarFormularioEspecial(): void {
    this.nombreClienteEspecial = '';
    this.direccionEspecial = '';
    this.telefonoEspecial = '';
    this.montoEspecial = 0;
    this.observacionEspecial = '';
  }
  
  async procesarPagoPedidoEspecial(): Promise<void> {
    if (!this.pedidoEspecialSeleccionado || !this.selectedPaymentMethod || this.montoAbonoPedidoEspecial <= 0) {
      this.notificationService.error('Debe completar todos los campos');
      return;
    }
    
    const saldoPendiente = this.pedidoEspecialSeleccionado.monto - (this.pedidoEspecialSeleccionado.pagado || 0);
    
    if (this.montoAbonoPedidoEspecial > saldoPendiente) {
      this.notificationService.error('El monto no puede ser mayor al saldo pendiente');
      return;
    }
    
    try {
      await this.dexieService.abonarPedidoEspecial(
        this.pedidoEspecialSeleccionado.id, 
        this.montoAbonoPedidoEspecial, 
        this.selectedPaymentMethod
      );
      
      // Emitir evento Socket.IO para sincronización
      this.socketService.emit('pagoRealizado', {
        tipo: 'especial',
        id: this.pedidoEspecialSeleccionado.id,
        cliente: this.pedidoEspecialSeleccionado.cliente,
        monto: this.montoAbonoPedidoEspecial,
        metodoPago: this.selectedPaymentMethod,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString(),
        usuario: this.usuarioActual?.nombre || 'Usuario'
      });
      
      this.notificationService.success('Pago registrado correctamente');
      this.closeMesaModal();
      
      // Actualizar las listas
      await this.cargarPedidosParaLlevar();
      await this.cargarPedidosDelivery();
      await this.calcularTotales();
      await this.cargarHistorialPagados();
      
    } catch (error) {
      console.error('Error al procesar pago:', error);
      this.notificationService.error('Error al procesar el pago');
    }
  }

  async anularPedidoEspecial(pedido: any): Promise<void> {
     if (!pedido || !pedido.id) {
       this.notificationService.error('Pedido no válido');
       return;
     }
 
     try {
       await this.dexieService.anularPedidoEspecial(pedido.id);
       
       // Emitir evento Socket.IO para sincronización
       this.socketService.emit('pedidoEspecialAnulado', {
         id: pedido.id,
         tipo: pedido.tipo,
         cliente: pedido.cliente,
         monto: pedido.monto,
         fecha: new Date().toISOString().split('T')[0],
         hora: new Date().toLocaleTimeString(),
         usuario: this.usuarioActual?.nombre || 'Usuario'
       });
       
       this.notificationService.success('Pedido anulado correctamente');
       
       // Actualizar las listas
       await this.cargarPedidosParaLlevar();
       await this.cargarPedidosDelivery();
       await this.calcularTotales();
       
     } catch (error) {
       console.error('Error al anular pedido:', error);
       this.notificationService.error('Error al anular el pedido');
     }
   }

   async sincronizarDatos(): Promise<void> {
     try {
       await this.cargarDatos();
       await this.cargarPedidosParaLlevar();
       await this.cargarPedidosDelivery();
       await this.cargarHistorialPagados();
       await this.calcularTotales();
       await this.renderMesas();
       this.cdr.detectChanges();
     } catch (error) {
       console.error('Error al sincronizar datos:', error);
     }
   }

  async generarReporte(): Promise<void> {
    if (!this.fechaInicioReporte || !this.fechaFinReporte) {
      this.notificationService.error('Por favor selecciona ambas fechas');
      return;
    }

    try {
      // Obtener todos los pagos del historial
      const todosLosPagos = await this.dexieService.getHistorialPagos();
      
      // Filtrar pagos por rango de fechas
      const fechaInicio = new Date(this.fechaInicioReporte);
      const fechaFin = new Date(this.fechaFinReporte);
      fechaFin.setHours(23, 59, 59, 999); // Incluir todo el día final
      
      const pagosFiltrados = todosLosPagos.filter(pago => {
        const fechaPago = new Date(pago.fecha);
        return fechaPago >= fechaInicio && fechaPago <= fechaFin;
      });

      // Calcular totales por método de pago
      this.efectivoReporte = 0;
      this.yapeReporte = 0;
      this.tarjetaReporte = 0;
      this.totalReporte = 0;

      pagosFiltrados.forEach(pago => {
        const monto = pago.total || 0;
        this.totalReporte += monto;
        
        switch (pago.metodoPago?.toLowerCase()) {
          case 'efectivo':
            this.efectivoReporte += monto;
            break;
          case 'yape':
            this.yapeReporte += monto;
            break;
          case 'tarjeta':
            this.tarjetaReporte += monto;
            break;
        }
      });

      // Calcular ganancia (asumiendo que es el total menos gastos/costos)
      this.gananciaReporte = this.totalReporte;
      
      // Guardar detalles para la tabla
      this.detallesReporte = pagosFiltrados.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      
      // Mostrar el resumen
      this.mostrarResumenReporte = true;
      
      this.notificationService.success(`Reporte generado: ${pagosFiltrados.length} pagos encontrados`);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      this.notificationService.error('Error al generar el reporte');
    }
  }

  generarGraficaPlatos(): void {
    if (!this.mostrarResumenReporte) {
      this.notificationService.error('Primero genera un reporte');
      return;
    }
    
    // Aquí se puede implementar la lógica para generar gráficas
    this.notificationService.info('Funcionalidad de gráficas en desarrollo');
  }


}