// Claves simples para ejemplo. Cambia a gusto.
const USUARIOS = {
  caja:   { clave: "1234" },
  moso:   { clave: "moso" },
  cocina: { clave: "cocina" }
};

let usuarioActual = null;        // "caja" o "moso"
let nombreMosoActual = null;     // nombre/alias del moso actual

// ----- Modo oscuro -----
const darkBtn = document.getElementById('toggleDarkMode');
if (darkBtn) {
  const pref = localStorage.getItem('darkMode');
  if (pref === '1') document.body.classList.add('dark-mode');
  darkBtn.onclick = () => {
    const active = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', active ? '1' : '0');
  };
}

// Mostrar/ocultar campo nombre moso según selección
const usuarioSelect = document.getElementById('usuario');
const nombreMosoBox = document.getElementById('nombreMosoBox');
const nombreMosoInput = document.getElementById('nombreMoso');
usuarioSelect.addEventListener('change', function() {
    if (usuarioSelect.value === 'moso') {
        nombreMosoBox.style.display = 'block';
        nombreMosoInput.required = true;
    } else {
        nombreMosoBox.style.display = 'none';
        nombreMosoInput.required = false;
        nombreMosoInput.value = '';
    }
});


// LOGIN
function mostrarLogin() {
  document.getElementById('loginModal').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('btnCambiarUsuario').style.display = 'none';
}
function ocultarLogin() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('btnCambiarUsuario').style.display = 'block';
  configurarUIporUsuario();
}

document.getElementById('loginForm').onsubmit = function(e) {
  e.preventDefault();
  const usuario = document.getElementById('usuario').value;
  const clave = document.getElementById('clave').value;
  if (usuario === 'moso') {
      let nombre = nombreMosoInput.value.trim();
      if (!nombre) {
        alert('Ingrese el nombre del moso.');
        nombreMosoInput.focus();
        return;
      }
      nombreMosoActual = nombre;
  } else {
      nombreMosoActual = null;
  }
    if (USUARIOS[usuario] && clave === USUARIOS[usuario].clave) {
        usuarioActual = usuario;
        if (usuario === 'moso') {
            nombreMosoActual = nombreMosoInput.value.trim();
            localStorage.setItem('nombreMosoActual', nombreMosoActual);
        } else {
            nombreMosoActual = null;
            localStorage.removeItem('nombreMosoActual');
        }
        // Guarda usuario logueado
        localStorage.setItem('usuarioActual', usuarioActual);

        ocultarLogin();
        initApp();
        document.getElementById('clave').value = "";
        if(usuarioActual === "cocina") activarAutoUpdateCocina();
        else if(cocinaInterval) clearInterval(cocinaInterval);
    } else {
        alert("Usuario o clave incorrecta.");
        document.getElementById('clave').value = "";
    }

};


// Permite cambiar usuario con botón
document.getElementById('btnCambiarUsuario').onclick = function() {
    usuarioActual = null;
    nombreMosoActual = null;
    localStorage.removeItem('usuarioActual');
    localStorage.removeItem('nombreMosoActual');
    mostrarLogin();
};


// Controla UI por rol
function configurarUIporUsuario() {
  const esCaja = usuarioActual === "caja";
  const esMoso = usuarioActual === "moso";
  const esCocina = usuarioActual === "cocina";

  // Elementos solo para caja
  document.querySelectorAll('.solo-caja').forEach(el => el.style.display = esCaja ? '' : 'none');
  const catalogAdmin = document.getElementById('catalogAdmin');
  if (catalogAdmin) catalogAdmin.style.display = esCaja ? '' : 'none';
  // Pedidos especiales (solo caja)
  document.querySelectorAll('.pedido-especial-box').forEach(el => el.style.display = esCaja ? '' : 'none');
  // Solo mosos (si tienes)
  document.querySelectorAll('.solo-moso').forEach(el => el.style.display = esMoso ? '' : 'none');
  // Mostrar/ocultar la vista de cocina
  const vistaCocina = document.getElementById('vistaCocina');
  if (vistaCocina) vistaCocina.style.display = esCocina ? '' : 'none';
  // Oculta el resto de la app si es cocina (opcional, puedes mostrar solo la vista de cocina)
  document.getElementById('mainApp').style.display = esCocina ? 'none' : 'block';

  // Renderiza comandas si es cocina
  if (esCocina && typeof renderComandasCocina === "function") {
    renderComandasCocina();
    activarAutoUpdateCocina && activarAutoUpdateCocina();
  }
  if (esCaja) renderCatalogoAdmin();
}
let socket = null;

/*function conectarSocket(rol) {
    socket = io("http://localhost:4000"); // Cambia a tu IP/LAN si es necesario
    socket.emit("identificarse", rol);

    // Recibe eventos según el rol
    if (rol === 'caja') {
        socket.on('pedidoRecibido', pedido => {
            // Aquí actualizas la UI de caja en tiempo real
            showMessage("Nuevo pedido recibido: Mesa " + pedido.mesa);
            // ...actualiza tablas, etc.
        });
    }
    if (rol === 'moso') {
        socket.on('respuestaDeCaja', datos => {
            showMessage("Caja respondió: " + JSON.stringify(datos));
        });
    }
}*/


/* --------- Dexie DB setup --------- */

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

const db = new Dexie("FestejosDB");
db.version(3).stores({
    pedidos: "++id,fecha,hora,mesa,monto,tipo_pedido,tipo_pago,pagado,estado,timestamp,nombre,abonos",
    configuracion: "++id,fecha,caja_apertura,cerrada,fecha_cierre"
});

const TOTAL_MESAS = 27;
const MESA_ESTADOS = { LIBRE: 'libre', OCUPADA: 'ocupada', PARCIAL: 'parcial' };

