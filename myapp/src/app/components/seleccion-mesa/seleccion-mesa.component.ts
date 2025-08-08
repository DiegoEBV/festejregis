import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SocketService, MesaEstado } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { CommonModule, TitleCasePipe } from '@angular/common';

interface DispositivoInfo {
  id: string;
  tipo: 'tablet' | 'movil';
  ubicacion: string;
  usuario?: string;
}

@Component({
  selector: 'app-seleccion-mesa',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './seleccion-mesa.component.html',
  styleUrls: ['./seleccion-mesa.component.css']
})
export class SeleccionMesaComponent implements OnInit, OnDestroy {
  mesas: MesaEstado[] = [];
  mesaSeleccionada: number | null = null;
  dispositivoActual: DispositivoInfo | null = null;
  conectado = false;
  cargando = false;
  
  // Filtros
  filtroEstado: 'todas' | 'libres' | 'ocupadas' = 'todas';
  filtroUbicacion: 'todas' | 'Planta Baja' | 'Segundo Piso' = 'todas';
  
  // Estadísticas
  estadisticas = {
    total: 0,
    libres: 0,
    ocupadas: 0,
    reservadas: 0
  };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private socketService: SocketService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.inicializarDispositivo();
    this.setupSubscriptions();
    this.cargarMesas();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private inicializarDispositivo(): void {
    // Generar ID único para el dispositivo
    const dispositivoId = this.generarIdDispositivo();
    
    // Determinar tipo de dispositivo basado en el tamaño de pantalla
    const tipoDispositivo = this.detectarTipoDispositivo();
    
    this.dispositivoActual = {
      id: dispositivoId,
      tipo: tipoDispositivo,
      ubicacion: 'Mesa',
      usuario: this.authService.getUsuarioActual()?.nombre || undefined
    };
  }

