/* Lógica de pedidos a droguería */
Store.renderNav('pedidos');
// Cantidad sugerida = (stockMinimo * 2) - stock, con más margen si el producto rota mucho
function cantidadSugerida(m) {
  const base = m.stockMinimo * 2 - m.stock;
  const factor = m.vendidosHistoricos >= 100 ? 1.5 : m.vendidosHistoricos >= 50 ? 1.25 : 1;
  return Math.max(1, Math.ceil(base * factor));
}
function generarPedido() {
  const bajos = Store.getAll('medicamentos').filter(m => m.stock <= m.stockMinimo);
  if (!bajos.length) { document.getElementById('msg').textContent = 'No hay medicamentos en bajo stock: no se genera pedido.'; return; }
  Store.add('pedidosDrogueria', { fecha: Store.hoy(), estado: 'generado',
    items: bajos.map(m => ({ medicamentoId: m.id, nombre: m.nombre, cantidadSugerida: cantidadSugerida(m) })) });
  document.getElementById('msg').textContent = '';
  render();
}
const tabla = p => '<table><tr><th>Medicamento</th><th>Cantidad sugerida</th></tr>' +
  p.items.map(i => `<tr><td>${Store.esc(i.nombre)}</td><td>${i.cantidadSugerida}</td></tr>`).join('') + '</table>';
function render() {
  const ps = Store.getAll('pedidosDrogueria').slice().reverse();
  document.getElementById('ultimo').innerHTML = ps.length ? `<p>Pedido #${ps[0].id} · ${ps[0].fecha}</p>` + tabla(ps[0]) : '<p>Aún no se generaron pedidos.</p>';
  document.getElementById('historial').innerHTML = ps.map(p => `<div class="card"><b>Pedido #${p.id}</b> · ${p.fecha} · ${p.items.length} ítems · ${p.estado}${tabla(p)}</div>`).join('');
}
render();
