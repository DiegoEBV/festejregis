import { Injectable } from '@angular/core';
import Dexie from 'dexie';

@Injectable({
  providedIn: 'root'
})
export class DexieService extends Dexie {
  productos: Dexie.Table<any, number>;
  mesas: Dexie.Table<any, number>;
  pedidos: Dexie.Table<any, number>;
  pedidosEspeciales: Dexie.Table<any, number>;
  historialPagos: Dexie.Table<any, number>;
  caja: Dexie.Table<any, number>;

  constructor() {
    super('FestejosBD');

    // Definición de esquemas
    this.version(1).stores({
      productos: '++id, nombre, categoria, precio, disponible',
      mesas: '++id, numero, estado, pedidos, total',
      pedidos: '++id, idMesa, productos, estado, fecha',
      pedidosEspeciales: '++id, tipo, cliente, productos, estado, metodoPago, total, fecha',
      historialPagos: '++id, fecha, tipo, metodoPago, total, detalle',
      caja: '++id, fecha, montoInicial, efectivo, yape, tarjeta, total, ganancia'
    });

    // Inicialización de tablas
    this.productos = this.table('productos');
    this.mesas = this.table('mesas');
    this.pedidos = this.table('pedidos');
    this.pedidosEspeciales = this.table('pedidosEspeciales');
    this.historialPagos = this.table('historialPagos');
    this.caja = this.table('caja');
  }

  // Métodos para productos
  async getProductos() {
    return await this.productos.toArray();
  }

  async getProductosPorCategoria(categoria: string) {
    return await this.productos.where('categoria').equals(categoria).toArray();
  }

  async agregarProducto(producto: any) {
    // Verificar si ya existe un producto con el mismo nombre y categoría (case-insensitive)
    const normalizedNombre = producto.nombre.trim().toLowerCase();

    // Obtener productos de la misma categoría para comparar en memoria (más seguro para case-insensitive)
    const productosCategoria = await this.productos
      .where('categoria')
      .equals(producto.categoria)
      .toArray();

    const existente = productosCategoria.find(p =>
      p.nombre.trim().toLowerCase() === normalizedNombre
    );

    if (existente) {
      console.log(`Producto ya existe: ${producto.nombre} en categoría ${producto.categoria}`);
      return existente.id; // Retornar el ID del producto existente
    }

    return await this.productos.add(producto);
  }

  async actualizarProducto(id: number, producto: any) {
    return await this.productos.update(id, producto);
  }

  async eliminarProducto(id: number) {
    return await this.productos.delete(id);
  }

  // Métodos para mesas
  async getMesas() {
    return await this.mesas.toArray();
  }

  async getMesa(id: number) {
    return await this.mesas.get(id);
  }

  async agregarMesa(mesa: any) {
    return await this.mesas.add(mesa);
  }

  async actualizarMesa(id: number, mesa: any) {
    return await this.mesas.update(id, mesa);
  }

  async eliminarMesa(id: number) {
    return await this.mesas.delete(id);
  }

  // Métodos para pedidos
  async getPedidos() {
    return await this.pedidos.toArray();
  }

  async getPedidosPorMesa(idMesa: number) {
    return await this.pedidos.where('idMesa').equals(idMesa).toArray();
  }

  async getPedidosPorFecha(fecha: string) {
    return await this.pedidos.where('fecha').equals(fecha).toArray();
  }

  async getPedidosPagados() {
    return await this.pedidos.where('estado').equals('pagado').toArray();
  }

  async getPedidoPorId(id: number) {
    return await this.pedidos.get(id);
  }

  async getPedidoEspecialPorId(id: number) {
    return await this.pedidosEspeciales.get(id);
  }

  async agregarPedido(pedido: any) {
    return await this.pedidos.add(pedido);
  }

  async actualizarPedido(id: number, pedido: any) {
    return await this.pedidos.update(id, pedido);
  }

  async eliminarPedido(id: number) {
    return await this.pedidos.delete(id);
  }

