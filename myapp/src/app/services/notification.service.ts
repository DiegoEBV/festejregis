import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<Notification | null>(null);
  public notification$: Observable<Notification | null> = this.notificationSubject.asObservable();

  constructor() {}

  // Mostrar una notificación
  show(notification: Notification): void {
    this.notificationSubject.next(notification);

    // Ocultar automáticamente después de la duración especificada
    if (notification.duration) {
      setTimeout(() => {
        this.hide();
      }, notification.duration);
    }
  }

  // Ocultar la notificación actual
  hide(): void {
    this.notificationSubject.next(null);
  }

  // Métodos de conveniencia para diferentes tipos de notificaciones
  success(message: string, duration: number = 3000): void {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration: number = 5000): void {
    this.show({ message, type: 'error', duration });
  }

  info(message: string, duration: number = 3000): void {
    this.show({ message, type: 'info', duration });
  }

  warning(message: string, duration: number = 4000): void {
    this.show({ message, type: 'warning', duration });
  }

  // Alias para compatibilidad
  mostrarExito(message: string, duration: number = 3000): void {
    this.success(message, duration);
  }

  mostrarInfo(message: string, duration: number = 3000): void {
    this.info(message, duration);
  }
  
  // Cerrar alerta manualmente
  cerrarAlerta(): void {
    const alertaDiv = document.getElementById('alertaPedidoListo');
    if (alertaDiv) {
      alertaDiv.style.display = 'none';
    }
  }
}