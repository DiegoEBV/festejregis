import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DexieService } from '../../services/dexie.service';
import { AuthService } from '../../services/auth.service';
import { CatalogoService } from '../../services/catalogo.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-productividad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  providers: [DatePipe],
  templateUrl: './productividad.component.html',
  styleUrls: ['./productividad.component.css']
})
export class ProductividadComponent implements OnInit, AfterViewInit {
  @ViewChild('ventasChart') ventasChartCanvas!: ElementRef;
  @ViewChild('platosChart') platosChartCanvas!: ElementRef;
  
  fechaInicio: string = '';
  fechaFin: string = '';
  
  ventasPorDia: any[] = [];
  platosMasVendidos: any[] = [];
  
  totalVentas: number = 0;
  promedioVentasDiarias: number = 0;
  diasAnalisis: number = 0;
  
  ventasChart!: Chart;
  platosChart!: Chart;
  
  constructor(
    private dexieService: DexieService,
    public authService: AuthService,
    private catalogoService: CatalogoService
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
  }
  
  ngAfterViewInit(): void {
    // Inicializar el menú lateral después de que la vista esté lista
    setTimeout(() => {
      this.inicializarMenuLateral();
    }, 100);
    
    // Cargar datos iniciales después de que la vista esté lista
    this.generarReporte();
  }
  
  inicializarMenuLateral(): void {
    console.log('🔧 Inicializando menú lateral...');
    const menuButton = document.getElementById('menuButton');
    const sideMenu = document.getElementById('sideMenu');
    
    console.log('🔧 Elementos encontrados:', { menuButton: !!menuButton, sideMenu: !!sideMenu });
    
    if (menuButton && sideMenu) {
      // Remover listeners previos si existen
      menuButton.removeEventListener('click', this.toggleMenu);
      
      // Agregar nuevo listener
      menuButton.addEventListener('click', this.toggleMenu.bind(this));
      
      // Cerrar menú al hacer clic fuera
      document.addEventListener('click', (event) => {
        if (!sideMenu.contains(event.target as Node) && 
            event.target !== menuButton) {
          sideMenu.classList.remove('open');
          console.log('🔧 Menú cerrado por clic fuera');
        }
      });
      
      console.log('🔧 Menú lateral inicializado correctamente');
    } else {
      console.error('🔧 Error: No se encontraron los elementos del menú lateral');
    }
  }
  
