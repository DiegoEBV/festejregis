import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

declare const io: any;

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: any;
  private serverUrl = 'https://fetregapi.onrender.com'; // Servidor Socket.IO local
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;

  constructor() {}

  // Conectar al servidor de Socket.IO
  connect(userData: any): void {
    if (this.socket && this.socket.connected) {
      console.log('Ya existe una conexión activa');
      return;
    }

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

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.IO local');
      this.reconnectAttempts = 0;
      
      // Identificarse automáticamente
      this.socket.emit('identificarse', userData);
    });

    this.socket.on('connect_error', (error: any) => {
      console.warn('⚠️ Error de conexión Socket.IO (usando servidor local):', error.message);
      this.handleReconnect(userData);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Desconectado del servidor Socket.IO:', reason);
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
}