async function initApp() {
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    setupEventListeners();
    setCurrentDate();
    await renderMesas();
    await updateStats();
    await updateResumenPagadosTable();
    await loadCajaApertura();
    await renderPedidosEspeciales();
}
function setCurrentDate() {
    const now = new Date();
    const dateString = now.toLocaleDateString('es-PE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('currentDate').textContent = dateString;
}
function showMessage(msg, type = 'success') {
    let msgDiv = document.createElement('div');
    msgDiv.className = type;
    // Usa innerHTML en vez de textContent para que acepte HTML
    msgDiv.innerHTML = msg;
    document.body.appendChild(msgDiv);
    setTimeout(() => { msgDiv.remove(); }, 3500);
}


async function cerrarCajaAnteriorSiCorresponde() {
    const hoy = (new Date()).toISOString().slice(0, 10);
    const ultimaCaja = await db.configuracion.orderBy('fecha').last();
    if (ultimaCaja && ultimaCaja.fecha !== hoy && !ultimaCaja.cerrada) {
        await db.configuracion.update(ultimaCaja.id, {
            cerrada: 1,
            fecha_cierre: hoy
        });
        showMessage('La caja del día ' + ultimaCaja.fecha + ' fue cerrada automáticamente.', 'success');
    }
}
// Parte 1: Datos adicionales
let mesasDivididas = {}; // Estructura: { 7: ['7A', '7B'], 12: ['12A', '12B'] }

// Parte 2: Funciones para dividir y unir mesas
function dividirMesa(baseNum) {
    mesasDivididas[baseNum] = [`${baseNum}A`, `${baseNum}B`];
    localStorage.setItem('mesasDivididas', JSON.stringify(mesasDivididas)); // <-- Guardar
    closeMesaModal();
    renderMesas();
}

function unirMesa(baseNum) {
    delete mesasDivididas[baseNum];
    localStorage.setItem('mesasDivididas', JSON.stringify(mesasDivididas)); // <-- Guardar
    closeMesaModal();
    renderMesas();
}
const savedMesasDivididas = localStorage.getItem('mesasDivididas');
if (savedMesasDivididas) {
    try {
        mesasDivididas = JSON.parse(savedMesasDivididas);
    } catch (e) {
        console.error("Error al leer mesas divididas:", e);
    }
}



/* ========== MESAS VISUAL GRID ========== */
async function renderMesas() {
    const cont = document.getElementById("mesasGrid");
    cont.innerHTML = "";

    const today = new Date().toISOString().split('T')[0];
    let pedidosArr = await db.pedidos.where("fecha").equals(today)
        .filter(p => p.estado !== 'anulado')
        .toArray();
    let pedidos = {};
    pedidosArr.forEach(p => {
        if (!pedidos[p.mesa]) pedidos[p.mesa] = [];
        pedidos[p.mesa].push(p);
    });

    for (let n = 1; n <= 27; n++) {
        if (mesasDivididas[n]) {
            for (const sub of mesasDivididas[n]) {
                let estado = MESA_ESTADOS.LIBRE, monto = 0, pagado = 0, idPedido = null;
                const mesaPedidos = pedidos[sub] || [];
                if (mesaPedidos.length > 0) {
                    const pedidoActivo = mesaPedidos.find(p => (p.monto > p.pagado));
                    if (pedidoActivo) {
                        estado = pedidoActivo.pagado === 0 ? MESA_ESTADOS.OCUPADA : MESA_ESTADOS.PARCIAL;
                        monto = pedidoActivo.monto;
                        pagado = pedidoActivo.pagado;
                        idPedido = pedidoActivo.id;
                    }
                }
                const btn = document.createElement("button");
                btn.className = 'mesa-btn ' + (estado === MESA_ESTADOS.LIBRE ? 'mesa-libre mesa-dividida' : estado === MESA_ESTADOS.OCUPADA ? 'mesa-ocupada mesa-dividida' : 'mesa-parcial mesa-dividida');
                btn.innerHTML = `<div class="mesa-num">M${sub}</div>`
                    + (estado !== MESA_ESTADOS.LIBRE ? `<span class="mesa-monto">S/ ${monto.toFixed(2)}<br><span style="font-size:0.9em">${pagado > 0 ? `Pagado: S/ ${pagado.toFixed(2)}` : ''}</span></span>` : '');
                btn.onclick = () => clickMesa(sub, idPedido, estado, monto, pagado);
                btn.oncontextmenu = (e) => {
                    e.preventDefault();
                    const baseNum = typeof sub === 'string' ? parseInt(sub.match(/^\d+/)[0]) : sub;
                    mostrarOpcionesMesa(baseNum, true);
                };
                cont.appendChild(btn);
            }
        } else {
            const mesaPedidos = pedidos[n] || [];
            let estado = MESA_ESTADOS.LIBRE, monto = 0, pagado = 0, idPedido = null;
            if (mesaPedidos.length > 0) {
                const pedidoActivo = mesaPedidos.find(p => (p.monto > p.pagado));
                if (pedidoActivo) {
                    estado = pedidoActivo.pagado === 0 ? MESA_ESTADOS.OCUPADA : MESA_ESTADOS.PARCIAL;
                    monto = pedidoActivo.monto;
                    pagado = pedidoActivo.pagado;
                    idPedido = pedidoActivo.id;
                }
            }
            const btn = document.createElement("button");
            btn.className = 'mesa-btn ' + (estado === MESA_ESTADOS.LIBRE ? 'mesa-libre' : estado === MESA_ESTADOS.OCUPADA ? 'mesa-ocupada' : 'mesa-parcial');
            btn.innerHTML = `<div class="mesa-num">M${n.toString().padStart(2, '0')}</div>`
                + (estado !== MESA_ESTADOS.LIBRE ? `<span class="mesa-monto">S/ ${monto.toFixed(2)}<br><span style="font-size:0.9em">${pagado > 0 ? `Pagado: S/ ${pagado.toFixed(2)}` : ''}</span></span>` : '');
            btn.onclick = () => clickMesa(n, idPedido, estado, monto, pagado);
            btn.oncontextmenu = (e) => {
                e.preventDefault();
                mostrarOpcionesMesa(n, false);
            };
            cont.appendChild(btn);
        }
    }
}

// Parte 4: Modal para dividir/unir
function mostrarOpcionesMesa(num, yaDividida) {
    let html = `<h3>Mesa ${num}</h3>`;
    if (yaDividida) {
        html += `<button class="btn" onclick="unirMesa(${num})">Unir mesas</button>`;
    } else {
        html += `<button class="btn" onclick="dividirMesa(${num})">Dividir en 2</button>`;
    }
    html += `<button class="btn-cancelar" onclick="closeMesaModal()">Cancelar</button>`;
    showMesaModal(html);
}

/* --------- Modal --------- */
function showMesaModal(html) {
    document.getElementById('mesaModalContent').innerHTML = html;
    document.getElementById('mesaModal').style.display = 'flex';
}
function closeMesaModal() {
    document.getElementById('mesaModal').style.display = 'none';
    // Oculta autocompletados por si quedan abiertos
    if(document.getElementById('autocompleteList')) document.getElementById('autocompleteList').style.display = 'none';
    if(document.getElementById('autocompleteListAgregar')) document.getElementById('autocompleteListAgregar').style.display = 'none';
}
async function renderComandasCocina() {
    const cont = document.getElementById('listaComandas');
    cont.innerHTML = '<div style="color:#888;">Cargando comandas...</div>';
    const today = new Date().toISOString().split('T')[0];
    // Solo muestra pedidos NO libres y NO listos
    const pedidos = await db.pedidos
      .where("fecha").equals(today)
      .filter(p => p.estado !== "libre" && p.estado !== "listo" && p.estado !== "anulado")
      .toArray();

    if (!pedidos.length) {
        cont.innerHTML = '<div style="color:#888;padding:25px;text-align:center;">No hay comandas pendientes.</div>';
        return;
    }

    cont.innerHTML = pedidos.map(p => {
        let mesa = p.mesa === 0
            ? (p.tipo_pedido === "para llevar" ? "Para Llevar"
                : p.tipo_pedido === "delivery" ? "Delivery" : "Especial")
            : "M" + p.mesa.toString().padStart(2, '0');
        return `
        <div class="comanda-card" style="background:#fff6e6;box-shadow:0 2px 10px #0001;padding:17px 14px;margin:15px 0;border-radius:13px;">
          <b>${mesa}</b> | ${p.nombre ? p.nombre : ''}<br>
          <b>Hora:</b> ${p.hora}<br>
          <b>Platos:</b>
          <ul style="margin-left:18px;">
            ${(p.detalle||[]).map((item,i) => 
              `<li>${item.cantidad} x ${item.nombre} <span style="color:#aaa">[S/ ${item.precio.toFixed(2)}]</span>
                ${item.listo ? '<span style="color:green;font-weight:600;">Listo</span>'
                  : `<button onclick="marcarPlatoListo(${p.id},${i})" style="margin-left:10px;" class="btn-secondary btn-xs">Marcar listo</button>`}
              </li>`
            ).join('')}
          </ul>
          <button onclick="marcarPedidoListo(${p.id})" class="btn" style="margin-top:8px;">Marcar todo pedido listo</button>
        </div>
        `;
    }).join('');
}

// ---- NOTIFICACIÓN VISUAL/SONORA ----
function playNotificationSound() {
    // Puedes reemplazar por cualquier sonido .mp3 o .wav local o en internet.
    let audio = document.getElementById('audioNoti');
    if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'audioNoti';
        audio.src = 'https://cdn.pixabay.com/audio/2022/03/15/audio_115b9e5061.mp3'; // Sonido gratuito corto
        document.body.appendChild(audio);
    }
    audio.currentTime = 0;
    audio.play();
}

function showVisualNotification(msg) {
    let div = document.createElement('div');
    div.className = 'visual-notification';
    div.innerText = msg;
    Object.assign(div.style, {
        position: 'fixed',
        top: '20px', left: '50%', transform: 'translateX(-50%)',
        background: '#222', color: 'white',
        padding: '16px 32px',
        borderRadius: '18px', zIndex: 9999,
        fontSize: '1.25em', boxShadow: '0 4px 32px #0005'
    });
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3300);
}
// ========== NOTIFICACIÓN DE PEDIDO DEMORADO ==========

// Para evitar notificaciones duplicadas, guarda los IDs ya notificados
let pedidosDemoradosNotificados = new Set();

