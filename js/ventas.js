/* Lógica de ventas (vista visual): tarjetas "en curso" + historial.
   En curso = en_proceso / preventa. Al pagar (o anular) la venta pasa al historial. */
Store.renderNav('ventas');
const $ = id => document.getElementById(id);
let items = [], editId = null;
const timers = {};  // temporizadores de validación por venta
const estados = {}; // texto de progreso por venta (validando, reintentos)

function aviso(texto, tipo) { $('msg').className = 'aviso ' + tipo; $('msg').textContent = texto; }
const getVenta = id => Store.getAll('ventas').find(v => v.id === id);
const getMed = id => Store.getAll('medicamentos').find(m => m.id === id);
const totalDe = lista => lista.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);

/* ---------- Ventanas (modales) ---------- */
const abrir = id => { $(id).hidden = false; };
const cerrar = id => { $(id).hidden = true; };
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.hidden = true; }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') ['modalForm', 'modalInfo'].forEach(cerrar); });

/* ---------- Formulario de atención ---------- */
function llenarSelect() {
  $('selMed').innerHTML = Store.getAll('medicamentos').map(m => `<option value="${m.id}">${Store.esc(m.nombre)} (stock ${m.stock})</option>`).join('');
}
function nuevaAtencion() { limpiarForm(); abrir('modalForm'); }
function agregarItem() {
  const m = getMed(+$('selMed').value), cant = +$('cantidad').value;
  if (!m || cant < 1) return;
  const ex = items.find(i => i.medicamentoId === m.id);
  if (ex) ex.cantidad += cant; else items.push({ medicamentoId: m.id, nombre: m.nombre, cantidad: cant, precioUnitario: m.precio });
  renderItems();
}
function quitarItem(n) { items.splice(n, 1); renderItems(); }
function renderItems() {
  $('listaItems').innerHTML = items.map((i, n) => `<li>💊 ${Store.esc(i.nombre)} × ${i.cantidad} · ${Store.formatMoney(i.cantidad * i.precioUnitario)}
    <button type="button" onclick="quitarItem(${n})" title="Quitar">✕</button></li>`).join('') || '<li class="vacio-i">Todavía no agregaste medicamentos</li>';
  $('totalItems').textContent = Store.formatMoney(totalDe(items));
}
function limpiarForm() {
  $('form').reset(); items = []; editId = null; renderItems();
  $('tituloForm').textContent = '🩺 Nueva atención'; $('btnGuardar').textContent = '✅ Guardar atención';
}
function guardarVenta(e) {
  e.preventDefault();
  if (!items.length) return aviso('Agregá al menos un medicamento.', 'err');
  const datos = { paciente: $('paciente').value, dni: $('dni').value, obraSocial: $('obraSocial').value,
    numeroReceta: $('receta').value, items: [...items], total: totalDe(items) };
  if (editId) Store.update('ventas', editId, { ...datos, estadoValidacion: 'pendiente' });
  else Store.add('ventas', { ...datos, numero: 'V-' + String(Store.nextId(Store.getAll('ventas'))).padStart(4, '0'),
    fecha: Store.hoy(), estadoValidacion: 'pendiente', estadoVenta: 'en_proceso' });
  limpiarForm(); cerrar('modalForm'); cambiarTab('curso');
  aviso('Atención guardada. Ahora validá la receta 👇', 'ok'); renderTodo();
}

/* ---------- Stock ---------- */
function hayStock(v) { return v.items.every(i => { const m = getMed(i.medicamentoId); return m && m.stock >= i.cantidad; }); }
function cancelarPorStock(v) {
  delete estados[v.id];
  Store.update('ventas', v.id, { estadoVenta: 'anulada' });
  aviso('Sin stock — proceso cancelado', 'err'); renderTodo();
}
function moverStock(v, signo) { // -1 descuenta, +1 devuelve
  v.items.forEach(i => { const m = getMed(i.medicamentoId); if (m) Store.update('medicamentos', m.id,
    { stock: m.stock + signo * i.cantidad, vendidosHistoricos: Math.max(0, m.vendidosHistoricos - signo * i.cantidad) }); });
}