  toggleMenu(): void {
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
      sideMenu.classList.toggle('open');
      console.log('🔧 Menú toggled, estado open:', sideMenu.classList.contains('open'));
    }
  }
  
  generarReporte(): void {
    console.log('DEBUG - Generando reporte con fechas:', { inicio: this.fechaInicio, fin: this.fechaFin });
    
    // Convertir fechas a objetos Date para comparación
    const inicio = new Date(this.fechaInicio + 'T00:00:00.000Z');
    const fin = new Date(this.fechaFin + 'T23:59:59.999Z');
    
    console.log('DEBUG - Rango de fechas convertido:', { 
      inicioStr: this.fechaInicio, 
      finStr: this.fechaFin,
      inicio, 
      fin 
    });
    
    this.dexieService.getHistorialPagos().then(historial => {
      console.log('DEBUG - Historial completo para productividad:', historial);
      console.log('DEBUG - Cantidad total de registros:', historial.length);
      
      // Filtrar por fecha
      const historialFiltrado = historial.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha);
        const enRango = fechaPedido >= inicio && fechaPedido <= fin;
        if (!enRango) {
           console.log('DEBUG - Pedido fuera de rango en productividad:', { 
             pedidoFecha: pedido.fecha, 
             pedidoFechaObj: new Date(pedido.fecha),
             inicio, 
             fin,
             pedidoData: pedido 
           });
         }
        return enRango;
      });
      
      console.log('DEBUG - Historial filtrado para productividad:', historialFiltrado);
      console.log('DEBUG - Cantidad después de filtro:', historialFiltrado.length);
      
      // Calcular ventas por día
      this.calcularVentasPorDia(historialFiltrado);
      
      // Calcular platos más vendidos
      this.calcularPlatosMasVendidos(historialFiltrado);
      
      // Calcular estadísticas generales
      this.calcularEstadisticas(historialFiltrado);
      
      // Generar gráficos
      this.generarGraficos();
    }).catch(error => {
      console.error('DEBUG - Error al obtener historial de pagos:', error);
    });
  }
  
  calcularVentasPorDia(historial: any[]): void {
    const ventasPorDia: {[key: string]: number} = {};
    
    // Inicializar todas las fechas en el rango usando UTC
    const inicio = new Date(this.fechaInicio + 'T00:00:00.000Z');
    const fin = new Date(this.fechaFin + 'T23:59:59.999Z');
    const fechaActual = new Date(inicio);
    
    while (fechaActual <= fin) {
      const fechaStr = fechaActual.toISOString().split('T')[0];
      ventasPorDia[fechaStr] = 0;
      fechaActual.setUTCDate(fechaActual.getUTCDate() + 1);
    }
    
    // Sumar ventas por día usando la fecha original del pedido
    historial.forEach(pedido => {
      // Extraer solo la fecha del pedido sin conversión de zona horaria
      const fechaPedidoOriginal = pedido.fecha.split('T')[0];
      ventasPorDia[fechaPedidoOriginal] = (ventasPorDia[fechaPedidoOriginal] || 0) + pedido.total;
      
      console.log('DEBUG - Procesando pedido:', {
        fechaOriginal: pedido.fecha,
        fechaExtraida: fechaPedidoOriginal,
        total: pedido.total
      });
    });
    
    // Convertir a array para el gráfico
    this.ventasPorDia = Object.entries(ventasPorDia).map(([fecha, total]) => ({
      fecha,
      total
    })).sort((a, b) => a.fecha.localeCompare(b.fecha));
    
    console.log('DEBUG - Ventas por día calculadas:', this.ventasPorDia);
  }
  
  calcularPlatosMasVendidos(historial: any[]): void {
    const contadorPlatos: {[key: string]: {cantidad: number, total: number}} = {};
    
    // Contar platos vendidos
    historial.forEach(pedido => {
      if (pedido.items && Array.isArray(pedido.items)) {
        pedido.items.forEach((item: any) => {
          if (!contadorPlatos[item.nombre]) {
            contadorPlatos[item.nombre] = { cantidad: 0, total: 0 };
          }
          contadorPlatos[item.nombre].cantidad += item.cantidad;
          contadorPlatos[item.nombre].total += item.precio * item.cantidad;
        });
      }
    });
    
    // Convertir a array y ordenar por cantidad
    this.platosMasVendidos = Object.entries(contadorPlatos).map(([nombre, datos]) => ({
      nombre,
      cantidad: datos.cantidad,
      total: datos.total
    })).sort((a, b) => b.cantidad - a.cantidad);
    
    // Limitar a los 10 más vendidos
    this.platosMasVendidos = this.platosMasVendidos.slice(0, 10);
  }
  
  calcularEstadisticas(historial: any[]): void {
    // Total de ventas
    this.totalVentas = historial.reduce((total, pedido) => total + pedido.total, 0);
    
    // Días de análisis
    const inicio = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    const diffTime = Math.abs(fin.getTime() - inicio.getTime());
    this.diasAnalisis = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Promedio de ventas diarias
    this.promedioVentasDiarias = this.totalVentas / this.diasAnalisis;
  }
  
  generarGraficos(): void {
    this.generarGraficoVentas();
    this.generarGraficoPlatos();
  }
  
  generarGraficoVentas(): void {
    if (this.ventasChart) {
      this.ventasChart.destroy();
    }
    
    const ctx = this.ventasChartCanvas.nativeElement.getContext('2d');
    
    this.ventasChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.ventasPorDia.map(item => {
          const fecha = new Date(item.fecha);
          return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        }),
        datasets: [{
          label: 'Ventas por día (S/.)',
          data: this.ventasPorDia.map(item => item.total),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Ventas (S/.)',
              font: {
                weight: 'bold'
              }
            }
          },
          x: {
            title: {
              display: true,
              text: 'Fecha',
              font: {
                weight: 'bold'
              }
            }
          }
        }
      }
    });
  }
  
  generarGraficoPlatos(): void {
    if (this.platosChart) {
      this.platosChart.destroy();
    }
    
    const ctx = this.platosChartCanvas.nativeElement.getContext('2d');
    
    this.platosChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.platosMasVendidos.map(item => item.nombre),
        datasets: [{
          label: 'Cantidad vendida',
          data: this.platosMasVendidos.map(item => item.cantidad),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad',
              font: {
                weight: 'bold'
              }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Plato',
              font: {
                weight: 'bold'
              }
            }
          }
        }
      }
    });
  }
  
  establecerFechaHoy(): void {
    const hoy = new Date();
    this.fechaInicio = hoy.toISOString().split('T')[0];
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.generarReporte();
  }

  establecerUltimaSemana(): void {
    const hoy = new Date();
    const semanaAnterior = new Date();
    semanaAnterior.setDate(hoy.getDate() - 7);
    
    this.fechaInicio = semanaAnterior.toISOString().split('T')[0];
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.generarReporte();
  }

  exportarCSV(): void {
    if (this.ventasPorDia.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    // Crear CSV para ventas por día
    const cabecerasVentas = ['Fecha', 'Total (S/.)'];
    const filasVentas = this.ventasPorDia.map(item => [
      item.fecha,
      item.total.toFixed(2)
    ]);
    
    const csvVentas = [
      cabecerasVentas.join(','),
      ...filasVentas.map(fila => fila.join(','))
    ].join('\n');
    
    // Crear CSV para platos más vendidos
    const cabecerasPlatos = ['Plato', 'Cantidad', 'Total (S/.)'];
    const filasPlatos = this.platosMasVendidos.map(item => [
      item.nombre,
      item.cantidad,
      item.total.toFixed(2)
    ]);
    
    const csvPlatos = [
      cabecerasPlatos.join(','),
      ...filasPlatos.map(fila => fila.join(','))
    ].join('\n');
    
    // Combinar ambos CSVs
    const csvCompleto = 
      'VENTAS POR DÍA\n' + 
      csvVentas + 
      '\n\nPLATOS MÁS VENDIDOS\n' + 
      csvPlatos;
    
    // Crear y descargar el archivo
    const blob = new Blob([csvCompleto], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `productividad_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}