/* Lógica del Dashboard: KPIs calculados en vivo */
Store.renderNav('index');
const meds = Store.getAll('medicamentos'), ventas = Store.getAll('ventas'), pedidos = Store.getAll('pedidosDrogueria');
const delDia = ventas.filter(v => v.fecha === Store.hoy() && v.estadoVenta !== 'anulada');
const pendientes = ventas.filter(v => v.estadoValidacion === 'pendiente' && v.estadoVenta !== 'anulada');
const ultimo = pedidos[pedidos.length - 1];
const ICONOS = ['🧾', '⏳', '⚠️', '⛔', '🚚']; let nIco = 0;
const kpi = (valor, texto) => `<div class="kpi"><div class="kico">${ICONOS[nIco++]}</div><b>${valor}</b><span>${texto}</span></div>`;
document.getElementById('kpis').innerHTML =
  kpi(delDia.length + ' · ' + Store.formatMoney(delDia.reduce((s, v) => s + v.total, 0)), 'Ventas del día') +
  kpi(pendientes.length, 'Pendientes de validación') +
  kpi(meds.filter(m => Store.estadoStock(m) === 'BAJO').length, 'Medicamentos en bajo stock') +
  kpi(meds.filter(m => m.stock <= 0).length, 'Medicamentos sin stock') +
  kpi(ultimo ? ultimo.fecha + ' · ' + ultimo.items.length + ' ítems' : 'Sin pedidos', 'Último pedido a droguería');
document.getElementById('ultimas').innerHTML = ventas.slice(-5).reverse().map(v =>
  `<tr><td>${v.numero}</td><td>${v.fecha}</td><td>${Store.esc(v.paciente)}</td><td>${Store.formatMoney(v.total)}</td><td>${v.estadoVenta}</td></tr>`).join('')
  || '<tr><td colspan="5">Sin ventas</td></tr>';