setInterval(async () => {
    if (usuarioActual !== "cocina") return;
    const minutosDemora = 25; // Cambia aquí el tiempo (en minutos) para considerar un pedido demorado
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const pedidos = await db.pedidos
        .where("fecha").equals(today)
        .filter(p => p.estado !== "libre" && p.estado !== "listo" && p.estado !== "anulado")
        .toArray();

    pedidos.forEach(p => {
        let t1 = new Date(p.timestamp).getTime();
        if ((now - t1) / 60000 > minutosDemora) {
            if (!pedidosDemoradosNotificados.has(p.id)) {
                playNotificationSound();
                showVisualNotification(`¡Atención! Pedido de mesa ${p.mesa || '-'} lleva más de ${minutosDemora} min.`);
                pedidosDemoradosNotificados.add(p.id);
            }
        }
        // Si el pedido ya no está demorado, lo quitamos del set (por si se reactiva)
        else {
            pedidosDemoradosNotificados.delete(p.id);
        }
    });
}, 180000); // Cada 3 minutos (ajusta si quieres más frecuente)


window.marcarPlatoListo = async function(idPedido, idx) {
    const pedido = await db.pedidos.get(idPedido);
    if (!pedido) return;
    if (!pedido.detalle || !pedido.detalle[idx]) return;
    pedido.detalle[idx].listo = true;
    pedido.detalle[idx].estado = "listo"; // opcional
    await db.pedidos.update(idPedido, { detalle: pedido.detalle });
    await renderComandasCocina();
};


window.marcarPedidoListo = async function(idPedido) {
    const pedido = await db.pedidos.get(idPedido);
    if (!pedido) return;
    if (!pedido.detalle) return;
    // Marca TODOS los platos como listos
    pedido.detalle.forEach(item => {
        item.listo = true;    // <-- usa 'listo', no 'estado'
        item.estado = "listo"; // opcional: mantén ambos si quieres compatibilidad
        item.notificado = false;
    });
    // Cambia el estado del pedido a "listo"
    await db.pedidos.update(idPedido, {
        detalle: pedido.detalle,
        estado: "listo"
    });
    await renderComandasCocina();
};

    let alertaTimeout = null;

function mostrarAlertaPedidoListo(mensaje) {
  document.getElementById('alertaMsg').innerText = mensaje;
  document.getElementById('alertaPedidoListo').style.display = 'block';
  let progreso = 0;
  document.getElementById('barraProgreso').style.width = '0%';
  if(alertaTimeout) clearInterval(alertaTimeout);
  alertaTimeout = setInterval(()=>{
    progreso += 2; // 2% cada 0.1s => 5s
    document.getElementById('barraProgreso').style.width = progreso + '%';
    if(progreso >= 100) clearInterval(alertaTimeout);
  }, 100);
}

function cerrarAlertaPedidoListo() {
  document.getElementById('alertaPedidoListo').style.display = 'none';
  if(alertaTimeout) clearInterval(alertaTimeout);
  document.getElementById('barraProgreso').style.width = '0%';
}

async function revisarPedidosListosParaMoso() {
  if (usuarioActual !== "moso") return;
  const today = new Date().toISOString().split('T')[0];
  const pedidos = await db.pedidos.where({ fecha: today, creado_por: nombreMosoActual })
    .filter(p => p.estado !== 'anulado')
    .toArray();
  pedidos.forEach(ped => {
    if(ped.detalle) {
      ped.detalle.forEach(plato => {
        // Si el plato recién está marcado como listo y no se notificó...
        if(plato.estado === "listo" && !plato.notificado) {
          mostrarAlertaPedidoListo(`¡El plato "${plato.nombre}" de la Mesa ${ped.mesa} está listo para recoger!`);
          // Marca como notificado para no mostrar varias veces
          plato.notificado = true;
        }
      });
      // Guarda cambios en Dexie
      db.pedidos.update(ped.id, { detalle: ped.detalle });
    }
  });
}
setInterval(revisarPedidosListosParaMoso, 2500);


/* --------- Pedidos especiales --------- */
document.getElementById('btnParaLlevar').onclick = () => showPedidoEspecialModal('para llevar');
document.getElementById('btnDelivery').onclick = () => showPedidoEspecialModal('delivery');

