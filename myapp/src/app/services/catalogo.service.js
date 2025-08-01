import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  catalogo = {
    menu: { nombre: "Menú", precio: 13 },
    sopa: { nombre: "Sopa", precio: 6 },
    taper: { nombre: "Taper (para llevar/delivery)", precio: 1 },
    ceviches: [
      { nombre: "Ceviche de pescado", precio: 17 },
      { nombre: "Ceviche mixto", precio: 24 },
      { nombre: "Leche de tigre", precio: 19 },
      { nombre: "Ceviche + chicharrón de pota", precio: 20 }
    ],
    chicharrones: [
      { nombre: "Chicharrón de pota", precio: 28 },
      { nombre: "Chicharrón de pescado", precio: 26 },
      { nombre: "Chicharrón de langostino", precio: 28 },
      { nombre: "Chicharrón de calamar", precio: 27 },
      { nombre: "Chicharrón de trucha", precio: 26 },
      { nombre: "Jalea mixta real", precio: 32 },
      { nombre: "Jalea de pescado", precio: 28 }
    ],
    arroces: [
      { nombre: "Arroz con mariscos", precio: 19 },
      { nombre: "Arroz chaufa de pescado", precio: 17 },
      { nombre: "Chaufa de mariscos", precio: 19 },
      { nombre: "Chaufa mixto", precio: 21 },
      { nombre: "Arroz tapado de pescado", precio: 15 }
    ],
    sudados: [
      { nombre: "Sudado de pescado", precio: 20 },
      { nombre: "Parihuela", precio: 24 }
    ],
    sopas: [
      { nombre: "Sopa especial", precio: 10 },
      { nombre: "Aguadito", precio: 8 }
    ],
    bebidas: [
      { nombre: "Gaseosa personal", precio: 5 },
      { nombre: "Gaseosa litro", precio: 10 },
      { nombre: "Cerveza personal", precio: 8 },
      { nombre: "Cerveza grande", precio: 16 },
      { nombre: "Chicha morada vaso", precio: 3 },
      { nombre: "Chicha morada jarra", precio: 12 },
      { nombre: "Agua", precio: 2 }
    ],
    agregados: [
      { nombre: "Yuca frita", precio: 7 },
      { nombre: "Camote frito", precio: 5 },
      { nombre: "Porción de arroz", precio: 3 },
      { nombre: "Porción de papa", precio: 3 },
      { nombre: "Porción de chifles", precio: 3 },
      { nombre: "Porción de cancha", precio: 2 }
    ]
  };

  constructor() {
    // Intentar cargar catálogo desde localStorage
    const catalogoGuardado = localStorage.getItem('catalogo');
    if (catalogoGuardado) {
      try {
        this.catalogo = JSON.parse(catalogoGuardado);
      } catch (e) {
        console.error('Error al cargar catálogo:', e);
      }
    }
  }

  getCatalogo() {
    return this.catalogo;
  }

  guardarCatalogo(catalogo) {
    this.catalogo = catalogo;
    localStorage.setItem('catalogo', JSON.stringify(catalogo));
  }

  actualizarCategoria(categoria, items) {
    this.catalogo[categoria] = items;
    this.guardarCatalogo(this.catalogo);
  }

  agregarItem(categoria, item) {
    if (!this.catalogo[categoria]) {
      this.catalogo[categoria] = [];
    }
    
    if (Array.isArray(this.catalogo[categoria])) {
      this.catalogo[categoria].push(item);
    } else {
      this.catalogo[categoria] = item;
    }
    
    this.guardarCatalogo(this.catalogo);
  }

  eliminarItem(categoria, index) {
    if (Array.isArray(this.catalogo[categoria]) && index >= 0 && index < this.catalogo[categoria].length) {
      this.catalogo[categoria].splice(index, 1);
      this.guardarCatalogo(this.catalogo);
    }
  }

  actualizarItem(categoria, index, item) {
    if (Array.isArray(this.catalogo[categoria]) && index >= 0 && index < this.catalogo[categoria].length) {
      this.catalogo[categoria][index] = item;
      this.guardarCatalogo(this.catalogo);
    } else if (!Array.isArray(this.catalogo[categoria])) {
      this.catalogo[categoria] = item;
      this.guardarCatalogo(this.catalogo);
    }
  }
}