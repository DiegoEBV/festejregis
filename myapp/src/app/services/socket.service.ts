import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

declare const io: any;

export interface PedidoMesa {
  id: string;
  mesa: number | string; // Puede ser número de mesa o string para delivery/llevar
  productos: any[];
  estado: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'pagado';
  total: number;
  timestamp: Date;
  dispositivo: string;
  tipo: 'mesa' | 'delivery' | 'llevar';
  cliente?: {
    nombre?: string;
    telefono?: string;
    direccion?: string;
  };
}

export interface PedidoDelivery {
  id: string;
  cliente: {
    nombre: string;
    telefono: string;
    direccion: string;
  };
  productos: any[];
  estado: 'pendiente' | 'preparando' | 'listo' | 'en_camino' | 'entregado' | 'pagado';
  total: number;
  timestamp: Date;
  dispositivo: string;
  tipo: 'delivery';
  tiempoEstimado?: number;
}

export interface PedidoLlevar {
  id: string;
  cliente: {
    nombre: string;
    telefono?: string;
  };
  productos: any[];
  estado: 'pendiente' | 'preparando' | 'listo' | 'retirado' | 'pagado';
  total: number;
  timestamp: Date;
  dispositivo: string;
  tipo: 'llevar';
  tiempoEstimado?: number;
}

export type PedidoGeneral = PedidoMesa | PedidoDelivery | PedidoLlevar;

export interface MesaEstado {
  numero: number;
  ocupada: boolean;
  dispositivos: string[];
  pedidoActivo?: PedidoMesa | undefined;
  capacidad?: number;
  ubicacion?: string;
  estado?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: any;
  private serverUrl = environment.socketUrl;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  
  // Estados observables para tiempo real
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private mesasEstado = new BehaviorSubject<MesaEstado[]>([]);
  private pedidosActivos = new BehaviorSubject<PedidoMesa[]>([]);
  private pedidosDelivery = new BehaviorSubject<PedidoDelivery[]>([]);
  private pedidosLlevar = new BehaviorSubject<PedidoLlevar[]>([]);
  private todosPedidos = new BehaviorSubject<PedidoGeneral[]>([]);
  
  public connectionStatus$ = this.connectionStatus.asObservable();
  public mesasEstado$ = this.mesasEstado.asObservable();
  public pedidosActivos$ = this.pedidosActivos.asObservable();
  public pedidosDelivery$ = this.pedidosDelivery.asObservable();
  public pedidosLlevar$ = this.pedidosLlevar.asObservable();
  public todosPedidos$ = this.todosPedidos.asObservable();

  constructor() {
    console.log('🔧 Inicializando SocketService con URL:', this.serverUrl);
    this.initializeSocketListeners();
  }