function showPedidoEspecialModal(tipoPedido) {
    showMesaModal(`
        <h3>Nuevo pedido: ${tipoPedido === 'delivery' ? 'Delivery 🏍️' : 'Para Llevar 🛍️'}</h3>
        <form id="nuevoPedidoEspecialForm" autocomplete="off">
            <label>Nombre:<br>
                <input type="text" name="nombre" required style="width:100%;padding:7px;border-radius:8px;border:1.5px solid #ccc;">
            </label><br>
            <label>Monto Total (S/.):<br>
                <input type="number" min="0.01" step="0.01" name="monto" required style="width:100%;padding:7px;border-radius:8px;border:1.5px solid #ccc;">
            </label><br>
            <button type="submit" class="btn" style="margin-top:12px;">Registrar Pedido</button>
            <button type="button" onclick="closeMesaModal()" class="btn-secondary" style="margin-top:12px;">Cancelar</button>
        </form>
    `);
    document.getElementById('nuevoPedidoEspecialForm').onsubmit = async function(e) {
        e.preventDefault();
        const nombre = this.nombre.value.trim() || '-';
        const monto = parseFloat(this.monto.value);
        await crearPedidoEspecial(tipoPedido, nombre, monto);
        closeMesaModal();
    };
}
async function crearPedidoEspecial(tipoPedido, nombre, monto) {
    if (isNaN(monto) || monto <= 0) return;
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const timestamp = new Date().toISOString();
    await db.pedidos.add({
        enviado_cocina: false,
        fecha, hora, mesa: 0, monto,
        tipo_pedido: tipoPedido, tipo_pago: '', pagado: 0,
        estado: "ocupada", timestamp, nombre
    });
    await renderPedidosEspeciales();
    await updateStats();
    await updateResumenPagadosTable();
    showMessage('Pedido registrado como "' + tipoPedido + '"');
}
async function renderPedidosEspeciales() {
    await renderPedidosEspecialTipo('para llevar', 'tablaParaLlevar');
    await renderPedidosEspecialTipo('delivery', 'tablaDelivery');
}
async function renderPedidosEspecialTipo(tipoPedido, tablaId) {
    const cont = document.getElementById(tablaId).querySelector('tbody');
    cont.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    const pedidos = await db.pedidos
        .where({ fecha: today, mesa: 0, tipo_pedido: tipoPedido, estado: "ocupada" }).toArray();
    for (const p of pedidos) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.nombre || '-'}</td>
            <td>S/ ${Number(p.monto).toFixed(2)}</td>
            <td>
                <button class="btn-pagar-pedido" title="Marcar como pagado" onclick="abrirPagoPedidoEspecial(${p.id}, '${tipoPedido}')">💸 Pagar</button>
            </td>
        `;
        cont.appendChild(tr);
    }
}
window.abrirPagoPedidoEspecial = function(idPedido, tipoPedido) {
    showMesaModal(`
        <h3>Pagar pedido: ${tipoPedido === 'delivery' ? 'Delivery 🏍️' : 'Para Llevar 🛍️'}</h3>
        <form id="pagoPedidoEspecialForm" autocomplete="off">
            <label>Medio de Pago:</label>
            <div id="pagoBotones" style="display: flex; gap: 10px; margin: 10px 0;">
                <button type="button" class="btn-medio btn-efectivo" data-pago="efectivo">Efectivo</button>
                <button type="button" class="btn-medio btn-yape" data-pago="yape">Yape</button>
                <button type="button" class="btn-medio btn-tarjeta" data-pago="tarjeta">Tarjeta</button>
            </div>
            <input type="hidden" name="tipo_pago" id="inputTipoPagoEspecial" required>
            <button type="submit" class="btn" style="margin-top:12px;">Confirmar Pago</button>
            <button type="button" onclick="closeMesaModal()" class="btn-secondary" style="margin-top:12px;">Cancelar</button>
        </form>
    `);
    const inputTipoPago = document.getElementById('inputTipoPagoEspecial');
    setupPagoButtons('pagoBotones', 'inputTipoPagoEspecial');

    document.getElementById('pagoPedidoEspecialForm').onsubmit = function(e) {
        e.preventDefault();
        const tipo_pago = inputTipoPago.value;
        pagarPedidoEspecial(idPedido, tipoPedido, tipo_pago);
        closeMesaModal();
    };
};

async function enviarPedidoACocina(pedidoId) {
    const pedido = await db.pedidos.get(pedidoId);
    if (!pedido) return;
    // Aquí tu lógica de impresión
    imprimirComandaCocina(pedido); // la función que imprime
    await db.pedidos.update(pedidoId, { enviado_cocina: true });
    showMessage("Comanda enviada a cocina e impresa.");
}
function imprimirComandaCocina(pedido) {
    let mesa = pedido.mesa === 0 ? (pedido.tipo_pedido || "Especial") : "M" + pedido.mesa.toString().padStart(2, '0');
    let html = `
      <div style="font-family:monospace;font-size:18px;">
        <h2 style="text-align:center;">COMANDA</h2>
        <b>Mesa:</b> ${mesa} <br>
        <b>Mozo:</b> ${pedido.creado_por || '-'}<br>
        <b>Hora:</b> ${pedido.hora} <br>
        <b>Observación:</b> ${pedido.observacion || '-'} <br>
        <hr>
        <ul style="padding-left:0;list-style:none;">
          ${(pedido.detalle||[]).map(item=>`<li>${item.cantidad} x ${item.nombre}</li>`).join('')}
        </ul>
      </div>
    `;
    let w = window.open('', '', 'width=450,height=600');
    w.document.write(`<html><head><title>Comanda Cocina</title></head><body>${html}<script>window.print();setTimeout(()=>window.close(),1000);</script></body></html>`);
    w.document.close();
}
setInterval(async () => {
    const pedidos = await db.pedidos.where({ enviado_cocina: false }).toArray();
    const now = Date.now();
    pedidos.forEach(p => {
        let t1 = new Date(p.timestamp).getTime();
        if ((now - t1) > 2 * 60000) { // 2 minutos
            enviarPedidoACocina(p.id);
        }
    });
}, 30000); // Revisa cada 30 segundos


// CORREGIDO: Cambia pagado: Dexie.minKey por pagado: monto
window.pagarPedidoEspecial = async function(idPedido, tipoPedido, tipo_pago) {
    const pedido = await db.pedidos.get(idPedido);
    if (!pedido) return;
    await db.pedidos.update(idPedido, {
        pagado: pedido.monto,
        estado: "libre",
        tipo_pago
    });
    await renderPedidosEspeciales();
    await updateStats();
    await updateResumenPagadosTable();
    showMessage(`Pedido de ${tipoPedido} pagado`, 'success');
};

/* -------- MESAS CRUD ---------- */
// ---- FLATTEN del catálogo agrupado ----
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
} else {
  catalogoNextId = catalogoArray.reduce((m,p)=>Math.max(m,p.id),0) + 1;
}

function guardarCatalogo() {
  localStorage.setItem('catalogoCustom', JSON.stringify(catalogoArray));
}

function setupAutocomplete(inputId, listId, onSelect) {
    const inputEl = document.getElementById(inputId);
    const listEl = document.getElementById(listId);
    inputEl.oninput = () => {
        const val = inputEl.value.trim().toLowerCase();
        listEl.innerHTML = '';
        listEl.style.display = 'none';
        if (!val) return;
        const sugerencias = catalogoArray.filter(p => p.nombre.toLowerCase().includes(val));
        sugerencias.forEach(prod => {
            const div = document.createElement('div');
            div.textContent = `${prod.nombre} (S/ ${prod.precio.toFixed(2)})`;
            div.onclick = () => {
                inputEl.value = prod.nombre;
                onSelect && onSelect(prod);
                listEl.innerHTML = '';
                listEl.style.display = 'none';
            };
            listEl.appendChild(div);
        });
        if (sugerencias.length) listEl.style.display = 'block';
    };
    inputEl.onblur = () => setTimeout(() => { listEl.style.display = 'none'; }, 150);
}

function setupPagoButtons(containerId, inputId) {
    const buttons = document.querySelectorAll(`#${containerId} .btn-medio`);
    const input = document.getElementById(inputId);
    buttons.forEach(btn => {
        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            input.value = btn.getAttribute('data-pago');
        };
    });
    if (buttons[0]) buttons[0].click();
}

// ---- FUNCIÓN PRINCIPAL ----
async function clickMesa(num, idPedido, estado, monto, pagado) {
    if (estado === MESA_ESTADOS.LIBRE) {
        let opcionesExtras = '';
        const baseNum = parseInt(String(num).match(/^\d+/)?.[0] || num);
        if (!mesasDivididas[baseNum]) {
        opcionesExtras = `<button class="btn-secondary" style="margin-top:10px;" onclick="dividirMesa(${baseNum})">➗ Dividir mesa</button>`;
        } else {
        opcionesExtras = `<button class="btn-secondary" style="margin-top:10px;" onclick="unirMesa(${baseNum})">🔀 Unir mesas</button>`;
        }
        showMesaModal(`
        <h3>Nuevo pedido para Mesa ${num}</h3>
        <p>¿Cómo deseas registrar el pedido?</p>
        <div style="display:flex; gap:10px; margin-top:12px;">
            <button class="btn" onclick="mostrarFormularioPorPlato('${num}')">🍽️ Por platos</button>
            <button class="btn" onclick="mostrarFormularioPorMonto('${num}')">💰 Solo monto</button>
        </div>
        ${opcionesExtras}
        <button onclick="closeMesaModal()" class="btn-cancelar" style="margin-top:18px;">Cancelar</button>
        `);
        return;
    }

  let pagadoActual = pagado;
  let abonosStr = '';
  let pedidoObj = null;
  if (idPedido) {
    pedidoObj = await db.pedidos.get(idPedido);
    if (pedidoObj && pedidoObj.abonos && Array.isArray(pedidoObj.abonos) && pedidoObj.abonos.length) {
      pagadoActual = pedidoObj.abonos.reduce((sum, a) => sum + Number(a.monto), 0);
      abonosStr = pedidoObj.abonos.map(a =>
        `<div style="font-size:0.97em; color:#444; margin-bottom:2px;">
          ${a.tipo_pago.charAt(0).toUpperCase()+a.tipo_pago.slice(1)}: S/ ${Number(a.monto).toFixed(2)}
        </div>`
      ).join('');
    }
  }
  const saldoPendiente = monto - pagadoActual;
  let botonesExtras = '';
  if (usuarioActual === 'caja') {
    botonesExtras = `
      <form id="abonoForm" autocomplete="off" style="margin-top:8px;">
        <label>Monto a abonar:<br>
          <input type="number" min="0.01" max="${saldoPendiente}" step="0.01" name="abono" required
              style="width:100%;padding:7px;border-radius:8px;border:1.5px solid #ccc;">
        </label><br>
        <label>Medio de Pago:</label>
        <div id="pagoBotones" style="display: flex; gap: 10px; margin: 10px 0;">
            <button type="button" class="btn-medio btn-efectivo" data-pago="efectivo">Efectivo</button>
            <button type="button" class="btn-medio btn-yape" data-pago="yape">Yape</button>
            <button type="button" class="btn-medio btn-tarjeta" data-pago="tarjeta">Tarjeta</button>
        </div>
        <input type="hidden" name="tipo_pago" id="inputTipoPagoMesa" required>
        <button type="submit" class="btn" style="margin-top:12px;">Abonar</button>
      </form>
      <button class="btn-secondary" style="margin-top:10px;" onclick="anularPedido(${idPedido}, '${num}')">Anular pedido</button>
    `;
  }

  showMesaModal(`
    <h3>Mesa ${num} (${estado === MESA_ESTADOS.OCUPADA ? 'Ocupada' : 'Pago parcial'})</h3>
    <div><b>Monto Total:</b> S/ ${monto.toFixed(2)}</div>
    <div><b>Pagado:</b> S/ ${pagadoActual.toFixed(2)}</div>
    <div><b>Detalle de abonos:</b><br>${abonosStr || '<i>No hay abonos registrados</i>'}</div>
    <div id="saldoRestante" style="margin: 8px 0 10px 0; font-weight: bold; color: #2c3e50;">
        Saldo pendiente: S/ ${saldoPendiente.toFixed(2)}
    </div>
    ${botonesExtras}
    <button class="btn-secondary" style="margin-top:10px;" onclick="mostrarPrecuenta(${idPedido})">Solicitar Precuenta</button>
    ${ (usuarioActual === 'moso' && pedidoObj && pedidoObj.enviado_cocina) ? '' : `<button class="btn-secondary" style="margin-top:10px;" onclick="editarPedidoModal(${idPedido}, '${num}')">${usuarioActual === 'moso' ? 'Editar pedido' : 'Agregar platos'}</button>`}
    <button class="btn-secondary" style="margin-top:10px;" onclick="closeMesaModal()">Cerrar</button>
  `);

  if (usuarioActual === 'caja' && document.getElementById('abonoForm')) {
    const inputTipoPago = document.getElementById('inputTipoPagoMesa');
    setupPagoButtons('pagoBotones', 'inputTipoPagoMesa');

    document.querySelector('#abonoForm input[name="abono"]').addEventListener('input', function() {
      let val = parseFloat(this.value) || 0;
      let saldo = saldoPendiente - val;
      if (saldo < 0) saldo = 0;
      document.getElementById('saldoRestante').innerHTML = `Saldo pendiente: S/ ${saldo.toFixed(2)}`;
    });

    document.getElementById('abonoForm').onsubmit = async function(e) {
      e.preventDefault();
      const abono = parseFloat(this.abono.value);
      const tipo_pago = inputTipoPago.value;
      if (!tipo_pago) {
        alert("Debe seleccionar un medio de pago");
        return;
      }
      await abonarPedido(idPedido, abono, tipo_pago, monto, pagadoActual, num);

      const pedidoActualizado = await db.pedidos.get(idPedido);
      let pagadoTotal = 0;
      if (pedidoActualizado && pedidoActualizado.abonos) {
        pagadoTotal = pedidoActualizado.abonos.reduce((sum, a) => sum + Number(a.monto), 0);
      } else {
        pagadoTotal = pedidoActualizado ? pedidoActualizado.pagado : 0;
      }
      if (pagadoTotal >= monto) {
        closeMesaModal();
      } else {
        await clickMesa(num, idPedido, estado, monto, pagadoTotal);
      }
    };
  }
}
function mostrarFormularioPorMonto(num) {
  const html = `
    <h3>Registrar pedido solo con monto - Mesa ${num}</h3>
    <form id="formPedidoMontoMesa">
      <label>Monto total (S/.):</label>
      <input type="number" id="montoMesa" step="0.01" min="0.01" required
             style="width:100%;padding:7px;border-radius:8px;border:1.5px solid #ccc;">
      <div style="margin-top:10px;">
        <label>Observación:</label>
        <textarea id="observacionMonto" rows="2"
                  style="width:100%;padding:7px;border-radius:8px;border:1.5px solid #ccc;"></textarea>
      </div>
      <button type="submit" class="btn-registro">Registrar</button>
      <button type="button" onclick="closeMesaModal()" class="btn-cancelar">Cancelar</button>
    </form>
  `;
  showMesaModal(html);

  document.getElementById("formPedidoMontoMesa").addEventListener("submit", async function (e) {
    e.preventDefault();
    const monto = parseFloat(document.getElementById("montoMesa").value);
    const observacion = document.getElementById("observacionMonto").value.trim();
    if (isNaN(monto) || monto <= 0) {
      showMessage("Ingrese un monto válido", "error");
      return;
    }
    const detalle = [{ nombre: "Monto directo", precio: monto, cantidad: 1 }];
    await crearPedido(num, monto, detalle, observacion);
    closeMesaModal();
  });
}

