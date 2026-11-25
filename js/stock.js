/* Lógica de stock: medicamentos y ajustes de inventario */
Store.renderNav('stock');
const $ = id => document.getElementById(id);
let soloBajo = false;
const getMed = id => Store.getAll('medicamentos').find(m => m.id === id);
const efecto = a => a.tipo === 'egreso' ? -a.cantidad : a.cantidad; // en "ajuste" la cantidad puede ser negativa

/* Registra un ajuste y actualiza el stock. Devuelve false si dejaría stock negativo. */
function aplicarAjuste(a) {
  const m = getMed(a.medicamentoId);
  if (!m) return false;
  if (m.stock + efecto(a) < 0) { alert('El stock no puede quedar negativo.'); return false; }
  Store.add('ajustes', { ...a, nombre: m.nombre, fecha: Store.hoy() });
  Store.update('medicamentos', m.id, { stock: m.stock + efecto(a) });
  return true;
}
function ingreso(id) {
  const c = +prompt('Cantidad a ingresar:');
  if (c > 0) aplicarAjuste({ medicamentoId: id, tipo: 'ingreso', cantidad: c, motivo: 'Ingreso manual' });
  render();
}
function modificarStock(id) {
  const m = getMed(id), n = prompt('Nuevo stock para ' + m.nombre + ':', m.stock);
  if (n === null || n === '' || isNaN(n) || +n < 0) return;
  if (+n !== m.stock) aplicarAjuste({ medicamentoId: id, tipo: 'ajuste', cantidad: +n - m.stock, motivo: 'Modificación de stock' });
  render();
}
function consultarMed(id) {
  const m = getMed(id);
  const movs = Store.getAll('ajustes').filter(a => a.medicamentoId === id).map(a => `${a.fecha} ${a.tipo} ${a.cantidad} (${a.motivo})`).join('\n') || 'Sin movimientos';
  alert(`${m.nombre}\nDroga: ${m.droga}\n${m.presentacion}\nPrecio: ${Store.formatMoney(m.precio)}\nStock: ${m.stock} (mín. ${m.stockMinimo})\nVendidos: ${m.vendidosHistoricos}\n\nMovimientos:\n${movs}`);
}
function eliminarMed(id) {
  if (confirm('¿Eliminar del inventario? El historial de ventas se conserva.')) { Store.remove('medicamentos', id); render(); }
}
function nuevoMed(e) {
  e.preventDefault();
  Store.add('medicamentos', { nombre: $('mNombre').value, droga: $('mDroga').value, presentacion: $('mPres').value,
    precio: +$('mPrecio').value, stock: +$('mStock').value, stockMinimo: +$('mMin').value, vendidosHistoricos: 0 });
  e.target.reset(); render();
}
function toggleBajo() { soloBajo = !soloBajo; render(); }

/* ---------- Ajustes ---------- */
function altaAjuste(e) {
  e.preventDefault();
  if (aplicarAjuste({ medicamentoId: +$('aMed').value, tipo: $('aTipo').value, cantidad: +$('aCant').value, motivo: $('aMotivo').value })) e.target.reset();
  render();
}
function consultarAjuste(id) {
  const a = Store.getAll('ajustes').find(x => x.id === id);
  alert(`Ajuste #${a.id}\n${a.fecha}\n${a.nombre}\nTipo: ${a.tipo}\nCantidad: ${a.cantidad}\nMotivo: ${a.motivo}`);
}
function modificarAjuste(id) {
  const a = Store.getAll('ajustes').find(x => x.id === id), m = getMed(a.medicamentoId);
  const c = prompt('Nueva cantidad:', a.cantidad); if (c === null || isNaN(c) || c === '') return;
  const mo = prompt('Nuevo motivo:', a.motivo); if (mo === null) return;
  const nuevo = { ...a, cantidad: +c, motivo: mo };
  if (m) {
    const stockNuevo = m.stock - efecto(a) + efecto(nuevo);
    if (stockNuevo < 0) return alert('El stock no puede quedar negativo.');
    Store.update('medicamentos', m.id, { stock: stockNuevo });
  }
  Store.update('ajustes', id, { cantidad: +c, motivo: mo }); render();
}
function eliminarAjuste(id) {
  const a = Store.getAll('ajustes').find(x => x.id === id), m = getMed(a.medicamentoId);
  if (!confirm('¿Eliminar el ajuste? Se revierte su efecto en el stock.')) return;
  if (m) {
    if (m.stock - efecto(a) < 0) return alert('No se puede revertir: el stock quedaría negativo.');
    Store.update('medicamentos', m.id, { stock: m.stock - efecto(a) });
  }
  Store.remove('ajustes', id); render();
}

/* ---------- Render ---------- */
function render() {
  const meds = Store.getAll('medicamentos');
  $('aMed').innerHTML = meds.map(m => `<option value="${m.id}">${Store.esc(m.nombre)}</option>`).join('');
  $('btnBajo').textContent = soloBajo ? 'Ver todos los productos' : 'Listado de productos con bajo stock';
  const b = (t, fn, id, c = '') => `<button class="btn-sm ${c}" onclick="${fn}(${id})">${t}</button>`;
  $('tablaMeds').innerHTML = meds.filter(m => !soloBajo || m.stock <= m.stockMinimo).map(m => `<tr><td>${Store.esc(m.nombre)}</td>
    <td>${Store.esc(m.presentacion)}</td><td>${Store.formatMoney(m.precio)}</td><td>${m.stock}</td><td>${m.stockMinimo}</td><td>${Store.badgeStock(m)}</td>
    <td>${b('Registrar ingreso', 'ingreso', m.id)}${b('Modificar stock', 'modificarStock', m.id, 'sec')}${b('Consultar', 'consultarMed', m.id, 'sec')}${b('Eliminar', 'eliminarMed', m.id, 'peligro')}</td></tr>`).join('')
    || '<tr><td colspan="7">Sin resultados</td></tr>';
  $('tablaAjustes').innerHTML = Store.getAll('ajustes').slice().reverse().map(a => `<tr><td>${a.fecha}</td><td>${Store.esc(a.nombre)}</td><td>${a.tipo}</td><td>${a.cantidad}</td><td>${Store.esc(a.motivo)}</td>
    <td>${b('Consultar', 'consultarAjuste', a.id, 'sec')}${b('Modificar', 'modificarAjuste', a.id, 'sec')}${b('Eliminar', 'eliminarAjuste', a.id, 'peligro')}</td></tr>`).join('');
}
$('formMed').addEventListener('submit', nuevoMed);
$('formAjuste').addEventListener('submit', altaAjuste);
render();
