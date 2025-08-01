import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { CatalogoService } from '../../services/catalogo.service';
import { DexieService } from '../../services/dexie.service';

@Component({
  selector: 'app-home',
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
  
  pedidosParaLlevar: any[] = [];
  pedidosDelivery: any[] = [];
  historialPagados: any[] = [];
  
  showLoginModal: boolean = true;
  usuario: string = 'cajero';
  nombreMozo: string = '';
  clave: string = '';
  
  constructor(
    public dexieService: DexieService,
    public socketService: SocketService,
    public authService: AuthService,
    public notificationService: NotificationService,
    public catalogoService: CatalogoService
  ) { }
  
  ngOnInit(): void {
    this.actualizarFecha();
    setInterval(() => this.actualizarFecha(), 60000); // Actualizar cada minuto
    
    // Verificar si el usuario ya está logueado
    if (this.authService.isAuthenticated()) {
      this.showLoginModal = false;
      this.inicializarAplicacion();
    }
    
    // Inicializar el menú lateral
    this.inicializarMenuLateral();
    
    // Inicializar el modo oscuro
    this.inicializarModoOscuro();
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
  
  inicializarModoOscuro(): void {
    const toggleDarkMode = document.getElementById('toggleDarkMode');
    
    if (toggleDarkMode) {
      // Verificar preferencia guardada
      const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
      if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
        toggleDarkMode.textContent = '☀️';
      }
      
      toggleDarkMode.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode.toString());
        toggleDarkMode.textContent = isDarkMode ? '☀️' : '🌙';
      });
    }
  }
  
  login(): void {
    if (this.authService.login(this.usuario, this.clave)) {
      this.showLoginModal = false;
      this.inicializarAplicacion();
    } else {
      alert('Clave incorrecta');
    }
  }
  
  logout(): void {
    this.authService.logout();
    this.showLoginModal = true;
  }
  
  inicializarAplicacion(): void {
    // Cargar datos iniciales directamente ya que Dexie se inicializa automáticamente
    this.cargarDatos();
    
    // Conectar socket si es necesario
    if (this.authService.isCajero() || this.authService.isMozo() || this.authService.isCocina()) {
      this.socketService.connect(this.authService.currentUserValue);
      this.configurarEventosSocket();
    }
    
    // No es necesario solicitar permisos de notificación ya que el servicio no tiene este método
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
    this.dexieService.getHistorialPagos().then((historial: any[]) => {
      this.historialPagados = historial;
    });
  }
  
  calcularTotales(): void {
    // Obtener historial de pagos del día actual
    const fechaHoy = new Date().toISOString().split('T')[0];
    this.dexieService.getHistorialPagosPorFecha(fechaHoy, fechaHoy).then((pagos: any[]) => {
      // Inicializar totales
      let efectivo = 0;
      let yape = 0;
      let tarjeta = 0;
      
      // Calcular totales por método de pago
      pagos.forEach(pago => {
        if (pago.metodoPago === 'efectivo') {
          efectivo += pago.total || 0;
        } else if (pago.metodoPago === 'yape') {
          yape += pago.total || 0;
        } else if (pago.metodoPago === 'tarjeta') {
          tarjeta += pago.total || 0;
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
    if (this.authService.isCajero()) {
      this.socketService.listen('nuevoPedido').subscribe((pedido) => {
        this.notificationService.success(
          `Nuevo pedido recibido - Mesa ${pedido.mesa} - ${pedido.items.length} items`
        );
        // Actualizar UI según sea necesario
      });
    }
    
    if (this.authService.isMozo()) {
      this.socketService.listen('respuestaCaja').subscribe((respuesta) => {
        this.notificationService.info(
          `Respuesta de caja: ${respuesta.mensaje}`
        );
        // Actualizar UI según sea necesario
      });
    }
    
    if (this.authService.isCocina()) {
      this.socketService.listen('pedidoRecibido').subscribe((pedido) => {
        this.notificationService.info(
          `Nuevo pedido para cocina - Mesa ${pedido.mesa} - ${pedido.items.length} items`
        );
        // Actualizar UI según sea necesario
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
}