/* ---------- Validación ---------- */
function validarOnline(id, intento = 0) {
  const v = getVenta(id);
  if (!v || v.estadoVenta !== 'en_proceso' || v.estadoValidacion !== 'pendiente') return;
  if (!hayStock(v)) return cancelarPorStock(v);
  estados[id] = intento ? `Reintentando validación (${intento}/3)…` : 'Validando con el servicio online…';
  renderTodo();
  timers[id] = setTimeout(() => {
    const r = Math.random();
    if (r < 0.7) { delete estados[id]; Store.update('ventas', id, { estadoValidacion: 'autorizada_online' }); aviso('Receta autorizada online ✔', 'ok'); }
    else if (r < 0.94) { // servicio caído: reintentos automáticos
      if (intento < 3) {
        estados[id] = `Servicio caído. Reintento automático ${intento + 1}/3 en 5 s…`;
        aviso('El servicio online no responde. Reintentamos solos, o podés autorizar manualmente.', 'warn');
        timers[id] = setTimeout(() => validarOnline(id, intento + 1), 5000);
      } else { delete estados[id]; aviso('Reintentos agotados. Usá "Autorizar manual".', 'err'); }
    } else { delete estados[id]; Store.update('ventas', id, { estadoValidacion: 'rechazada', estadoVenta: 'anulada' });
      aviso('Receta rechazada. La venta pasó al historial.', 'err'); }
    renderTodo();
  }, 1500);
}
function autorizarManual(id) {
  clearTimeout(timers[id]); delete estados[id];
  Store.update('ventas', id, { estadoValidacion: 'autorizada_manual' });
  aviso('Autorizada manualmente por el farmacéutico ✔', 'ok'); renderTodo();
}

/* ---------- Preventa, pago, anulación, edición ---------- */
function emitirPreventa(id) {
  const v = getVenta(id);
  if (!v.estadoValidacion.startsWith('autorizada')) return aviso('Falta validación autorizada.', 'err');
  if (!hayStock(v)) return cancelarPorStock(v);
  Store.update('ventas', id, { estadoVenta: 'preventa' }); renderTodo(); verTicket(id, '🎫 Ticket de preventa');
}
function registrarPago(id) {
  const v = getVenta(id);
  if (!hayStock(v)) return cancelarPorStock(v);
  moverStock(v, -1); Store.update('ventas', id, { estadoVenta: 'pagada' });
  aviso('¡Pago registrado! Stock descontado y venta enviada al historial.', 'ok'); renderTodo(); verTicket(id, '💳 Comprobante de pago');
}
function anular(id) {
  const v = getVenta(id);
  if (!confirm('¿Anular la venta ' + v.numero + '?')) return;
  clearTimeout(timers[id]); delete estados[id];
  if (v.estadoVenta === 'pagada') moverStock(v, +1); // devuelve stock
  Store.update('ventas', id, { estadoVenta: 'anulada' }); aviso('Venta anulada y enviada al historial.', 'warn'); renderTodo();
}
function modificar(id) {
  const v = getVenta(id);
  clearTimeout(timers[id]); delete estados[id];
  editId = id; items = v.items.map(i => ({ ...i }));
  $('paciente').value = v.paciente; $('dni').value = v.dni; $('obraSocial').value = v.obraSocial; $('receta').value = v.numeroReceta;
  $('tituloForm').textContent = '✏️ Modificar atención ' + v.numero; $('btnGuardar').textContent = '✅ Guardar cambios';
  renderItems(); renderTodo(); abrir('modalForm');
}
function verTicket(id, titulo = '👁️ Detalle de venta') {
  const v = getVenta(id);
  $('infoBody').innerHTML = `<div class="ticket" style="margin:auto"><h3 style="margin-top:0">${titulo} · ${v.numero}</h3>
    <p>${v.fecha}<br>${Store.esc(v.paciente)} (DNI ${Store.esc(v.dni)})<br>${Store.esc(v.obraSocial)} · Receta ${Store.esc(v.numeroReceta)}</p>
    <ul class="items">${v.items.map(i => `<li>${Store.esc(i.nombre)} × ${i.cantidad} — ${Store.formatMoney(i.cantidad * i.precioUnitario)}</li>`).join('')}</ul>
    <b style="font-size:1.2rem">Total: ${Store.formatMoney(v.total)}</b>
    <p class="nota">Validación: ${v.estadoValidacion} · Estado: ${v.estadoVenta}</p></div>`;
  abrir('modalInfo');
}
function verListado() {
  $('infoBody').innerHTML = '<h2 style="border:0;margin-top:0">📋 Listado de medicamentos</h2><table><tr><th>Medicamento</th><th>Droga</th><th>Presentación</th><th>Precio</th><th>Stock</th></tr>' +
    Store.getAll('medicamentos').map(m => `<tr><td>${Store.esc(m.nombre)}</td><td>${Store.esc(m.droga)}</td><td>${Store.esc(m.presentacion)}</td><td>${Store.formatMoney(m.precio)}</td><td>${m.stock}</td></tr>`).join('') + '</table>';
  abrir('modalInfo');
}

