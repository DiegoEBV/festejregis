import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-socket-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="socket-test-container">
      <h3>🧪 Prueba de Conectividad Socket.IO</h3>
      
      <div class="status-section">
        <h4>Estado de Conexión:</h4>
        <div class="status-indicator" [class.connected]="isConnected" [class.disconnected]="!isConnected">
          {{ isConnected ? '✅ Conectado' : '❌ Desconectado' }}
        </div>
      </div>
      
      <div class="test-section">
        <h4>Pruebas de Eventos:</h4>
        <button (click)="testPing()" [disabled]="!isConnected" class="test-btn">
          🏓 Probar Ping
        </button>
        <button (click)="testMesaEvent()" [disabled]="!isConnected" class="test-btn">
          🍽️ Probar Evento Mesa
        </button>
        <button (click)="testPedidoEvent()" [disabled]="!isConnected" class="test-btn">
          📝 Probar Evento Pedido
        </button>
      </div>
      
      <div class="logs-section">
        <h4>Logs de Eventos:</h4>
        <div class="logs-container">
          <div *ngFor="let log of eventLogs" class="log-entry" [class]="log.type">
            <span class="timestamp">{{ log.timestamp }}</span>
            <span class="message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .socket-test-container {
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      margin: 1rem;
      font-family: 'Courier New', monospace;
    }
    
    .status-indicator {
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-weight: bold;
      margin: 0.5rem 0;
    }
    
    .connected {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .disconnected {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .test-btn {
      margin: 0.25rem;
      padding: 0.5rem 1rem;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .test-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
    
    .logs-container {
      max-height: 300px;
      overflow-y: auto;
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 0.5rem;
    }
    
    .log-entry {
      margin: 0.25rem 0;
      padding: 0.25rem;
      border-radius: 2px;
    }
    
    .log-entry.success {
      background: #d4edda;
      color: #155724;
    }
    
    .log-entry.error {
      background: #f8d7da;
      color: #721c24;
    }
    
    .log-entry.info {
      background: #d1ecf1;
      color: #0c5460;
    }
    
    .timestamp {
      font-size: 0.8rem;
      color: #6c757d;
      margin-right: 0.5rem;
    }
  `]
})
export class SocketTestComponent implements OnInit, OnDestroy {
  isConnected = false;
  eventLogs: Array<{timestamp: string, message: string, type: string}> = [];
  private subscriptions: Subscription[] = [];
  
  constructor(private socketService: SocketService) {}
  
  ngOnInit(): void {
    this.addLog('Iniciando componente de prueba Socket.IO', 'info');
    
    // Suscribirse al estado de conexión
    const connectionSub = this.socketService.connectionStatus$.subscribe(status => {
      this.isConnected = status;
      this.addLog(`Estado de conexión: ${status ? 'Conectado' : 'Desconectado'}`, status ? 'success' : 'error');
    });
    this.subscriptions.push(connectionSub);
    
    // Configurar listeners para eventos de prueba
    this.setupEventListeners();
    
    // Verificar estado inicial
    this.isConnected = this.socketService.isConnected();
    this.addLog(`Estado inicial: ${this.isConnected ? 'Conectado' : 'Desconectado'}`, this.isConnected ? 'success' : 'error');
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  private setupEventListeners(): void {
    // Escuchar eventos de respuesta
    this.socketService.on('pong', (data) => {
      this.addLog(`Recibido pong: ${JSON.stringify(data)}`, 'success');
    });
    
    this.socketService.on('mesa-test-response', (data) => {
      this.addLog(`Respuesta mesa test: ${JSON.stringify(data)}`, 'success');
    });
    
    this.socketService.on('pedido-test-response', (data) => {
      this.addLog(`Respuesta pedido test: ${JSON.stringify(data)}`, 'success');
    });
    
    // Escuchar errores
    this.socketService.on('error', (error) => {
      this.addLog(`Error: ${JSON.stringify(error)}`, 'error');
    });
  }
  
  testPing(): void {
    this.addLog('Enviando ping...', 'info');
    this.socketService.emit('ping', { timestamp: new Date().toISOString() });
  }
  
  testMesaEvent(): void {
    this.addLog('Enviando evento de prueba mesa...', 'info');
    this.socketService.emit('mesa-test', { 
      mesa: 1, 
      action: 'test',
      timestamp: new Date().toISOString()
    });
  }
  
  testPedidoEvent(): void {
    this.addLog('Enviando evento de prueba pedido...', 'info');
    this.socketService.emit('pedido-test', {
      pedido: {
        id: 'test-' + Date.now(),
        mesa: 1,
        productos: [{ nombre: 'Producto Test', precio: 10.00 }],
        total: 10.00
      },
      timestamp: new Date().toISOString()
    });
  }
  
  private addLog(message: string, type: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.eventLogs.unshift({ timestamp, message, type });
    
    // Mantener solo los últimos 50 logs
    if (this.eventLogs.length > 50) {
      this.eventLogs = this.eventLogs.slice(0, 50);
    }
    
    // También logear en la consola del navegador
    console.log(`[${timestamp}] ${message}`);
  }
}