  async abonarPedido(id: number, abono: number, tipoPago: string, productosPagados: { index: number, cantidad: number }[] = []) {
    const pedido = await this.pedidos.get(id);
    if (pedido) {
      const nuevoPagado = (pedido.pagado || 0) + abono;
      // Se considera pagado si el monto pagado es mayor o igual al total (con margen de error pequeño por decimales)
      const nuevoEstado = nuevoPagado >= (pedido.monto - 0.01) ? 'pagado' : 'parcial';

      // Actualizar estado de los productos pagados
      let productosActualizados = pedido.productos;
      if (productosPagados.length > 0 && pedido.productos) {
        productosActualizados = pedido.productos.map((prod: any, index: number) => {
          const pagoInfo = productosPagados.find(p => p.index === index);
          if (pagoInfo) {
            const nuevaCantidadPagada = (prod.cantidadPagada || 0) + pagoInfo.cantidad;
            const estaPagado = nuevaCantidadPagada >= prod.cantidad;
            return {
              ...prod,
              cantidadPagada: nuevaCantidadPagada,
              pagado: estaPagado
            };
          }
          return prod;
        });
      }

      // Crear el nuevo abono
      const nuevoAbono = {
        monto: abono,
        tipo_pago: tipoPago,
        fecha: new Date().toISOString(),
        productosPagados: productosPagados // Guardar detalle de qué se pagó y cuánto
      };

      // Agregar el abono al array de abonos del pedido
      const abonosActuales = pedido.abonos || [];
      abonosActuales.push(nuevoAbono);

      await this.pedidos.update(id, {
        pagado: nuevoPagado,
        estado: nuevoEstado,
        metodoPago: tipoPago,
        abonos: abonosActuales,
        productos: productosActualizados
      });

      // Agregar al historial de pagos con la estructura correcta
      // Calculamos el detalle de items para el historial basado en lo que se pagó ahora
      const itemsHistorial = productosPagados.map(p => {
        const prodOriginal = pedido.productos[p.index];
        return {
          nombre: prodOriginal.nombre,
          cantidad: p.cantidad,
          precio: prodOriginal.precio,
          total: p.cantidad * prodOriginal.precio
        };
      });

      const historialData = {
        pedidoId: id,
        tipo: pedido.tipo || 'mesa',
        numero: pedido.mesa,
        total: abono,
        metodoPago: tipoPago,
        fecha: new Date().toISOString(),
        items: itemsHistorial.length > 0 ? itemsHistorial : (pedido.productos || [])
      };

      console.log('DEBUG - Guardando en historial:', historialData);
      await this.agregarHistorialPago(historialData);
      console.log('DEBUG - Historial guardado exitosamente');
    }
  }

  async anularPedido(id: number) {
    return await this.pedidos.update(id, {
      estado: 'anulado',
      fechaAnulacion: new Date().toISOString()
    });
  }

  // Métodos para pedidos especiales (para llevar, delivery)
  async getPedidosEspeciales() {
    return await this.pedidosEspeciales.toArray();
  }

  async getPedidosEspecialesPorTipo(tipo: string) {
    return await this.pedidosEspeciales.where('tipo').equals(tipo).toArray();
  }

  async agregarPedidoEspecial(pedido: any) {
    return await this.pedidosEspeciales.add(pedido);
  }

  async actualizarPedidoEspecial(id: number, pedido: any) {
    return await this.pedidosEspeciales.update(id, pedido);
  }

  async abonarPedidoEspecial(id: number, abono: number, tipoPago: string) {
    const pedido = await this.pedidosEspeciales.get(id);
    if (pedido) {
      const nuevoPagado = (pedido.pagado || 0) + abono;
      const nuevoEstado = nuevoPagado >= pedido.monto ? 'pagado' : 'parcial';

      // Crear el nuevo abono
      const nuevoAbono = {
        monto: abono,
        tipo_pago: tipoPago,
        fecha: new Date().toISOString()
      };

      // Agregar el abono al array de abonos del pedido
      const abonosActuales = pedido.abonos || [];
      abonosActuales.push(nuevoAbono);

      await this.pedidosEspeciales.update(id, {
        pagado: nuevoPagado,
        estado: nuevoEstado,
        metodoPago: tipoPago,
        abonos: abonosActuales
      });

      // Agregar al historial de pagos con la estructura correcta
      const historialDataEspecial = {
        pedidoId: id,
        tipo: pedido.tipo,
        numero: pedido.cliente,
        total: abono,
        metodoPago: tipoPago,
        fecha: new Date().toISOString(),
        items: []
      };

      console.log('DEBUG - Guardando pedido especial en historial:', historialDataEspecial);
      await this.agregarHistorialPago(historialDataEspecial);
      console.log('DEBUG - Pedido especial guardado exitosamente en historial');
    }
  }

  async eliminarPedidoEspecial(id: number) {
    return await this.pedidosEspeciales.delete(id);
  }

  async anularPedidoEspecial(id: number) {
    return await this.pedidosEspeciales.update(id, { estado: 'anulado' });
  }

  // Métodos para historial de pagos
  async getHistorialPagos() {
    return await this.historialPagos.toArray();
  }

  async getHistorialPagosPorFecha(fechaInicio: string, fechaFin: string) {
    return await this.historialPagos
      .where('fecha')
      .between(fechaInicio, fechaFin, true, true)
      .toArray();
  }

  async agregarHistorialPago(pago: any) {
    return await this.historialPagos.add(pago);
  }

  // Métodos para caja
  async getCajaActual() {
    const fecha = new Date().toISOString().split('T')[0];
    return await this.caja.where('fecha').equals(fecha).first();
  }

  async getCajaPorFecha(fecha: string) {
    return await this.caja.where('fecha').equals(fecha).first();
  }

  async getCajaPorRango(fechaInicio: string, fechaFin: string) {
    return await this.caja
      .where('fecha')
      .between(fechaInicio, fechaFin, true, true)
      .toArray();
  }

  async iniciarCaja(cajaInicial: any) {
    return await this.caja.add(cajaInicial);
  }

  async actualizarCaja(id: number, caja: any) {
    return await this.caja.update(id, caja);
  }

