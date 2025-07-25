// catalog-admin.js - standalone admin page for catalog

// ----- Dark mode -----
const darkBtn = document.getElementById('toggleDarkMode');
if (darkBtn) {
  const pref = localStorage.getItem('darkMode');
  if (pref === '1') document.body.classList.add('dark-mode');
  darkBtn.onclick = () => {
    const active = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', active ? '1' : '0');
  };
}

const catalogo = {
  menu:         { nombre: "Menú", precio: 13 },
  sopa:         { nombre: "Sopa", precio: 6 },
  taper:        { nombre: "Taper (para llevar/delivery)", precio: 1 },
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
    { nombre: "Papa frita", precio: 7 },
    { nombre: "Arroz", precio: 3 }
  ]
};

let catalogoArray = JSON.parse(localStorage.getItem('catalogoCustom') || 'null');
let catalogoNextId = 1;
if (!catalogoArray) {
  catalogoArray = [];
  let _id = 1;
  for (const key in catalogo) {
    if (Array.isArray(catalogo[key])) {
      catalogo[key].forEach(prod => catalogoArray.push({ ...prod, id: _id++, categoria: key }));
    } else if (typeof catalogo[key] === 'object') {
      catalogoArray.push({ ...catalogo[key], id: _id++, categoria: key });
    }
  }
  catalogoNextId = _id;
  localStorage.setItem('catalogoCustom', JSON.stringify(catalogoArray));
} else {
  catalogoNextId = catalogoArray.reduce((m,p)=>Math.max(m,p.id),0) + 1;
}

function guardarCatalogo() {
  localStorage.setItem('catalogoCustom', JSON.stringify(catalogoArray));
}

function renderCatalogoAdmin() {
  const tbody = document.getElementById('catalogoBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  catalogoArray.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="cat-nombre" data-id="${item.id}" value="${item.nombre}"></td>
      <td><input type="number" step="0.01" class="cat-precio" data-id="${item.id}" value="${item.precio}"></td>
      <td><button class="btn-secondary btn-sm" data-id="${item.id}">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.cat-nombre').forEach(inp => {
    inp.onchange = e => {
      const id = parseInt(e.target.dataset.id);
      const prod = catalogoArray.find(p=>p.id===id);
      if (prod) prod.nombre = e.target.value.trim();
      guardarCatalogo();
    };
  });
  tbody.querySelectorAll('.cat-precio').forEach(inp => {
    inp.onchange = e => {
      const id = parseInt(e.target.dataset.id);
      const prod = catalogoArray.find(p=>p.id===id);
      if (prod) prod.precio = parseFloat(e.target.value) || 0;
      guardarCatalogo();
    };
  });
  tbody.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id);
      catalogoArray = catalogoArray.filter(p=>p.id!==id);
      guardarCatalogo();
      renderCatalogoAdmin();
    };
  });
}

document.getElementById('formNuevoProd').onsubmit = e => {
  e.preventDefault();
  const nombre = document.getElementById('nuevoNombre').value.trim();
  const precio = parseFloat(document.getElementById('nuevoPrecio').value);
  if (!nombre || isNaN(precio)) return;
  catalogoArray.push({id: catalogoNextId++, nombre, precio, categoria:'custom'});
  document.getElementById('nuevoNombre').value='';
  document.getElementById('nuevoPrecio').value='';
  guardarCatalogo();
  renderCatalogoAdmin();
};

renderCatalogoAdmin();
