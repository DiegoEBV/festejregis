import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

declare const io: any;

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: any;
  private serverUrl = 'https://festejos-socket-server.onrender.com'; // URL del servidor Socket.IO

  constructor() {}

  // Conectar al servidor de Socket.IO
  connect(userData: any): void {
    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      query: {
        userId: userData.id,
        userName: userData.nombre,
        userRole: userData.rol
      }
    });

    this.socket.on('connect', () => {
      console.log('Conectado al servidor Socket.IO');
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('Error de conexión Socket.IO:', error);
    });
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