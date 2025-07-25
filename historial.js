let rowsCache = [];
const db = new Dexie('FestejosDB');
db.version(3).stores({
  pedidos: "++id,fecha,hora,mesa,monto,tipo_pedido,tipo_pago,pagado,estado,timestamp,nombre,abonos,creado_por"
});

function fechaHoy() {
  return new Date().toISOString().slice(0,10);
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('histInicio').value = fechaHoy();
  document.getElementById('histFin').value = fechaHoy();
  document.getElementById('btnHistorial').addEventListener('click', cargarHistorial);
  document.getElementById('exportJSON').addEventListener('click', exportJSON);
  document.getElementById('exportExcel').addEventListener('click', exportExcel);
  const pref = localStorage.getItem('darkMode');
  if (pref === '1') document.body.classList.add('dark-mode');
  document.getElementById('toggleDarkMode').onclick = () => {
    const active = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', active ? '1' : '0');
  };
  cargarHistorial();
});

async function cargarHistorial() {
  const ini = document.getElementById('histInicio').value;
  const fin = document.getElementById('histFin').value;
  const estado = document.getElementById('histEstado').value;
  if (!ini || !fin) return;
  let col = db.pedidos.where('fecha').between(ini, fin, true, true);
  if (estado) col = col.filter(p => p.estado === estado);
  const rows = await col.toArray();
  rowsCache = rows;
  let html = `<table><thead><tr><th>Fecha</th><th>Mesa/Tipo</th><th>Estado</th><th>Monto</th><th>Pagado</th></tr></thead><tbody>`;
  rows.forEach(r => {
    const mesa = r.mesa ? 'M'+r.mesa.toString().padStart(2,'0') : (r.tipo_pedido||'-');
    html += `<tr><td>${r.fecha} ${r.hora}</td><td>${mesa}</td><td>${r.estado||''}</td><td>S/ ${Number(r.monto).toFixed(2)}</td><td>S/ ${Number(r.pagado).toFixed(2)}</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('historialTabla').innerHTML = html;
}

function exportJSON() {
  if (!rowsCache.length) return;
  const blob = new Blob([JSON.stringify(rowsCache, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'historial.json';
  a.click();
}

function exportExcel() {
  if (!rowsCache.length) return;
  let csv = 'Fecha,Mesa/Tipo,Estado,Monto,Pagado\n';
  csv += rowsCache.map(r => `${r.fecha} ${r.hora},${r.mesa ? 'M'+r.mesa : r.tipo_pedido||''},${r.estado||''},${r.monto},${r.pagado}`).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'historial.csv';
  a.click();
}