function mostrarFormularioPorPlato(num) {
  let pedidoDetalle = [];

  const htmlForm = `
    <h3>Nuevo pedido para Mesa <span id="mesa-num">${num}</span></h3>
    <form id="nuevoPedidoForm" autocomplete="off" style="margin:0">
      <div class="pedido-row">
        <div class="pedido-col producto">
          <label for="productoInput">Producto:</label>
          <div class="autocomplete-container" style="position:relative;">
            <input type="text" id="productoInput" placeholder="Escribe para buscar..." autocomplete="off" />
            <div id="autocompleteList" class="autocomplete-items"></div>
          </div>
        </div>
        <div class="pedido-col cantidad">
          <label for="cantidadInput">Cantidad:</label>
          <input type="number" id="cantidadInput" min="1" value="1" />
        </div>
        <div class="pedido-col agregar">
          <button type="button" id="agregarBtn" class="btn-agregar">+ Agregar</button>
        </div>
      </div>

      <div class="pedido-tabla-wrap">
        <table id="tablaPedido">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="pedido-total-row">
        <span>Total:</span>
        <span id="pedidoTotal" class="pedido-total-valor">S/ 0.00</span>
      </div>

      <div style="margin:8px 0 12px 0;">
        <label for="observacionInput">Observación o comentario:</label>
        <textarea id="observacionInput" rows="2" style="width:100%;padding:7px;border-radius:8px;border:1.5px solid #ccc;"></textarea>
      </div>

      <button type="submit" class="btn-registro">Registrar Pedido</button>
      <button type="button" onclick="closeMesaModal()" class="btn-cancelar">Cancelar</button>
    </form>
  `;

  showMesaModal(htmlForm);

  // ------- AUTOCOMPLETADO ---------
  let productoSeleccionado = null;
  setupAutocomplete('productoInput', 'autocompleteList', prod => productoSeleccionado = prod);

  // -------- AGREGAR PRODUCTO AL PEDIDO ---------
  document.getElementById('agregarBtn').onclick = function () {
    const nombre = productoInput.value.trim();
    const cant = parseInt(document.getElementById('cantidadInput').value, 10) || 1;
    let prod = catalogoArray.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
    if (!prod) {
      showMessage('Selecciona un producto válido', 'error');
      return;
    }
    let existente = pedidoDetalle.find(p => p.id === prod.id);
    if (existente) {
      existente.cantidad += cant;
    } else {
      pedidoDetalle.push({ ...prod, cantidad: cant });
    }
    productoInput.value = '';
    productoSeleccionado = null;
    renderTablaPedido();
  };

  function renderTablaPedido() {
    const tbody = document.getElementById('tablaPedido').querySelector('tbody');
    tbody.innerHTML = '';
    let total = 0;
    pedidoDetalle.forEach((prod, idx) => {
      let sub = prod.precio * prod.cantidad;
      total += sub;
      let tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prod.nombre}</td>
        <td>${prod.cantidad}</td>
        <td>S/ ${prod.precio.toFixed(2)}</td>
        <td>S/ ${sub.toFixed(2)}</td>
        <td>
          <button type="button" style="color:#e74c3c;font-size:1.1em;" onclick="this.closest('tr').remove();pedidoDetalle.splice(${idx},1);renderTablaPedido();">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('pedidoTotal').innerText = "S/ " + total.toFixed(2);
  }

  // --------- SUBMIT PEDIDO ---------
  document.getElementById('nuevoPedidoForm').onsubmit = async function (e) {
    e.preventDefault();
    let detalle = [...pedidoDetalle];
    let total = detalle.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    if (detalle.length === 0) {
      showMessage("Debe agregar al menos un producto.", "error");
      return;
    }
    let observacion = document.getElementById('observacionInput').value.trim();
    await crearPedido(num, total, detalle, observacion);
    closeMesaModal();
  };
}



window.editarPedidoModal = async function(idPedido, num) {
    const pedido = await db.pedidos.get(idPedido);
    if (!pedido) { showMessage('Pedido no encontrado', 'error'); return; }
    let pedidoDetalle = pedido.detalle ? [...pedido.detalle] : [];

    let htmlForm = `
        <h3>Editar pedido Mesa ${num}</h3>
        <form id="agregarPlatosForm" autocomplete="off" style="margin:0">
            <div class="pedido-row">
                <div class="pedido-col producto">
                    <label for="productoInputAgregar">Producto:</label>
                    <div class="autocomplete-container" style="position:relative;">
                        <input type="text" id="productoInputAgregar" placeholder="Escribe para buscar..." autocomplete="off" />
                        <div id="autocompleteListAgregar" class="autocomplete-items"></div>
                    </div>
                </div>
                <div class="pedido-col cantidad">
                    <label for="cantidadInputAgregar">Cantidad:</label>
                    <input type="number" id="cantidadInputAgregar" min="1" value="1" />
                </div>
                <div class="pedido-col agregar">
                    <button type="button" id="agregarBtnAgregar" class="btn-agregar">+ Agregar</button>
                </div>
            </div>
            <div class="pedido-tabla-wrap">
                <table id="tablaPedidoAgregar">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cant.</th>
                            <th>Precio</th>
                            <th>Subtotal</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
            <div class="pedido-total-row">
                <span>Total:</span>
                <span id="pedidoTotalAgregar" class="pedido-total-valor">S/ 0.00</span>
            </div>
            <button type="submit" class="btn-registro">Guardar cambios</button>
            <button type="button" onclick="closeMesaModal()" class="btn-cancelar">Cancelar</button>
        </form>
    `;
    showMesaModal(htmlForm);

    // ------- AUTOCOMPLETADO CORRECTO ---------
    let productoSeleccionadoAgregar = null;
    setupAutocomplete('productoInputAgregar', 'autocompleteListAgregar', prod => productoSeleccionadoAgregar = prod);

    // -------- AGREGAR PRODUCTO AL PEDIDO ---------
    document.getElementById('agregarBtnAgregar').onclick = function() {
        const nombre = productoInputAgregar.value.trim();
        const cant = parseInt(document.getElementById('cantidadInputAgregar').value, 10) || 1;
        let prod = catalogoArray.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
        if (!prod) {
            showMessage('Selecciona un producto válido', 'error');
            return;
        }
        let existente = pedidoDetalle.find(p => p.id === prod.id);
        if (existente) {
            existente.cantidad += cant;
        } else {
            pedidoDetalle.push({ ...prod, cantidad: cant });
        }
        productoInputAgregar.value = '';
        productoSeleccionadoAgregar = null;
        renderTablaPedidoAgregar();
    };

    function renderTablaPedidoAgregar() {
        const tbody = document.getElementById('tablaPedidoAgregar').querySelector('tbody');
        tbody.innerHTML = '';
        let total = 0;
        pedidoDetalle.forEach((prod, idx) => {
            let sub = prod.precio * prod.cantidad;
            total += sub;
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${prod.nombre}</td>
                <td><input type="number" class="cant-edit" data-idx="${idx}" value="${prod.cantidad}" min="1" style="width:60px"></td>
                <td>S/ ${prod.precio.toFixed(2)}</td>
                <td>S/ ${sub.toFixed(2)}</td>
                <td>
                    <button type="button" style="color:#e74c3c;font-size:1.1em;" onclick="this.closest('tr').remove();pedidoDetalle.splice(${idx},1);renderTablaPedidoAgregar();">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll('.cant-edit').forEach(inp=>{
            inp.onchange = e => {
                const i = parseInt(e.target.dataset.idx);
                let val = parseInt(e.target.value) || 1;
                pedidoDetalle[i].cantidad = val;
                renderTablaPedidoAgregar();
            };
        });
        document.getElementById('pedidoTotalAgregar').innerText = "S/ " + total.toFixed(2);
    }
    renderTablaPedidoAgregar();

    // --------- SUBMIT AGREGAR PLATOS ---------
    document.getElementById('agregarPlatosForm').onsubmit = async function(e) {
        e.preventDefault();
        let detalle = [...pedidoDetalle];
        let total = detalle.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
        if (detalle.length === 0) {
            showMessage("Debe agregar al menos un producto.", "error");
            return;
        }
        await db.pedidos.update(idPedido, {
            detalle: detalle,
            monto: total,
            ultima_edicion_por: usuarioActual === 'moso' ? nombreMosoActual : usuarioActual,
            ultima_edicion_ts: new Date().toISOString()
        });
        await renderMesas();
        await updateStats();
        await updateResumenPagadosTable();
        showMessage('Pedido actualizado correctamente.');
        closeMesaModal();
    };
};


async function crearPedido(num, monto, detalle = [], observacion = "") {
    if (isNaN(monto) || monto <= 0) return;
    const fecha = new Date().toISOString().split('T')[0];
    const pedidosActivos = await db.pedidos
        .where("fecha").equals(fecha)
        .filter(p => p.mesa === num && p.estado !== "libre" && p.estado !== "anulado")
        .toArray();

    if (pedidosActivos.length > 0) {
        showMessage('Ya existe un pedido activo para esta mesa hoy.', 'error');
        return;
    }
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const timestamp = new Date().toISOString();
    const tipo_pedido = "mesa";
    const idNuevoPedido = await db.pedidos.add({
        fecha, hora, mesa: num, monto, tipo_pedido, tipo_pago: '', pagado: 0, estado: "ocupada", timestamp,
        detalle,
        observacion,
        creado_por: usuarioActual === 'moso' ? nombreMosoActual : null,
        enviado_cocina: false
    });

    // 🚦 Aquí notificas por socket si eres mozo
    if (typeof socket !== 'undefined' && socket && usuarioActual === "moso") {
        socket.emit('nuevoPedido', { mesa: num, detalle, observacion });
    }

    await renderMesas();
    await updateStats();
    await updateResumenPagadosTable();
    showMessage(`Pedido creado para mesa ${num}. <button onclick="enviarPedidoACocina(${idNuevoPedido})" class="btn">Enviar a cocina</button>`);
    return idNuevoPedido;
}


async function abonarPedido(idPedido, abono, tipo_pago, monto, pagado, num) {
    const pedido = await db.pedidos.get(idPedido);
    if (!pedido) { showMessage('Pedido no encontrado', 'error'); return; }
    // Suma de abonos ya realizados
    let abonos = pedido.abonos || [];
    let pagadoActual = abonos.reduce((sum, a) => sum + Number(a.monto), 0);

    const pendiente = pedido.monto - pagadoActual;
    if (isNaN(abono) || abono <= 0 || abono > pendiente) {
        showMessage(`Abono inválido. El máximo permitido es S/ ${pendiente.toFixed(2)}`, 'error');
        return;
    }
    // Agrega nuevo abono
    abonos.push({
        monto: abono,
        tipo_pago,
        fecha: new Date().toISOString()
    });
    const pagadoNuevo = pagadoActual + abono;
    await db.pedidos.update(idPedido, { 
        pagado: pagadoNuevo, 
        abonos: abonos, 
        estado: pagadoNuevo >= pedido.monto ? "libre" : pedido.estado 
    });
    await renderMesas();
    await updateStats();
    await updateResumenPagadosTable();
    showMessage(`Pago registrado para mesa ${num}`);
}


window.anularPedido = async function(idPedido, num) {
    if (confirm(`¿Anular pedido de Mesa ${num}? Esta acción no se puede deshacer.`)) {
        await db.pedidos.update(idPedido, {
            estado: 'anulado',
            fecha_anulado: new Date().toISOString()
        });
        await renderMesas();
        await updateStats();
        await updateResumenPagadosTable();
        showMessage('Pedido anulado.');
        closeMesaModal();
    }
};

/* --------- Resumen y reportes --------- */
async function updateResumenPagadosTable() {
    const cont = document.getElementById('resumenPagadosTable');
    const today = new Date().toISOString().split('T')[0];
    const rows = await db.pedidos.where("fecha").equals(today)
        .filter(p => (p.pagado || 0) > 0 && p.estado !== 'anulado')
        .toArray();
    if (!rows.length) {
        cont.innerHTML = '<div style="color:#666;padding:15px;">No hay pedidos pagados aún.</div>';
        return;
    }
    cont.innerHTML = `
        <table style="width:100%;margin-bottom:15px;">
            <thead>
                <tr>
                    <th>Mesa</th>
                    <th>Monto Total</th>
                    <th>Pagado</th>
                    <th>Falta</th>
                    <th>Detalle de Pagos</th>
                    <th>Imprimir</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => {
                    let efectivo = 0, yape = 0, tarjeta = 0;
                    if (r.abonos && Array.isArray(r.abonos)) {
                        r.abonos.forEach(ab => {
                            if (ab.tipo_pago === "efectivo") efectivo += Number(ab.monto) || 0;
                            if (ab.tipo_pago === "yape") yape += Number(ab.monto) || 0;
                            if (ab.tipo_pago === "tarjeta") tarjeta += Number(ab.monto) || 0;
                        });
                    } else if (r.tipo_pago) {
                        if (r.tipo_pago === "efectivo") efectivo = Number(r.pagado) || 0;
                        if (r.tipo_pago === "yape") yape = Number(r.pagado) || 0;
                        if (r.tipo_pago === "tarjeta") tarjeta = Number(r.pagado) || 0;
                    }
                    let detalle = [
                        efectivo ? `Efectivo: S/ ${efectivo.toFixed(2)}` : '',
                        yape ? `Yape: S/ ${yape.toFixed(2)}` : '',
                        tarjeta ? `Tarjeta: S/ ${tarjeta.toFixed(2)}` : ''
                    ].filter(Boolean).join("<br>");
                    return `
                    <tr>
                        <td style="text-align:center;">
                            ${r.mesa === 0
                                ? (r.tipo_pedido === "para llevar" ? "Para Llevar" :
                                    r.tipo_pedido === "delivery" ? "Delivery" : "Especial")
                                : "M" + r.mesa.toString().padStart(2, '0')}
                        </td>
                        <td>S/ ${Number(r.monto).toFixed(2)}</td>
                        <td>S/ ${Number(r.pagado).toFixed(2)}</td>
                        <td>S/ ${(Number(r.monto) - Number(r.pagado)).toFixed(2)}</td>
                        <td>${detalle || '-'}</td>
                        <td>
                            <button class="btn-secondary" style="padding:7px 14px;font-size:0.97em"
                                onclick="imprimirDetalleAbonos(${r.id})">
                                🖨️ Imprimir
                            </button>
                        </td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    `;
}
window.imprimirDetalleAbonos = async function(idPedido) {
    const pedido = await db.pedidos.get(idPedido);
    if (!pedido) return alert('Pedido no encontrado');
    let nombre = pedido.nombre || '-';
    let mesa = pedido.mesa === 0
        ? (pedido.tipo_pedido === "para llevar" ? "Para Llevar"
            : pedido.tipo_pedido === "delivery" ? "Delivery" : "Especial")
        : "M" + pedido.mesa.toString().padStart(2, '0');

    // Tabla de productos consumidos
    let productosHTML = `
        <b>Productos consumidos:</b>
        <table border="1" cellpadding="7" cellspacing="0" style="width:100%;margin-top:8px;font-size:1em;">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>P. Unitario</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${(pedido.detalle || []).map((prod, i) => `
                    <tr>
                        <td style="text-align:center">${i + 1}</td>
                        <td>${prod.nombre}</td>
                        <td style="text-align:center">${prod.cantidad}</td>
                        <td>S/ ${Number(prod.precio).toFixed(2)}</td>
                        <td>S/ ${(prod.precio * prod.cantidad).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Tabla de abonos realizados
    let abonosHTML = `
        <b>Pagos realizados:</b>
        <table border="1" cellpadding="7" cellspacing="0" style="width:100%;margin-top:8px;font-size:1em;">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Monto</th>
                    <th>Medio</th>
                    <th>Fecha/Hora</th>
                </tr>
            </thead>
            <tbody>
                ${(pedido.abonos || []).map((a, i) => `
                    <tr>
                        <td style="text-align:center">${i + 1}</td>
                        <td>S/ ${Number(a.monto).toFixed(2)}</td>
                        <td>${a.tipo_pago.charAt(0).toUpperCase() + a.tipo_pago.slice(1)}</td>
                        <td>${new Date(a.fecha).toLocaleString('es-PE')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Total, pagado y pendiente
    let totalHTML = `
        <div style="margin:13px 0 7px 0;">
            <b>Monto Total:</b> S/ ${Number(pedido.monto).toFixed(2)}<br>
            <b>Pagado:</b> S/ ${Number(pedido.pagado).toFixed(2)}<br>
            <b>Saldo pendiente:</b> S/ ${(Number(pedido.monto) - Number(pedido.pagado)).toFixed(2)}
        </div>
    `;

    let html = `
    <div style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;min-width:350px;">
        <h2 style="text-align:center;margin-bottom:12px;">Detalle de Pedido</h2>
        <b>Mesa/Pedido:</b> ${mesa} <br>
        <b>Nombre:</b> ${nombre} <br>
        ${productosHTML}
        ${totalHTML}
        <hr style="margin:10px 0;">
        ${abonosHTML}
    </div>
    `;

    let w = window.open('', '_blank', 'width=550,height=900');
    w.document.write(`
        <html><head><title>Detalle de Pedido</title></head><body>${html}
        <br><button onclick="window.print();">Imprimir</button>
        </body></html>
    `);
    w.document.close();
};

window.mostrarPrecuenta = async function(idPedido) {
    const pedido = await db.pedidos.get(idPedido);
    if (!pedido) return alert('Pedido no encontrado');
    let nombre = pedido.nombre || '-';
    let mesa = pedido.mesa === 0
        ? (pedido.tipo_pedido === "para llevar" ? "Para Llevar"
            : pedido.tipo_pedido === "delivery" ? "Delivery" : "Especial")
        : "M" + pedido.mesa.toString().padStart(2, '0');

    let productosHTML = `
        <table border="1" cellpadding="7" cellspacing="0" style="width:100%;margin-top:8px;font-size:1em;">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>P. Unitario</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${(pedido.detalle || []).map((prod, i) => `
                    <tr>
                        <td style="text-align:center">${i + 1}</td>
                        <td>${prod.nombre}</td>
                        <td style="text-align:center">${prod.cantidad}</td>
                        <td>S/ ${Number(prod.precio).toFixed(2)}</td>
                        <td>S/ ${(prod.precio * prod.cantidad).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    let html = `
    <div style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;min-width:350px;">
        <h2 style="text-align:center;margin-bottom:12px;">Precuenta</h2>
        <b>Mesa/Pedido:</b> ${mesa} <br>
        <b>Nombre:</b> ${nombre} <br>
        ${productosHTML}
        <div style="margin:13px 0 7px 0;">
            <b>Total:</b> S/ ${Number(pedido.monto).toFixed(2)}
        </div>
    </div>
    `;

    let w = window.open('', '_blank', 'width=550,height=900');
    w.document.write(`
        <html><head><title>Precuenta</title></head><body>${html}
        <br><button onclick="window.print();">Imprimir</button>
        </body></html>
    `);
    w.document.close();
};


async function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const paymentTotals = { efectivo: 0, yape: 0, tarjeta: 0 };
    const rows = await db.pedidos.where("fecha").equals(today)
        .filter(p => p.estado !== 'anulado')
        .toArray();
    for (const row of rows) {
        if (row.abonos && Array.isArray(row.abonos)) {
            row.abonos.forEach(ab => {
                if (ab.tipo_pago && paymentTotals[ab.tipo_pago] !== undefined) {
                    paymentTotals[ab.tipo_pago] += Number(ab.monto) || 0;
                }
            });
        } else if (row.tipo_pago && paymentTotals[row.tipo_pago] !== undefined) {
            // Compatibilidad con pedidos antiguos (sin abonos)
            paymentTotals[row.tipo_pago] += Number(row.pagado) || 0;
        }
    }
    const totalDia = paymentTotals.efectivo + paymentTotals.yape + paymentTotals.tarjeta;
    document.getElementById('efectivoTotal').textContent = `S/ ${paymentTotals.efectivo.toFixed(2)}`;
    document.getElementById('yapeTotal').textContent = `S/ ${paymentTotals.yape.toFixed(2)}`;
    document.getElementById('tarjetaTotal').textContent = `S/ ${paymentTotals.tarjeta.toFixed(2)}`;
    document.getElementById('totalDia').textContent = `S/ ${totalDia.toFixed(2)}`;
    // Leer caja de apertura del día
    let cajaApertura = 0;
    const conf = await db.configuracion.where({ fecha: today }).first();
    if (conf) cajaApertura = Number(conf.caja_apertura) || 0;
    const ganancia = totalDia - cajaApertura;
    document.getElementById('ganancia').textContent = `S/ ${ganancia.toFixed(2)}`;
}

async function loadCajaApertura() {
    const today = new Date().toISOString().split('T')[0];
    const conf = await db.configuracion.where({ fecha: today }).first();
    if (conf) document.getElementById('cajaApertura').value = conf.caja_apertura;
}
async function setCajaApertura() {
    const amount = parseFloat(document.getElementById('cajaApertura').value);
    if (isNaN(amount) || amount < 0) { showMessage('Por favor, ingrese un monto válido', 'error'); return; }
    const today = new Date().toISOString().split('T')[0];
    await db.configuracion.where({ fecha: today }).delete();
    await db.configuracion.add({ fecha: today, caja_apertura: amount });
    await updateStats();
    showMessage(`Caja de apertura establecida: S/ ${amount.toFixed(2)}`, 'success');
}
function setupEventListeners() {
    document.getElementById('btnCajaApertura').addEventListener('click', setCajaApertura);
}
document.getElementById('btnGenerarReporte').onclick = async function() {
    const inicio = document.getElementById('fechaInicio').value;
    const fin = document.getElementById('fechaFin').value;
    if (!inicio || !fin) {
        showMessage('Debe seleccionar ambas fechas', 'error');
        return;
    }

    // Mostrar los cuadros resumen
    document.getElementById('resumenCuadros').style.display = 'flex';

    const rows = await db.pedidos
        .where("fecha").between(inicio, fin, true, true)
        .filter(p => p.pagado >= p.monto && p.estado !== 'anulado').toArray();

    // Recalcular totales
    const paymentTotals = { efectivo: 0, yape: 0, tarjeta: 0 };
    let totalDia = 0;
    for (const row of rows) {
        if (row.abonos && Array.isArray(row.abonos)) {
            row.abonos.forEach(ab => {
                if (ab.tipo_pago && paymentTotals[ab.tipo_pago] !== undefined) {
                    paymentTotals[ab.tipo_pago] += Number(ab.monto) || 0;
                }
            });
        } else if (row.tipo_pago && paymentTotals[row.tipo_pago] !== undefined) {
            paymentTotals[row.tipo_pago] += Number(row.pagado) || 0;
        }
    }
    totalDia = paymentTotals.efectivo + paymentTotals.yape + paymentTotals.tarjeta;

    const today = new Date().toISOString().split('T')[0];
    const conf = await db.configuracion.where({ fecha: today }).first();
    const cajaApertura = conf ? Number(conf.caja_apertura) || 0 : 0;
    const ganancia = totalDia - cajaApertura;

    // Actualizar cuadros
    document.getElementById('efectivoTotalReporte').textContent = `S/ ${paymentTotals.efectivo.toFixed(2)}`;
    document.getElementById('yapeTotalReporte').textContent = `S/ ${paymentTotals.yape.toFixed(2)}`;
    document.getElementById('tarjetaTotalReporte').textContent = `S/ ${paymentTotals.tarjeta.toFixed(2)}`;
    document.getElementById('totalDiaReporte').textContent = `S/ ${totalDia.toFixed(2)}`;
    document.getElementById('gananciaReporte').textContent = `S/ ${ganancia.toFixed(2)}`;


    // Renderizar tabla
    let html = `<table><thead>
        <tr><th>Fecha</th><th>Hora</th><th>Mesa</th><th>Tipo Pedido</th><th>Tipo Pago</th><th>Monto</th></tr>
    </thead><tbody>`;
    for (const p of rows) {
        html += `<tr>
            <td>${p.fecha}</td>
            <td>${p.hora}</td>
            <td>${p.mesa === 0
                ? (p.tipo_pedido === "para llevar" ? "Para Llevar" :
                    p.tipo_pedido === "delivery" ? "Delivery" : "Especial")
                : "M" + p.mesa.toString().padStart(2, '0')}</td>
            <td>${p.tipo_pedido || '-'}</td>
            <td>${p.tipo_pago || '-'}</td>
            <td>S/ ${Number(p.monto).toFixed(2)}</td>
        </tr>`;
    }
    html += '</tbody></table>';
    document.getElementById('tablaReporte').innerHTML = html;
};

// ----- Gráfica de platos más consumidos -----
let graficaPlatosChart = null;
document.getElementById('btnGenerarGrafica').onclick = async function() {
    const inicio = document.getElementById('fechaInicio').value;
    const fin = document.getElementById('fechaFin').value;
    if (!inicio || !fin) {
        showMessage('Debe seleccionar ambas fechas', 'error');
        return;
    }
    const rows = await db.pedidos
        .where('fecha').between(inicio, fin, true, true)
        .filter(p => p.estado !== 'anulado')
        .toArray();
    const conteo = {};
    for (const row of rows) {
        if (Array.isArray(row.detalle)) {
            row.detalle.forEach(p => {
                const nombre = p.nombre;
                const cant = Number(p.cantidad) || 1;
                conteo[nombre] = (conteo[nombre] || 0) + cant;
            });
        }
    }
    const items = Object.entries(conteo)
        .sort((a,b) => b[1]-a[1])
        .slice(0, 10);
    if (!items.length) {
        showMessage('No hay datos para ese rango', 'error');
        return;
    }
    const labels = items.map(i => i[0]);
    const data = items.map(i => i[1]);
    const ctx = document.getElementById('graficaPlatos').getContext('2d');
    if (graficaPlatosChart) graficaPlatosChart.destroy();
    graficaPlatosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Platos vendidos',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
    document.getElementById('graficaPlatos').style.display = 'block';
};


/* --------- Exportar/Importar/Limpiar BD --------- */
document.getElementById('btnExportarBD').onclick = async function() {
    const data = {
        pedidos: await db.pedidos.toArray(),
        configuracion: await db.configuracion.toArray()
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'restaurantDB.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
document.getElementById('btnImportarBD').onclick = function() {
    document.getElementById('fileImportarBD').click();
};
document.getElementById('fileImportarBD').onchange = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const data = JSON.parse(event.target.result);
            await db.pedidos.clear();
            await db.configuracion.clear();
            await db.pedidos.bulkAdd(data.pedidos || []);
            await db.configuracion.bulkAdd(data.configuracion || []);
            await renderMesas();
            await updateStats();
            await updateResumenPagadosTable();
            showMessage('Base de datos importada exitosamente');
        } catch (err) {
            showMessage('Error importando la base de datos', 'error');
        }
    };
    reader.readAsText(file);
};
document.getElementById('btnLimpiarBD').onclick = async function() {
    if (!confirm('¿Seguro que deseas limpiar toda la base de datos? Esta acción NO se puede deshacer.')) return;
    await db.pedidos.clear();
    await db.configuracion.clear();
    await renderMesas();
    await updateStats();
    await updateResumenPagadosTable();
    showMessage('Base de datos limpiada');
};
window.addEventListener('offline', () => alert('Estás sin conexión, pero puedes seguir trabajando. Los datos se guardan en el dispositivo.'));

// ----- Panel de catálogo -----
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

if (document.getElementById('formNuevoProd')) {
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
}

window.onload = async function() {
    document.getElementById('nombreMosoBox').style.display = 'none';
    const today = (new Date()).toISOString().slice(0, 10);
    document.getElementById('fechaInicio').value = today;
    document.getElementById('fechaFin').value = today;
    await cerrarCajaAnteriorSiCorresponde();

    // Revisa sesión guardada
    usuarioActual = localStorage.getItem('usuarioActual');
    nombreMosoActual = localStorage.getItem('nombreMosoActual');
    if (usuarioActual) {
        ocultarLogin();
        initApp();
        //conectarSocket(usuarioActual);    // <---- AGREGADO AQUÍ
        if(usuarioActual === "cocina") activarAutoUpdateCocina();
        else if(typeof cocinaInterval !== "undefined" && cocinaInterval) clearInterval(cocinaInterval);
    } else {
        mostrarLogin();
    }
};


