import { Injectable } from '@angular/core';
import { DexieService } from './dexie.service';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';
import { Observable, interval, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AutomationService {
  private backupInterval: any;
  private syncInterval: any;
  private lastBackupDate: string = '';
  private cloudSyncEnabled = new BehaviorSubject<boolean>(false);
  private autoPrintEnabled = new BehaviorSubject<boolean>(true);
  private backupEnabled = new BehaviorSubject<boolean>(true);

  constructor(
    private dexieService: DexieService,
    private socketService: SocketService,
    private notificationService: NotificationService
  ) {
    this.initializeAutomation();
  }

  // Inicializar todas las automatizaciones
  private initializeAutomation(): void {
    this.initializeBackupScheduler();
    this.initializeCloudSync();
    this.initializeAutoPrint();
    this.loadSettings();
  }

  // ========== BACKUP AUTOMÁTICO ==========
  
  private initializeBackupScheduler(): void {
    // Verificar backup cada hora
    this.backupInterval = setInterval(() => {
      this.checkAndPerformDailyBackup();
    }, 3600000); // 1 hora

    // Verificar inmediatamente al iniciar
    setTimeout(() => {
      this.checkAndPerformDailyBackup();
    }, 5000);
  }

  private async checkAndPerformDailyBackup(): Promise<void> {
    if (!this.backupEnabled.value) return;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const hour = now.getHours();

    // Realizar backup a las 23:00 horas si no se ha hecho hoy
    if (hour >= 23 && this.lastBackupDate !== today) {
      await this.performAutomaticBackup();
      this.lastBackupDate = today;
      localStorage.setItem('lastBackupDate', today);
    }
  }

  private async performAutomaticBackup(): Promise<void> {
    try {
      console.log('🔄 Iniciando backup automático...');
      
      const backupData = await this.dexieService.exportarDB();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `festejos_backup_auto_${timestamp}.json`;
      
      // Guardar en localStorage como respaldo local
      const backupKey = `backup_${new Date().toISOString().split('T')[0]}`;
      localStorage.setItem(backupKey, backupData);
      
      // Limpiar backups antiguos (mantener solo los últimos 7 días)
      this.cleanOldBackups();
      
      // Descargar archivo de backup
      this.downloadBackup(backupData, filename);
      
      // Sincronizar con la nube si está habilitado
      if (this.cloudSyncEnabled.value) {
        await this.uploadToCloud(backupData, filename);
      }
      
      this.notificationService.success(
        `✅ Backup automático completado: ${filename}`
      );
      
      console.log('✅ Backup automático completado exitosamente');
    } catch (error) {
      console.error('❌ Error en backup automático:', error);
      this.notificationService.error(
        'Error al realizar backup automático'
      );
    }
  }

  private downloadBackup(data: string, filename: string): void {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private cleanOldBackups(): void {
    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter(key => key.startsWith('backup_'));
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    backupKeys.forEach(key => {
      const dateStr = key.replace('backup_', '');
      const backupDate = new Date(dateStr);
      if (backupDate < sevenDaysAgo) {
        localStorage.removeItem(key);
      }
    });
  }

  // ========== SINCRONIZACIÓN EN LA NUBE ==========
  
  private initializeCloudSync(): void {
    // Sincronizar cada 5 minutos si está habilitado
    this.syncInterval = setInterval(() => {
      if (this.cloudSyncEnabled.value) {
        this.performCloudSync();
      }
    }, 300000); // 5 minutos
  }

  private async performCloudSync(): Promise<void> {
    try {
      if (!this.socketService.isConnected()) {
        console.log('⚠️ Socket no conectado, omitiendo sincronización');
        return;
      }

      console.log('🔄 Iniciando sincronización en la nube...');
      
      // Obtener datos locales
      const localData = await this.dexieService.exportarDB();
      const syncData = {
        timestamp: new Date().toISOString(),
        data: JSON.parse(localData),
        deviceId: this.getDeviceId()
      };

      // Enviar datos al servidor
      this.socketService.emit('sync-data', syncData);
      
      // Escuchar respuesta del servidor
      this.socketService.listen('sync-response').subscribe(async (response: any) => {
        if (response.success) {
          console.log('✅ Sincronización completada');
          
          // Si hay datos más recientes del servidor, actualizarlos
          if (response.hasNewerData && response.data) {
            await this.mergeCloudData(response.data);
          }
        } else {
          console.error('❌ Error en sincronización:', response.error);
        }
      });
      
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    }
  }

  private async uploadToCloud(data: string, filename: string): Promise<void> {
    try {
      const cloudData = {
        filename,
        data,
        timestamp: new Date().toISOString(),
        deviceId: this.getDeviceId()
      };
      
      this.socketService.emit('upload-backup', cloudData);
      console.log('☁️ Backup enviado a la nube');
    } catch (error) {
      console.error('❌ Error al subir a la nube:', error);
    }
  }

  private async mergeCloudData(cloudData: any): Promise<void> {
    try {
      // Implementar lógica de merge inteligente
      // Por ahora, solo importar si los datos de la nube son más recientes
      const localTimestamp = localStorage.getItem('lastSyncTimestamp') || '1970-01-01';
      
      if (cloudData.timestamp > localTimestamp) {
        await this.dexieService.importarDB(JSON.stringify(cloudData.data));
        localStorage.setItem('lastSyncTimestamp', cloudData.timestamp);
        
        this.notificationService.info(
          '🔄 Datos actualizados desde la nube'
        );
      }
    } catch (error) {
      console.error('❌ Error al fusionar datos de la nube:', error);
    }
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  // ========== IMPRESIÓN AUTOMÁTICA ==========
  
  private initializeAutoPrint(): void {
    // Escuchar nuevos pedidos para impresión automática
    this.socketService.listen('nuevoPedido').subscribe((pedido: any) => {
      if (this.autoPrintEnabled.value) {
        this.printKitchenTicket(pedido);
      }
    });
  }

  private async printKitchenTicket(pedido: any): Promise<void> {
    try {
      console.log('🖨️ Imprimiendo ticket automático para cocina...');
      
      const ticketContent = this.generateKitchenTicketContent(pedido);
      
      // Intentar imprimir usando la API de impresión del navegador
      if ('print' in window) {
        this.printTicket(ticketContent);
      }
      
      // También enviar a impresora de red si está configurada
      await this.sendToNetworkPrinter(ticketContent);
      
      console.log('✅ Ticket enviado a cocina automáticamente');
    } catch (error) {
      console.error('❌ Error en impresión automática:', error);
    }
  }

  private generateKitchenTicketContent(pedido: any): string {
    const fecha = new Date().toLocaleString('es-PE');
    let content = `
      ========== COCINA ==========
      Pedido #${pedido.id || 'N/A'}
      Mesa: ${pedido.mesa || 'Para llevar'}
      Fecha: ${fecha}
      Mozo: ${pedido.mozo || 'Sistema'}
      ===========================
    `;
    
    if (pedido.platos && pedido.platos.length > 0) {
      content += '\nPLATOS:\n';
      pedido.platos.forEach((plato: any) => {
        content += `- ${plato.cantidad}x ${plato.nombre}\n`;
        if (plato.observaciones) {
          content += `  Obs: ${plato.observaciones}\n`;
        }
      });
    }
    
    if (pedido.observaciones) {
      content += `\nObservaciones: ${pedido.observaciones}\n`;
    }
    
    content += '\n===========================\n';
    
    return content;
  }

  private printTicket(content: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket Cocina</title>
            <style>
              body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  private async sendToNetworkPrinter(content: string): Promise<void> {
    try {
      // Enviar a impresora de red a través del socket
      this.socketService.emit('print-kitchen-ticket', {
        content,
        timestamp: new Date().toISOString(),
        printer: 'kitchen'
      });
    } catch (error) {
      console.error('❌ Error al enviar a impresora de red:', error);
    }
  }

  // ========== MÉTODOS PÚBLICOS DE CONTROL ==========
  
  public toggleBackup(enabled: boolean): void {
    this.backupEnabled.next(enabled);
    localStorage.setItem('backupEnabled', enabled.toString());
    
    if (enabled) {
      this.notificationService.success('✅ Backup automático activado');
    } else {
      this.notificationService.info('⏸️ Backup automático desactivado');
    }
  }

  public toggleCloudSync(enabled: boolean): void {
    this.cloudSyncEnabled.next(enabled);
    localStorage.setItem('cloudSyncEnabled', enabled.toString());
    
    if (enabled) {
      this.performCloudSync(); // Sincronizar inmediatamente
      this.notificationService.success('✅ Sincronización en la nube activada');
    } else {
      this.notificationService.info('⏸️ Sincronización en la nube desactivada');
    }
  }

  public toggleAutoPrint(enabled: boolean): void {
    this.autoPrintEnabled.next(enabled);
    localStorage.setItem('autoPrintEnabled', enabled.toString());
    
    if (enabled) {
      this.notificationService.success('✅ Impresión automática activada');
    } else {
      this.notificationService.info('⏸️ Impresión automática desactivada');
    }
  }

  public async performManualBackup(): Promise<void> {
    await this.performAutomaticBackup();
  }

  public async performManualSync(): Promise<void> {
    if (this.cloudSyncEnabled.value) {
      await this.performCloudSync();
    } else {
      this.notificationService.warning('⚠️ Sincronización en la nube está desactivada');
    }
  }

  // ========== GETTERS PARA ESTADO ==========
  
  public get isBackupEnabled(): Observable<boolean> {
    return this.backupEnabled.asObservable();
  }

  public get isCloudSyncEnabled(): Observable<boolean> {
    return this.cloudSyncEnabled.asObservable();
  }

  public get isAutoPrintEnabled(): Observable<boolean> {
    return this.autoPrintEnabled.asObservable();
  }

  public getBackupStatus(): any {
    return {
      lastBackupDate: this.lastBackupDate || localStorage.getItem('lastBackupDate'),
      backupEnabled: this.backupEnabled.value,
      cloudSyncEnabled: this.cloudSyncEnabled.value,
      autoPrintEnabled: this.autoPrintEnabled.value
    };
  }

  // ========== CONFIGURACIÓN ==========
  
  private loadSettings(): void {
    const backupEnabled = localStorage.getItem('backupEnabled');
    const cloudSyncEnabled = localStorage.getItem('cloudSyncEnabled');
    const autoPrintEnabled = localStorage.getItem('autoPrintEnabled');
    const lastBackupDate = localStorage.getItem('lastBackupDate');
    
    if (backupEnabled !== null) {
      this.backupEnabled.next(backupEnabled === 'true');
    }
    
    if (cloudSyncEnabled !== null) {
      this.cloudSyncEnabled.next(cloudSyncEnabled === 'true');
    }
    
    if (autoPrintEnabled !== null) {
      this.autoPrintEnabled.next(autoPrintEnabled === 'true');
    }
    
    if (lastBackupDate) {
      this.lastBackupDate = lastBackupDate;
    }
  }

  // ========== CLEANUP ==========
  
  public destroy(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}