  private generarIdDispositivo(): string {
    return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  private detectarTipoDispositivo(): DispositivoInfo['tipo'] {
    const width = window.innerWidth;
    
    if (width >= 1024) {
      return 'tablet'; // Pantallas grandes (tablets, laptops)
    } else if (width >= 768) {
      return 'tablet'; // Tablets
    } else {
      return 'movil'; // Móviles
    }
  }

  private setupSubscriptions(): void {
    // Suscribirse a cambios en mesas
    const mesasSub = this.socketService.mesasEstado$.subscribe(mesas => {
      this.mesas = mesas;
      this.actualizarEstadisticas();
    });
    
    // Suscribirse a estado de conexión
    const conexionSub = this.socketService.connectionStatus$.subscribe(conectado => {
      this.conectado = conectado;
    });
    
    this.subscriptions.push(mesasSub, conexionSub);
  }

  private cargarMesas(): void {
    // Generar mesas por defecto si no hay datos
    if (this.mesas.length === 0) {
      this.generarMesasPorDefecto();
    }
    this.actualizarEstadisticas();
  }

  private generarMesasPorDefecto(): void {
    const mesasDefecto: MesaEstado[] = [];
    for (let i = 1; i <= 20; i++) {
      mesasDefecto.push({
        numero: i,
        ocupada: false,
        pedidoActivo: undefined,
        dispositivos: [],
        capacidad: i <= 10 ? 4 : 6, // Mesas 1-10: 4 personas, 11-20: 6 personas
        ubicacion: i <= 10 ? 'Planta Baja' : 'Segundo Piso',
        estado: 'disponible'
      });
    }
    this.mesas = mesasDefecto;
  }

  private actualizarEstadisticas(): void {
    this.estadisticas = {
      total: this.mesas.length,
      libres: this.mesas.filter(m => !m.ocupada).length,
      ocupadas: this.mesas.filter(m => m.ocupada).length,
      reservadas: 0 // Por ahora no hay mesas reservadas
    };
  }

  // Obtener mesas filtradas
  get mesasFiltradas(): MesaEstado[] {
    let mesasFiltradas = this.mesas;
    
    // Filtrar por estado
    if (this.filtroEstado !== 'todas') {
      mesasFiltradas = mesasFiltradas.filter(mesa => {
        if (this.filtroEstado === 'libres') return !mesa.ocupada;
        if (this.filtroEstado === 'ocupadas') return mesa.ocupada;
        return true;
      });
    }
    
    // Filtrar por ubicación (simulado basado en número de mesa)
    if (this.filtroUbicacion !== 'todas') {
      mesasFiltradas = mesasFiltradas.filter(mesa => {
        const ubicacionMesa = mesa.numero <= 10 ? 'Planta Baja' : 'Segundo Piso';
        return this.filtroUbicacion === ubicacionMesa;
      });
    }
    
    return mesasFiltradas.sort((a, b) => a.numero - b.numero);
  }

  // Seleccionar mesa
  seleccionarMesa(mesa: MesaEstado): void {
    if (this.cargando) return;
    
    this.cargando = true;
    this.mesaSeleccionada = mesa.numero;
    
    // Emitir evento de selección de mesa via Socket
    this.socketService.seleccionarMesa(mesa.numero, this.dispositivoActual?.id || 'unknown');
    
    setTimeout(() => {
      this.cargando = false;
      this.notificationService.mostrarExito(
        `Mesa ${mesa.numero} seleccionada correctamente`
      );
      
      // Navegar a la página de pedidos
      this.router.navigate(['/pedido-mesa', mesa.numero]);
    }, 500);
  }

  // Obtener clase CSS para el estado de la mesa
  getClaseMesa(mesa: MesaEstado): string {
    const clases = ['mesa-card'];
    
    if (mesa.ocupada) {
      clases.push('mesa-ocupada');
    } else {
      clases.push('mesa-libre');
    }
    
    if (this.mesaSeleccionada === mesa.numero) {
      clases.push('mesa-seleccionada');
    }
    
    return clases.join(' ');
  }

  // Obtener icono para el estado de la mesa
  getIconoMesa(mesa: MesaEstado): string {
    return mesa.ocupada ? '🔴' : '🟢';
  }

  // Obtener texto del estado
  getTextoEstado(mesa: MesaEstado): string {
    return mesa.ocupada ? 'Ocupada' : 'Disponible';
  }

  // Verificar si se puede seleccionar la mesa
  puedeSeleccionarMesa(mesa: MesaEstado): boolean {
    return true; // Todas las mesas se pueden seleccionar
  }

  // Obtener información adicional de la mesa
  getInfoAdicional(mesa: MesaEstado): string {
    const info = [];
    
    if (mesa.pedidoActivo) {
      info.push(`Pedido activo`);
    }
    
    if (mesa.dispositivos && mesa.dispositivos.length > 0) {
      info.push(`${mesa.dispositivos.length} dispositivo(s)`);
    }
    
    return info.join(' • ');
  }

  // Cambiar filtro de estado
  cambiarFiltroEstado(estado: 'todas' | 'libres' | 'ocupadas'): void {
    this.filtroEstado = estado;
  }

  // Cambiar filtro de ubicación
  cambiarFiltroUbicacion(ubicacion: 'todas' | 'Planta Baja' | 'Segundo Piso'): void {
    this.filtroUbicacion = ubicacion;
  }



  // Refrescar mesas
  refrescarMesas(): void {
    this.cargarMesas();
    this.notificationService.mostrarInfo('Mesas actualizadas');
  }

  // Ir a vista de administración (solo para administradores)
  irAAdministracion(): void {
    const usuario = this.authService.getUsuarioActual();
    if (usuario && usuario.rol === 'admin') {
      this.router.navigate(['/admin/mesas']);
    }
  }

  // Verificar si es administrador
  esAdministrador(): boolean {
    const usuario = this.authService.getUsuarioActual();
    return usuario?.rol === 'admin';
  }
}