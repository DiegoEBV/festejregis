const db = new Dexie('FestejosDB');
db.version(3).stores({
  pedidos: "++id,fecha,hora,mesa,monto,tipo_pedido,tipo_pago,pagado,estado,timestamp,nombre,abonos,creado_por"
});

function hoy() { return new Date().toISOString().slice(0,10); }

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('prodInicio').value = hoy();
  document.getElementById('prodFin').value = hoy();
  document.getElementById('btnProd').addEventListener('click', cargar);
  const pref = localStorage.getItem('darkMode');
  if (pref === '1') document.body.classList.add('dark-mode');
  document.getElementById('toggleDarkMode').onclick = () => {
    const active = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', active ? '1' : '0');
  };
  cargar();
});

async function cargar() {
  const ini = document.getElementById('prodInicio').value;
  const fin = document.getElementById('prodFin').value;
  if (!ini || !fin) return;
  const rows = await db.pedidos.where('fecha').between(ini, fin, true, true)
    .filter(p => p.creado_por && p.estado !== 'anulado')
    .toArray();
  const stats = {};
  rows.forEach(r => {
    const mozo = r.creado_por || 'Desconocido';
    if (!stats[mozo]) stats[mozo] = { pedidos:0, monto:0, tiempos:[] };
    stats[mozo].pedidos++;
    stats[mozo].monto += Number(r.pagado||0);
    let t = 0;
    if (Array.isArray(r.abonos) && r.abonos.length) {
      const ultima = r.abonos[r.abonos.length-1];
      t = (new Date(ultima.fecha) - new Date(r.timestamp)) / 60000;
    }
    stats[mozo].tiempos.push(t);
  });
  let html = `<table><thead><tr><th>Mozo</th><th>Pedidos</th><th>Monto</th><th>Tiempo Promedio (min)</th></tr></thead><tbody>`;
  Object.entries(stats).forEach(([mozo,data]) => {
    const prom = data.tiempos.length ? data.tiempos.reduce((a,b)=>a+b,0)/data.tiempos.length : 0;
    html += `<tr><td>${mozo}</td><td>${data.pedidos}</td><td>S/ ${data.monto.toFixed(2)}</td><td>${prom.toFixed(1)}</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('prodTabla').innerHTML = html;
}
