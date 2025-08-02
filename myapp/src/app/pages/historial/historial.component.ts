import { Component, OnInit } from '@angular/core';
import { DexieService } from '../../services/dexie.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-historial',
  standalone: false,
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css']
})
export class HistorialComponent implements OnInit {
  historialPedidos: any[] = [];
  fechaInicio: string = '';
  fechaFin: string = '';
  filtroTipo: string = 'todos';
  filtroMetodoPago: string = 'todos';
  totalRegistrosEnBD: number = 0;
  cargando: boolean = false;
  
  constructor(
    private dexieService: DexieService,
    public authService: AuthService,
    private notificationService: NotificationService
  ) { }
  
  ngOnInit(): void {
    // Verificar si el usuario está logueado y es cajero
    if (!this.authService.isAuthenticated() || !this.authService.isCaja()) {
      // Redirigir a la página principal
      window.location.href = '/';
      return;
    }
    
    // Inicializar fechas por defecto (fecha actual)
    const hoy = new Date();
    
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.fechaInicio = hoy.toISOString().split('T')[0];
    
    // Cargar historial inicial
    this.cargarHistorial();
    
    // Inicializar el menú lateral
    this.inicializarMenuLateral();
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
  
  cargarHistorial(): void {
    this.cargando = true;
    this.dexieService.getHistorialPagos().then((historial: any[]) => {
      console.log('DEBUG - Historial completo desde BD:', historial);
      console.log('DEBUG - Cantidad total de registros:', historial.length);
      
      this.totalRegistrosEnBD = historial.length;
      
      if (historial.length === 0) {
        console.log('DEBUG - No hay datos en la base de datos');
        this.historialPedidos = [];
        this.cargando = false;
        return;
      }
      
      // Si no hay fechas seleccionadas, mostrar todos los datos
      if (!this.fechaInicio || !this.fechaFin) {
        this.historialPedidos = [...historial];
      } else {
        // Convertir fechas a objetos Date para comparación
        const inicio = new Date(this.fechaInicio + 'T00:00:00.000Z');
        const fin = new Date(this.fechaFin + 'T23:59:59.999Z');
        
        console.log('DEBUG - Rango de fechas:', { 
          inicioStr: this.fechaInicio, 
          finStr: this.fechaFin,
          inicio, 
          fin 
        });
        
        // Filtrar por fecha
        this.historialPedidos = historial.filter(pedido => {
          const fechaPedido = new Date(pedido.fecha);
          const enRango = fechaPedido >= inicio && fechaPedido <= fin;
          if (!enRango) {
            console.log('DEBUG - Pedido fuera de rango:', { 
              pedidoFecha: pedido.fecha, 
              pedidoFechaObj: fechaPedido,
              inicio, 
              fin,
              pedidoData: pedido 
            });
          }
          return enRango;
        });
      }
      
      console.log('DEBUG - Después de filtro por fecha:', this.historialPedidos.length);
      
      // Aplicar filtros adicionales
      if (this.filtroTipo !== 'todos') {
        this.historialPedidos = this.historialPedidos.filter(pedido => 
          pedido.tipo === this.filtroTipo
        );
      }
      
      if (this.filtroMetodoPago !== 'todos') {
        this.historialPedidos = this.historialPedidos.filter(pedido => 
          pedido.metodoPago === this.filtroMetodoPago
        );
      }
      
      // Ordenar por fecha (más reciente primero)
      this.historialPedidos.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      
      console.log('DEBUG - Historial final filtrado:', this.historialPedidos);
      this.cargando = false;
    }).catch(error => {
      console.error('ERROR - Al cargar historial:', error);
      this.historialPedidos = [];
      this.totalRegistrosEnBD = 0;
      this.cargando = false;
      this.notificationService.error('Error al cargar el historial de pagos');
    });
  }
  
  aplicarFiltros(): void {
    this.cargarHistorial();
  }
  
  limpiarFiltros(): void {
    // Establecer fecha actual por defecto
    const hoy = new Date();
    this.fechaInicio = hoy.toISOString().split('T')[0];
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.filtroTipo = 'todos';
    this.filtroMetodoPago = 'todos';
    
    this.cargarHistorial();
  }

  mostrarTodosLosDatos(): void {
    // Limpiar todos los filtros para mostrar todos los datos históricos
    this.fechaInicio = '';
    this.fechaFin = '';
    this.filtroTipo = 'todos';
    this.filtroMetodoPago = 'todos';
    
    this.cargarHistorial();
  }
  
  calcularTotal(): number {
    return this.historialPedidos.reduce((total, pedido) => total + pedido.total, 0);
  }
  
  calcularTotalPorMetodo(metodo: string): number {
    return this.historialPedidos
      .filter(pedido => pedido.metodoPago === metodo)
      .reduce((total, pedido) => total + pedido.total, 0);
  }
  
  exportarCSV(): void {
    if (this.historialPedidos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    // Crear cabeceras CSV
    const cabeceras = ['Tipo', 'Número', 'Fecha', 'Total', 'Método de Pago', 'Detalles'];
    
    // Crear filas de datos
    const filas = this.historialPedidos.map(pedido => {
      // Formatear detalles de items
      const detalles = pedido.items
        ? pedido.items.map((item: any) => `${item.cantidad}x ${item.nombre}`).join('; ')
        : '';
      
      return [
        pedido.tipo,
        pedido.numero,
        new Date(pedido.fecha).toLocaleString(),
        pedido.total.toFixed(2),
        pedido.metodoPago,
        detalles
      ];
    });
    
    // Combinar cabeceras y filas
    const csvContent = [
      cabeceras.join(','),
      ...filas.map(fila => fila.join(','))
    ].join('\n');
    
    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  verDetallesPedido(pedido: any): void {
    // Mostrar detalles en un modal o expandir la fila
    alert(`Detalles del pedido ${pedido.tipo} ${pedido.numero}:\n\n` + 
          `${pedido.items ? pedido.items.map((item: any) => `${item.cantidad}x ${item.nombre} - S/ ${item.precio.toFixed(2)}`).join('\n') : 'No hay detalles disponibles'}`);
  }

  // Métodos de gestión de base de datos
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
          this.cargarHistorial();
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
        this.cargarHistorial();
      });
    }
  }
}