  async getTotalesPorMetodoPago() {
    const hoy = new Date().toISOString().split('T')[0];
    const pedidosPagados = await this.pedidos.where('fecha').equals(hoy).and(p => p.estado === 'pagado').toArray();
    const pedidosEspecialesPagados = await this.pedidosEspeciales.where('fecha').equals(hoy).and(p => p.estado === 'pagado').toArray();

    let efectivo = 0, yape = 0, tarjeta = 0;

    [...pedidosPagados, ...pedidosEspecialesPagados].forEach(pedido => {
      if (pedido.metodoPago === 'efectivo') {
        efectivo += pedido.total || 0;
      } else if (pedido.metodoPago === 'yape') {
        yape += pedido.total || 0;
      } else if (pedido.metodoPago === 'tarjeta') {
        tarjeta += pedido.total || 0;
      }
    });

    return { efectivo, yape, tarjeta };
  }

  // Métodos para cierre automático de caja
  async cerrarCajaAutomatico(fecha: string) {
    try {
      // Obtener la caja del día
      const cajaDelDia = await this.getCajaPorFecha(fecha);
      if (!cajaDelDia) {
        console.log('No hay caja para cerrar en la fecha:', fecha);
        return null;
      }

      // Calcular totales del día
      const totales = await this.getTotalesPorMetodoPagoFecha(fecha);
      const totalVentas = totales.efectivo + totales.yape + totales.tarjeta;
      const ganancia = totalVentas - (cajaDelDia.montoInicial || 0);

      // Actualizar la caja con el cierre
      const cierreCaja = {
        ...cajaDelDia,
        efectivo: totales.efectivo,
        yape: totales.yape,
        tarjeta: totales.tarjeta,
        total: totalVentas,
        ganancia: ganancia,
        fechaCierre: new Date().toISOString(),
        cerrada: true
      };

      await this.actualizarCaja(cajaDelDia.id, cierreCaja);

      console.log('Caja cerrada automáticamente:', {
        fecha,
        totalVentas,
        ganancia,
        efectivo: totales.efectivo,
        yape: totales.yape,
        tarjeta: totales.tarjeta
      });

      return cierreCaja;
    } catch (error) {
      console.error('Error al cerrar caja automáticamente:', error);
      return null;
    }
  }

  async getTotalesPorMetodoPagoFecha(fecha: string) {
    const pedidosPagados = await this.pedidos.where('fecha').equals(fecha).and(p => p.estado === 'pagado').toArray();
    const pedidosEspecialesPagados = await this.pedidosEspeciales.where('fecha').equals(fecha).and(p => p.estado === 'pagado').toArray();

    let efectivo = 0, yape = 0, tarjeta = 0;

    [...pedidosPagados, ...pedidosEspecialesPagados].forEach(pedido => {
      if (pedido.metodoPago === 'efectivo') {
        efectivo += pedido.total || 0;
      } else if (pedido.metodoPago === 'yape') {
        yape += pedido.total || 0;
      } else if (pedido.metodoPago === 'tarjeta') {
        tarjeta += pedido.total || 0;
      }
    });

    return { efectivo, yape, tarjeta };
  }

  async verificarCajaCerrada(fecha: string) {
    const caja = await this.getCajaPorFecha(fecha);
    return caja ? caja.cerrada === true : false;
  }

  // Métodos para exportar/importar base de datos
  async exportarDB() {
    const data = {
      productos: await this.productos.toArray(),
      mesas: await this.mesas.toArray(),
      pedidos: await this.pedidos.toArray(),
      pedidosEspeciales: await this.pedidosEspeciales.toArray(),
      historialPagos: await this.historialPagos.toArray(),
      caja: await this.caja.toArray()
    };
    return JSON.stringify(data);
  }

  async importarDB(data: string) {
    try {
      const db = JSON.parse(data);

      // Limpiar tablas existentes
      await this.limpiarDB();

      // Importar datos
      if (db.productos && db.productos.length) {
        await this.productos.bulkAdd(db.productos);
      }
      if (db.mesas && db.mesas.length) {
        await this.mesas.bulkAdd(db.mesas);
      }
      if (db.pedidos && db.pedidos.length) {
        await this.pedidos.bulkAdd(db.pedidos);
      }
      if (db.pedidosEspeciales && db.pedidosEspeciales.length) {
        await this.pedidosEspeciales.bulkAdd(db.pedidosEspeciales);
      }
      if (db.historialPagos && db.historialPagos.length) {
        await this.historialPagos.bulkAdd(db.historialPagos);
      }
      if (db.caja && db.caja.length) {
        await this.caja.bulkAdd(db.caja);
      }

      return true;
    } catch (error) {
      console.error('Error al importar la base de datos:', error);
      return false;
    }
  }

  async limpiarDB() {
    await this.productos.clear();
    await this.mesas.clear();
    await this.pedidos.clear();
    await this.pedidosEspeciales.clear();
    await this.historialPagos.clear();
    await this.caja.clear();
    return true;
  }
}