  // Conectar al servidor de Socket.IO
  connect(userData: any): void {
    if (this.socket && this.socket.connected) {
      console.log('✅ Ya existe una conexión activa');
      return;
    }

    console.log('🚀 Intentando conectar a:', this.serverUrl);
    console.log('👤 Datos de usuario:', userData);

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      query: {
        userId: userData.id,
        userName: userData.nombre,
        userRole: userData.rol
      }
    });

    console.log('🔌 Socket creado, esperando conexión...');

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.IO:', this.serverUrl);
      this.reconnectAttempts = 0;
      this.connectionStatus.next(true);
      
      // Identificarse automáticamente
      this.socket.emit('identificarse', userData);
      
      // Configurar listeners específicos para todos los tipos de pedidos
      this.setupAllListeners();
      
      // Solicitar estado inicial de mesas y pedidos
      this.socket.emit('obtener-estado-mesas');
      this.socket.emit('obtener-pedidos-estado', { estado: 'pendiente' });
      this.socket.emit('obtener-pedidos-estado', { estado: 'preparando' });
      this.socket.emit('obtener-pedidos-estado', { estado: 'listo' });
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      console.error('📋 Detalles del error:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      });
      this.connectionStatus.next(false);
       this.handleReconnect(userData);
     });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Desconectado del servidor Socket.IO:', reason);
      this.connectionStatus.next(false);
      if (reason === 'io server disconnect') {
        // Reconectar si el servidor cerró la conexión
        this.handleReconnect(userData);
      }
    });

    this.socket.on('identificado', (data: any) => {
      console.log('✅ Identificado en el servidor:', data);
    });

    this.socket.on('server-status', (status: any) => {
      console.log('📡 Estado del servidor:', status);
    });

    this.socket.on('error', (error: any) => {
      console.error('❌ Error en Socket.IO:', error);
    });
  }

  // Manejo de reconexión
  private handleReconnect(userData: any): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(userData);
      }, this.reconnectInterval);
    } else {
      console.error('❌ Máximo número de intentos de reconexión alcanzado');
    }
  }

  // Desconectar del servidor
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Enviar un evento al servidor
  emit(eventName: string, data: any): void {
    if (this.socket) {
      this.socket.emit(eventName, data);
    }
  }

  // Escuchar eventos del servidor
  listen(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      if (this.socket) {
        this.socket.on(eventName, (data: any) => {
          subscriber.next(data);
        });
      }
      
      return () => {
        if (this.socket) {
          this.socket.off(eventName);
        }
      };
    });
  }

  // Método directo para escuchar eventos (para compatibilidad)
  on(eventName: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  // Método para dejar de escuchar eventos
  off(eventName: string): void {
    if (this.socket) {
      this.socket.off(eventName);
    }
  }

  // Verificar si está conectado
  isConnected(): boolean {
    return this.socket && this.socket.connected;
  }

  // Unirse a una sala específica
  joinRoom(room: string): void {
    if (this.socket) {
      this.socket.emit('join-room', room);
    }
  }

  // Salir de una sala específica
  leaveRoom(room: string): void {
    if (this.socket) {
      this.socket.emit('leave-room', room);
    }
  }

  // ========== MÉTODOS ESPECÍFICOS PARA PEDIDOS EN MESA ==========

  // Seleccionar mesa para hacer pedido
  seleccionarMesa(numeroMesa: number, dispositivoId: string): void {
    if (this.socket) {
      this.socket.emit('seleccionar-mesa', { mesa: numeroMesa, dispositivo: dispositivoId });
    }
  }

  // Crear nuevo pedido en mesa
  crearPedidoMesa(pedido: Omit<PedidoMesa, 'id' | 'timestamp'>): void {
    if (this.socket) {
      this.socket.emit('crear-pedido-mesa', {
        ...pedido,
        timestamp: new Date()
      });
    }
  }

  // Crear nuevo pedido de delivery
  crearPedidoDelivery(pedido: Omit<PedidoDelivery, 'id' | 'timestamp'>): void {
    if (this.socket) {
      this.socket.emit('crear-pedido-delivery', {
        ...pedido,
        timestamp: new Date()
      });
    }
  }

  // Crear nuevo pedido para llevar
  crearPedidoLlevar(pedido: Omit<PedidoLlevar, 'id' | 'timestamp'>): void {
    if (this.socket) {
      this.socket.emit('crear-pedido-llevar', {
        ...pedido,
        timestamp: new Date()
      });
    }
  }

  // Actualizar estado de pedido
  actualizarEstadoPedido(pedidoId: string, nuevoEstado: PedidoMesa['estado']): void {
    if (this.socket) {
      this.socket.emit('actualizar-estado-pedido', { pedidoId, estado: nuevoEstado });
    }
  }

  // Agregar producto a pedido existente
  agregarProductoPedido(pedidoId: string, producto: any): void {
    if (this.socket) {
      this.socket.emit('agregar-producto-pedido', { pedidoId, producto });
    }
  }

  // Enviar pedido
  enviarPedido(pedido: any): void {
    if (this.socket) {
      this.socket.emit('nuevo-pedido', pedido);
    }
  }

  // Liberar mesa
  liberarMesa(numeroMesa: number): void {
    if (this.socket) {
      this.socket.emit('liberar-mesa', { mesa: numeroMesa });
    }
  }

  // Obtener pedidos por estado
  obtenerPedidosPorEstado(estado: PedidoMesa['estado']): void {
    if (this.socket) {
      this.socket.emit('obtener-pedidos-estado', { estado });
    }
  }

  // Inicializar listeners de eventos específicos
  private initializeSocketListeners(): void {
    // Este método se ejecutará cuando se establezca la conexión
    // Los listeners se configurarán en el método connect
  }

  // Configurar listeners después de conectar
  private setupAllListeners(): void {
    if (!this.socket) return;

    // Estado de mesas actualizado
    this.socket.on('estado-mesas', (mesas: MesaEstado[]) => {
      this.mesasEstado.next(mesas);
    });

    // Pedidos por estado (respuesta del backend)
    this.socket.on('pedidos-por-estado', (data: { estado: string, pedidos: PedidoGeneral[] }) => {
      this.actualizarPedidosPorTipo(data.pedidos);
    });

    // Nuevo pedido creado
    this.socket.on('pedido-creado', (pedido: PedidoGeneral) => {
      this.agregarPedido(pedido);
      console.log('✅ Nuevo pedido creado:', pedido);
    });

    // Pedido actualizado
    this.socket.on('pedido-actualizado', (pedidoActualizado: PedidoGeneral) => {
      this.actualizarPedido(pedidoActualizado);
      console.log('🔄 Pedido actualizado:', pedidoActualizado);
    });

    // Mesa ocupada/liberada
    this.socket.on('mesa-estado-cambiado', (mesaInfo: { numero: number, ocupada: boolean, dispositivos: string[] }) => {
      const mesasActuales = this.mesasEstado.value;
      const index = mesasActuales.findIndex(m => m.numero === mesaInfo.numero);
      if (index !== -1) {
        mesasActuales[index] = { ...mesasActuales[index], ...mesaInfo };
        this.mesasEstado.next([...mesasActuales]);
      }
    });

    // Error en operación
    this.socket.on('error-operacion', (error: { mensaje: string, tipo: string }) => {
      console.error('❌ Error en operación:', error);
    });

    // Notificaciones específicas
    this.socket.on('nuevo-pedido-cocina', (pedido: PedidoGeneral) => {
      console.log('🍳 Nuevo pedido para cocina:', pedido);
    });

    this.socket.on('pedido-listo-pago', (pedido: PedidoGeneral) => {
      console.log('💰 Pedido listo para pago:', pedido);
    });

    this.socket.on('pedido-entregado', (pedido: PedidoGeneral) => {
      console.log('📦 Pedido entregado:', pedido);
    });

    this.socket.on('mesa-liberada', (mesaInfo: { numero: number }) => {
      console.log('🆓 Mesa liberada:', mesaInfo.numero);
    });
  }

  // ========== MÉTODOS AUXILIARES PARA MANEJO DE PEDIDOS ==========

  // Actualizar pedidos por tipo
  private actualizarPedidosPorTipo(pedidos: PedidoGeneral[]): void {
    const pedidosMesa: PedidoMesa[] = [];
    const pedidosDelivery: PedidoDelivery[] = [];
    const pedidosLlevar: PedidoLlevar[] = [];

    pedidos.forEach(pedido => {
      switch (pedido.tipo) {
        case 'mesa':
          pedidosMesa.push(pedido as PedidoMesa);
          break;
        case 'delivery':
          pedidosDelivery.push(pedido as PedidoDelivery);
          break;
        case 'llevar':
          pedidosLlevar.push(pedido as PedidoLlevar);
          break;
      }
    });

    this.pedidosActivos.next(pedidosMesa);
    this.pedidosDelivery.next(pedidosDelivery);
    this.pedidosLlevar.next(pedidosLlevar);
    this.todosPedidos.next(pedidos);
  }

  // Agregar nuevo pedido
  private agregarPedido(pedido: PedidoGeneral): void {
    const todosPedidosActuales = this.todosPedidos.value;
    this.todosPedidos.next([...todosPedidosActuales, pedido]);

    switch (pedido.tipo) {
      case 'mesa':
        const pedidosMesa = this.pedidosActivos.value;
        this.pedidosActivos.next([...pedidosMesa, pedido as PedidoMesa]);
        break;
      case 'delivery':
        const pedidosDelivery = this.pedidosDelivery.value;
        this.pedidosDelivery.next([...pedidosDelivery, pedido as PedidoDelivery]);
        break;
      case 'llevar':
        const pedidosLlevar = this.pedidosLlevar.value;
        this.pedidosLlevar.next([...pedidosLlevar, pedido as PedidoLlevar]);
        break;
    }
  }

  // Actualizar pedido existente
  private actualizarPedido(pedidoActualizado: PedidoGeneral): void {
    // Actualizar en todos los pedidos
    const todosPedidos = this.todosPedidos.value;
    const indexTodos = todosPedidos.findIndex(p => p.id === pedidoActualizado.id);
    if (indexTodos !== -1) {
      todosPedidos[indexTodos] = pedidoActualizado;
      this.todosPedidos.next([...todosPedidos]);
    }

    // Actualizar en el observable específico según el tipo
    switch (pedidoActualizado.tipo) {
      case 'mesa':
        const pedidosMesa = this.pedidosActivos.value;
        const indexMesa = pedidosMesa.findIndex(p => p.id === pedidoActualizado.id);
        if (indexMesa !== -1) {
          pedidosMesa[indexMesa] = pedidoActualizado as PedidoMesa;
          this.pedidosActivos.next([...pedidosMesa]);
        }
        break;
      case 'delivery':
        const pedidosDelivery = this.pedidosDelivery.value;
        const indexDelivery = pedidosDelivery.findIndex(p => p.id === pedidoActualizado.id);
        if (indexDelivery !== -1) {
          pedidosDelivery[indexDelivery] = pedidoActualizado as PedidoDelivery;
          this.pedidosDelivery.next([...pedidosDelivery]);
        }
        break;
      case 'llevar':
        const pedidosLlevar = this.pedidosLlevar.value;
        const indexLlevar = pedidosLlevar.findIndex(p => p.id === pedidoActualizado.id);
        if (indexLlevar !== -1) {
          pedidosLlevar[indexLlevar] = pedidoActualizado as PedidoLlevar;
          this.pedidosLlevar.next([...pedidosLlevar]);
        }
        break;
    }
  }

  // ========== MÉTODOS PÚBLICOS PARA OBTENER DATOS ==========

  // Obtener estado actual de mesas
  getMesasEstado(): MesaEstado[] {
    return this.mesasEstado.value;
  }

  // Obtener pedidos activos de mesa
  getPedidosActivos(): PedidoMesa[] {
    return this.pedidosActivos.value;
  }

  // Obtener pedidos de delivery
  getPedidosDelivery(): PedidoDelivery[] {
    return this.pedidosDelivery.value;
  }

  // Obtener pedidos para llevar
  getPedidosLlevar(): PedidoLlevar[] {
    return this.pedidosLlevar.value;
  }

  // Obtener todos los pedidos
  getTodosPedidos(): PedidoGeneral[] {
    return this.todosPedidos.value;
  }

  // Verificar si una mesa está disponible
  isMesaDisponible(numeroMesa: number): boolean {
    const mesa = this.mesasEstado.value.find(m => m.numero === numeroMesa);
    return mesa ? !mesa.ocupada : true;
  }

}