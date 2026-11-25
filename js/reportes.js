/* Lógica de reportes: ventas del día y rotación de productos */
Store.renderNav('reportes');
const delDia = Store.getAll('ventas').filter(v => v.fecha === Store.hoy() && v.estadoVenta !== 'anulada');
document.getElementById('resumenDia').textContent =
  `Operaciones: ${delDia.length} · Total: ${Store.formatMoney(delDia.reduce((s, v) => s + v.total, 0))}`;
document.getElementById('tablaDia').innerHTML = delDia.map(v => `<tr><td>${v.numero}</td><td>${Store.esc(v.paciente)}</td>
  <td>${v.items.map(i => Store.esc(i.nombre) + ' × ' + i.cantidad).join('<br>')}</td><td>${Store.formatMoney(v.total)}</td><td>${v.estadoVenta}</td></tr>`).join('')
  || '<tr><td colspan="5">Sin ventas hoy</td></tr>';

// Rotación: alta >= 66% del máximo, media >= 33%, baja el resto
const meds = Store.getAll('medicamentos').slice().sort((a, b) => b.vendidosHistoricos - a.vendidosHistoricos);
const max = meds.length ? Math.max(1, meds[0].vendidosHistoricos) : 1;
function rotacion(m) {
  const p = m.vendidosHistoricos / max;
  return p >= 0.66 ? ['Alta', 'ok'] : p >= 0.33 ? ['Media', 'warn'] : ['Baja', 'err'];
}
document.getElementById('tablaRot').innerHTML = meds.map(m => { const [t, c] = rotacion(m);
  return `<tr><td>${Store.esc(m.nombre)}</td><td>${m.vendidosHistoricos}</td><td>${m.stock}</td><td><span class="badge ${c}">${t}</span></td></tr>`; }).join('');
