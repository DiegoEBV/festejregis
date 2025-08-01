import { Component, OnInit } from '@angular/core';
import { DexieService } from '../../services/dexie.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css']
})
export class HistorialComponent implements OnInit {
  historialPedidos: any[] = [];
  fechaInicio: string = '';
  fechaFin: string = '';
  filtroTipo: string = 'todos';
  filtroMetodoPago: string = 'todos';
  
  constructor(
    private dexieService: DexieService,
    public authService: AuthService
  ) { }
  
  ngOnInit(): void {
    // Verificar si el usuario está logueado y es cajero
    if (!this.authService.isAuthenticated() || !this.authService.isCajero()) {
      // Redirigir a la página principal
      window.location.href = '/';
      return;
    }
    
    // Inicializar fechas por defecto (último mes)
    const hoy = new Date();
    const mesAnterior = new Date();
    mesAnterior.setMonth(hoy.getMonth() - 1);
    
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.fechaInicio = mesAnterior.toISOString().split('T')[0];
    
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
    // Convertir fechas a objetos Date para comparación
    const inicio = new Date(this.fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    
    const fin = new Date(this.fechaFin);
    fin.setHours(23, 59, 59, 999);
    
    this.dexieService.getHistorialPagos().then((historial: any[]) => {
      // Filtrar por fecha
      this.historialPedidos = historial.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha);
        return fechaPedido >= inicio && fechaPedido <= fin;
      });
      
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
    });
  }
  
  aplicarFiltros(): void {
    this.cargarHistorial();
  }
  
  limpiarFiltros(): void {
    const hoy = new Date();
    const mesAnterior = new Date();
    mesAnterior.setMonth(hoy.getMonth() - 1);
    
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.fechaInicio = mesAnterior.toISOString().split('T')[0];
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
}

