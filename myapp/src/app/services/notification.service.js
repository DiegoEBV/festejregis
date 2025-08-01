import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor() {}

  requestPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, options);
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          return new Notification(title, options);
        }
      });
    }
    return null;
  }

  showMessage(message, duration = 3000) {
    const alertaDiv = document.getElementById('alertaPedidoListo');
    const alertaMsg = document.getElementById('alertaMsg');
    const barraProgreso = document.getElementById('barraProgreso');
    
    if (!alertaDiv || !alertaMsg || !barraProgreso) {
      console.error('Elementos de alerta no encontrados');
      return;
    }
    
    alertaMsg.textContent = message;
    alertaDiv.style.display = 'block';
    barraProgreso.style.width = '0%';
    
    let width = 0;
    const interval = 10;
    const increment = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      width += increment;
      barraProgreso.style.width = width + '%';
      
      if (width >= 100) {
        clearInterval(timer);
        alertaDiv.style.display = 'none';
      }
    }, interval);
  }

  cerrarAlerta() {
    const alertaDiv = document.getElementById('alertaPedidoListo');
    if (alertaDiv) {
      alertaDiv.style.display = 'none';
    }
  }
}