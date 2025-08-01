import { Injectable } from '@angular/core';
import { DexieService } from './dexie.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  // Categorías predefinidas
  categorias = [
    { id: 'platos', nombre: 'Platos', icono: '🍽️' },
    { id: 'bebidas', nombre: 'Bebidas', icono: '🥤' },
    { id: 'postres', nombre: 'Postres', icono: '🍰' },
    { id: 'adicionales', nombre: 'Adicionales', icono: '🍟' }
  ];

  constructor(private dexieService: DexieService) {}

  // Obtener todas las categorías
  getCategorias() {
    return this.categorias;
  }

  // Obtener todos los productos
  async getProductos() {
    return await this.dexieService.getProductos();
  }

  // Obtener productos por categoría
  async getProductosPorCategoria(categoria: string) {
    return await this.dexieService.getProductosPorCategoria(categoria);
  }

  // Agregar un nuevo producto
  async agregarProducto(producto: any) {
    // Asegurarse de que el producto tenga los campos necesarios
    const nuevoProducto = {
      nombre: producto.nombre,
      categoria: producto.categoria,
      precio: parseFloat(producto.precio),
      disponible: producto.disponible !== undefined ? producto.disponible : true,
      imagen: producto.imagen || ''
    };
    
    return await this.dexieService.agregarProducto(nuevoProducto);
  }

  // Actualizar un producto existente
  async actualizarProducto(id: number, producto: any) {
    // Asegurarse de que el producto tenga los campos necesarios
    const productoActualizado = {
      nombre: producto.nombre,
      categoria: producto.categoria,
      precio: parseFloat(producto.precio),
      disponible: producto.disponible !== undefined ? producto.disponible : true,
      imagen: producto.imagen || ''
    };
    
    return await this.dexieService.actualizarProducto(id, productoActualizado);
  }

  // Eliminar un producto
  async eliminarProducto(id: number) {
    return await this.dexieService.eliminarProducto(id);
  }

  // Cambiar disponibilidad de un producto
  async cambiarDisponibilidad(id: number, disponible: boolean) {
    return await this.dexieService.actualizarProducto(id, { disponible });
  }

  // Inicializar productos de ejemplo si no hay productos
  async inicializarProductosEjemplo() {
    const productos = await this.getProductos();
    
    if (productos.length === 0) {
      const productosEjemplo = [
        { nombre: 'Lomo Saltado', categoria: 'platos', precio: 25, disponible: true },
        { nombre: 'Ají de Gallina', categoria: 'platos', precio: 22, disponible: true },
        { nombre: 'Ceviche', categoria: 'platos', precio: 28, disponible: true },
        { nombre: 'Arroz con Pollo', categoria: 'platos', precio: 20, disponible: true },
        { nombre: 'Gaseosa', categoria: 'bebidas', precio: 5, disponible: true },
        { nombre: 'Agua', categoria: 'bebidas', precio: 3, disponible: true },
        { nombre: 'Chicha Morada', categoria: 'bebidas', precio: 7, disponible: true },
        { nombre: 'Helado', categoria: 'postres', precio: 8, disponible: true },
        { nombre: 'Mazamorra', categoria: 'postres', precio: 7, disponible: true },
        { nombre: 'Papas Fritas', categoria: 'adicionales', precio: 10, disponible: true }
      ];
      
      for (const producto of productosEjemplo) {
        await this.agregarProducto(producto);
      }
      
      return true;
    }
    
    return false;
  }
}