/* ---------- Vista: ventas en curso (tarjetas) ---------- */
function pasos(v) {
  const ok1 = v.estadoValidacion.startsWith('autorizada'), ok2 = v.estadoVenta === 'preventa';
  const p = (txt, ico, hecho, actual) => `<div class="paso ${hecho ? 'hecho' : actual ? 'actual' : ''}"><span>${hecho ? '✓' : ico}</span>${txt}</div>`;
  return `<div class="pasos">${p('Validar', '🔍', ok1, !ok1)}<i class="${ok1 ? 'hecho' : ''}"></i>${p('Preventa', '🎫', ok2, ok1 && !ok2)}<i class="${ok2 ? 'hecho' : ''}"></i>${p('Pago', '💳', false, ok2)}</div>`;
}
function tarjeta(v) {
  const b = (cls, ico, txt, fn, dis = '') => `<button class="${cls}" ${dis} onclick="${fn}(${v.id})">${ico} ${txt}</button>`;
  let principal, extra = '';
  if (v.estadoVenta === 'preventa') principal = b('btn-main', '💳', 'Registrar pago', 'registrarPago');
  else if (v.estadoValidacion === 'pendiente') {
    principal = b('btn-main', '🔍', 'Validar online', 'validarOnline', estados[v.id] ? 'disabled' : '');
    extra = b('ghost', '✍️', 'Autorizar manual', 'autorizarManual');
  } else principal = b('btn-main', '🎫', 'Emitir ticket de preventa', 'emitirPreventa');
  if (v.estadoVenta === 'en_proceso') extra += b('ghost', '✏️', 'Editar', 'modificar');
  extra += b('ghost', '👁️', 'Ver', 'verTicket') + b('ghost peligro-t', '🗑️', 'Anular', 'anular');
  return `<article class="vcard ${v.estadoVenta}">
    <div class="vhead"><div class="avatar">${Store.esc(v.paciente.charAt(0).toUpperCase())}</div>
      <div><b>${Store.esc(v.paciente)}</b><small>${v.numero} · ${Store.esc(v.obraSocial)} · Receta ${Store.esc(v.numeroReceta)}</small></div>
      <div class="vtotal">${Store.formatMoney(v.total)}</div></div>
    <ul class="vitems">${v.items.map(i => `<li class="chip">💊 ${Store.esc(i.nombre)} × ${i.cantidad}</li>`).join('')}</ul>
    ${pasos(v)}
    ${estados[v.id] ? `<div class="vestado"><span class="spinner"></span>${estados[v.id]}</div>` : ''}
    <div>${principal}</div><div class="vacc">${extra}</div></article>`;
}

/* ---------- Vista: historial ---------- */
function filaHist(v) {
  const est = v.estadoVenta === 'pagada' ? '<span class="badge ok">✅ Pagada</span>'
    : `<span class="badge err">❌ ${v.estadoValidacion === 'rechazada' ? 'Rechazada' : 'Anulada'}</span>`;
  return `<tr><td>${v.numero}</td><td>${v.fecha}</td><td>${Store.esc(v.paciente)}</td><td>${Store.formatMoney(v.total)}</td><td>${est}</td>
    <td><button class="ghost sm" onclick="verTicket(${v.id})">👁️ Ver</button>${v.estadoVenta === 'pagada' ? `<button class="ghost sm peligro-t" onclick="anular(${v.id})">🗑️ Anular</button>` : ''}</td></tr>`;
}

/* ---------- Render general ---------- */
function cambiarTab(t) {
  $('vistaCurso').hidden = t !== 'curso'; $('vistaHist').hidden = t !== 'hist';
  $('tabCurso').classList.toggle('activo', t === 'curso'); $('tabHist').classList.toggle('activo', t === 'hist');
}
function renderTodo() {
  llenarSelect();
  const ventas = Store.getAll('ventas');
  const curso = ventas.filter(v => v.estadoVenta === 'en_proceso' || v.estadoVenta === 'preventa');
  const hist = ventas.filter(v => v.estadoVenta === 'pagada' || v.estadoVenta === 'anulada').reverse();
  $('cntCurso').textContent = curso.length; $('cntHist').textContent = hist.length;
  $('cards').innerHTML = curso.map(tarjeta).join('') || `<div class="vacio" style="grid-column:1/-1"><div class="big">🌿</div>
    <h3>No hay ventas en curso</h3><p>Cuando llegue un paciente, tocá <b>Nueva atención</b> para empezar.</p>
    <button class="btn-main" style="max-width:260px" onclick="nuevaAtencion()">➕ Nueva atención</button></div>`;
  $('vistaHist').innerHTML = hist.length ? '<table><tr><th>N°</th><th>Fecha</th><th>Paciente</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>' + hist.map(filaHist).join('') + '</table>'
    : '<div class="vacio"><div class="big">🧾</div><h3>El historial está vacío</h3><p>Las ventas pagadas o anuladas aparecen acá.</p></div>';
}
$('form').addEventListener('submit', guardarVenta);
renderItems(); renderTodo();
