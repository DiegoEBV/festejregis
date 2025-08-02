import { Injectable } from '@angular/core';
import { DexieService } from './dexie.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  // Categorías predefinidas del sistema original
  categorias = [
    { id: 'menu', nombre: 'Menú', icono: '🍽️' },
    { id: 'sopa', nombre: 'Sopa', icono: '🍲' },
    { id: 'taper', nombre: 'Taper', icono: '📦' },
    { id: 'ceviches', nombre: 'Ceviches', icono: '🐟' },
    { id: 'chicharrones', nombre: 'Chicharrones', icono: '🍤' },
    { id: 'arroces', nombre: 'Arroces', icono: '🍚' },
    { id: 'sudados', nombre: 'Sudados', icono: '🍲' },
    { id: 'sopas', nombre: 'Sopas', icono: '🥣' },
    { id: 'bebidas', nombre: 'Bebidas', icono: '🥤' },
    { id: 'agregados', nombre: 'Agregados', icono: '🍟' }
  ];

  // Productos predefinidos por categoría (catálogo completo actualizado)
  productos = {
    menu: [
      { id: 1, nombre: 'Menú', precio: 13.00, categoria: 'menu', disponible: true }
    ],
    sopa: [
      { id: 2, nombre: 'Sopa', precio: 6.00, categoria: 'sopa', disponible: true }
    ],
    taper: [
      { id: 3, nombre: 'Taper (para llevar/delivery)', precio: 1.00, categoria: 'taper', disponible: true }
    ],
    ceviches: [
      { id: 4, nombre: 'Ceviche de pescado', precio: 17.00, categoria: 'ceviches', disponible: true },
      { id: 5, nombre: 'Ceviche mixto', precio: 24.00, categoria: 'ceviches', disponible: true },
      { id: 6, nombre: 'Leche de tigre', precio: 19.00, categoria: 'ceviches', disponible: true },
      { id: 7, nombre: 'Ceviche + chicharrón de pota', precio: 20.00, categoria: 'ceviches', disponible: true }
    ],
    chicharrones: [
      { id: 8, nombre: 'Chicharrón de pota', precio: 28.00, categoria: 'chicharrones', disponible: true },
      { id: 9, nombre: 'Chicharrón de pescado', precio: 26.00, categoria: 'chicharrones', disponible: true },
      { id: 10, nombre: 'Chicharrón de langostino', precio: 28.00, categoria: 'chicharrones', disponible: true },
      { id: 11, nombre: 'Chicharrón de calamar', precio: 27.00, categoria: 'chicharrones', disponible: true },
      { id: 12, nombre: 'Chicharrón de trucha', precio: 26.00, categoria: 'chicharrones', disponible: true },
      { id: 13, nombre: 'Jalea mixta real', precio: 32.00, categoria: 'chicharrones', disponible: true },
      { id: 14, nombre: 'Jalea de pescado', precio: 28.00, categoria: 'chicharrones', disponible: true }
    ],
    arroces: [
      { id: 15, nombre: 'Arroz con mariscos', precio: 19.00, categoria: 'arroces', disponible: true },
      { id: 16, nombre: 'Arroz chaufa de pescado', precio: 17.00, categoria: 'arroces', disponible: true },
      { id: 17, nombre: 'Chaufa de mariscos', precio: 19.00, categoria: 'arroces', disponible: true },
      { id: 18, nombre: 'Chaufa mixto', precio: 21.00, categoria: 'arroces', disponible: true },
      { id: 19, nombre: 'Arroz tapado de pescado', precio: 15.00, categoria: 'arroces', disponible: true }
    ],
    sudados: [
      { id: 20, nombre: 'Sudado de pescado', precio: 20.00, categoria: 'sudados', disponible: true },
      { id: 21, nombre: 'Parihuela', precio: 24.00, categoria: 'sudados', disponible: true }
    ],
    sopas: [
      { id: 22, nombre: 'Sopa especial', precio: 10.00, categoria: 'sopas', disponible: true },
      { id: 23, nombre: 'Aguadito', precio: 8.00, categoria: 'sopas', disponible: true }
    ],
    bebidas: [
      { id: 24, nombre: 'Gaseosa personal', precio: 5.00, categoria: 'bebidas', disponible: true },
      { id: 25, nombre: 'Gaseosa litro', precio: 10.00, categoria: 'bebidas', disponible: true },
      { id: 26, nombre: 'Cerveza personal', precio: 8.00, categoria: 'bebidas', disponible: true },
      { id: 27, nombre: 'Cerveza grande', precio: 16.00, categoria: 'bebidas', disponible: true },
      { id: 28, nombre: 'Chicha morada vaso', precio: 3.00, categoria: 'bebidas', disponible: true },
      { id: 29, nombre: 'Chicha morada jarra', precio: 12.00, categoria: 'bebidas', disponible: true },
      { id: 30, nombre: 'Agua', precio: 2.00, categoria: 'bebidas', disponible: true }
    ],
    agregados: [
      { id: 31, nombre: 'Yuca frita', precio: 7.00, categoria: 'agregados', disponible: true },
      { id: 32, nombre: 'Papa frita', precio: 7.00, categoria: 'agregados', disponible: true },
      { id: 33, nombre: 'Arroz', precio: 3.00, categoria: 'agregados', disponible: true }
    ]
  };

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

  // Inicializar productos completos del catálogo
  async inicializarProductosEjemplo() {
    const productos = await this.getProductos();
    
    if (productos.length === 0) {
      const catalogoCompleto = [
        // Menú
        { nombre: 'Menú', categoria: 'menu', precio: 13, disponible: true },
        
        // Sopa
        { nombre: 'Sopa', categoria: 'sopa', precio: 6, disponible: true },
        
        // Taper
        { nombre: 'Taper (para llevar/delivery)', categoria: 'taper', precio: 1, disponible: true },
        
        // Ceviches
        { nombre: 'Ceviche de pescado', categoria: 'ceviches', precio: 17, disponible: true },
        { nombre: 'Ceviche mixto', categoria: 'ceviches', precio: 24, disponible: true },
        { nombre: 'Leche de tigre', categoria: 'ceviches', precio: 19, disponible: true },
        { nombre: 'Ceviche + chicharrón de pota', categoria: 'ceviches', precio: 20, disponible: true },
        
        // Chicharrones
        { nombre: 'Chicharrón de pota', categoria: 'chicharrones', precio: 28, disponible: true },
        { nombre: 'Chicharrón de pescado', categoria: 'chicharrones', precio: 26, disponible: true },
        { nombre: 'Chicharrón de langostino', categoria: 'chicharrones', precio: 28, disponible: true },
        { nombre: 'Chicharrón de calamar', categoria: 'chicharrones', precio: 27, disponible: true },
        { nombre: 'Chicharrón de trucha', categoria: 'chicharrones', precio: 26, disponible: true },
        { nombre: 'Jalea mixta real', categoria: 'chicharrones', precio: 32, disponible: true },
        { nombre: 'Jalea de pescado', categoria: 'chicharrones', precio: 28, disponible: true },
        
        // Arroces
        { nombre: 'Arroz con mariscos', categoria: 'arroces', precio: 19, disponible: true },
        { nombre: 'Arroz chaufa de pescado', categoria: 'arroces', precio: 17, disponible: true },
        { nombre: 'Chaufa de mariscos', categoria: 'arroces', precio: 19, disponible: true },
        { nombre: 'Chaufa mixto', categoria: 'arroces', precio: 21, disponible: true },
        { nombre: 'Arroz tapado de pescado', categoria: 'arroces', precio: 15, disponible: true },
        
        // Sudados
        { nombre: 'Sudado de pescado', categoria: 'sudados', precio: 20, disponible: true },
        { nombre: 'Parihuela', categoria: 'sudados', precio: 24, disponible: true },
        
        // Sopas
        { nombre: 'Sopa especial', categoria: 'sopas', precio: 10, disponible: true },
        { nombre: 'Aguadito', categoria: 'sopas', precio: 8, disponible: true },
        
        // Bebidas
        { nombre: 'Gaseosa personal', categoria: 'bebidas', precio: 5, disponible: true },
        { nombre: 'Gaseosa litro', categoria: 'bebidas', precio: 10, disponible: true },
        { nombre: 'Cerveza personal', categoria: 'bebidas', precio: 8, disponible: true },
        { nombre: 'Cerveza grande', categoria: 'bebidas', precio: 16, disponible: true },
        { nombre: 'Chicha morada vaso', categoria: 'bebidas', precio: 3, disponible: true },
        { nombre: 'Chicha morada jarra', categoria: 'bebidas', precio: 12, disponible: true },
        { nombre: 'Agua', categoria: 'bebidas', precio: 2, disponible: true },
        
        // Agregados
        { nombre: 'Yuca frita', categoria: 'agregados', precio: 7, disponible: true },
        { nombre: 'Papa frita', categoria: 'agregados', precio: 7, disponible: true },
        { nombre: 'Arroz', categoria: 'agregados', precio: 3, disponible: true }
      ];
      
      for (const producto of catalogoCompleto) {
        await this.agregarProducto(producto);
      }
      
      return true;
    }
    
    return false;
  }
}