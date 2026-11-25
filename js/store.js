/* store.js — Datos y helpers compartidos.
   AVISO: sessionStorage se usa SOLO como puente de memoria entre las páginas HTML
   (equivale a mantener los arrays vivos mientras se navega). No es una base de datos:
   se borra al cerrar la pestaña. Si está vacío, seed() carga los datos de ejemplo. */
const Store = {
  getAll(key) { return JSON.parse(sessionStorage.getItem(key) || '[]'); },
  setAll(key, arr) { sessionStorage.setItem(key, JSON.stringify(arr)); },
  nextId(arr) { return arr.reduce((m, x) => Math.max(m, x.id), 0) + 1; },
  add(key, item) {
    const arr = this.getAll(key);
    item.id = this.nextId(arr);
    arr.push(item);
    this.setAll(key, arr);
    return item;
  },
  update(key, id, patch) {
    this.setAll(key, this.getAll(key).map(x => x.id === id ? { ...x, ...patch } : x));
  },
  remove(key, id) { this.setAll(key, this.getAll(key).filter(x => x.id !== id)); },
  formatMoney(n) {
    return '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  hoy() { // fecha local AAAA-MM-DD
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  esc(t) { return String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
  estadoStock(m) { return m.stock <= 0 ? 'SIN STOCK' : m.stock <= m.stockMinimo ? 'BAJO' : 'OK'; },
  badgeStock(m) {
    const e = this.estadoStock(m);
    return `<span class="badge ${e === 'OK' ? 'ok' : e === 'BAJO' ? 'warn' : 'err'}">${e}</span>`;
  },
  renderNav(activa) { // inyecta la barra de navegación
    const links = [['index', 'Inicio'], ['ventas', 'Ventas'], ['stock', 'Stock'], ['reportes', 'Reportes'], ['pedidos', 'Pedidos']];
    document.getElementById('nav').innerHTML = '<nav>' + links.map(([p, t]) =>
      `<a href="${p}.html" class="${p === activa ? 'activo' : ''}">${t}</a>`).join('') + '</nav>';
  },
  seed() { // datos de ejemplo, solo si no hay nada cargado
    if (sessionStorage.getItem('medicamentos')) return;
    const med = (id, nombre, droga, presentacion, precio, stock, stockMinimo, vendidosHistoricos) =>
      ({ id, nombre, droga, presentacion, precio, stock, stockMinimo, vendidosHistoricos });
    this.setAll('medicamentos', [
      med(1, 'Ibupirac 400mg', 'Ibuprofeno', 'Caja x 20 comprimidos', 5200.5, 40, 15, 120),
      med(2, 'Amoxicilina 500mg', 'Amoxicilina', 'Caja x 21 cápsulas', 8900, 8, 12, 80),
      med(3, 'Enalapril 10mg', 'Enalapril', 'Caja x 30 comprimidos', 4300, 0, 10, 55),
      med(4, 'Omeprazol 20mg', 'Omeprazol', 'Caja x 28 cápsulas', 6100, 5, 10, 60),
      med(5, 'Loratadina 10mg', 'Loratadina', 'Caja x 10 comprimidos', 3200, 25, 8, 30),
      med(6, 'Clonazepam 2mg', 'Clonazepam', 'Caja x 30 comprimidos', 7400, 18, 6, 12)
    ]);
    const h = this.hoy();
    this.setAll('ventas', [
      { id: 1, numero: 'V-0001', fecha: h, paciente: 'María Gómez', dni: '30123456', obraSocial: 'OSDE', numeroReceta: 'R-1001',
        items: [{ medicamentoId: 1, nombre: 'Ibupirac 400mg', cantidad: 2, precioUnitario: 5200.5 }], total: 10401,
        estadoValidacion: 'autorizada_online', estadoVenta: 'pagada' },
      { id: 2, numero: 'V-0002', fecha: h, paciente: 'Juan Pérez', dni: '28456789', obraSocial: 'PAMI', numeroReceta: 'R-1002',
        items: [{ medicamentoId: 2, nombre: 'Amoxicilina 500mg', cantidad: 1, precioUnitario: 8900 }], total: 8900,
        estadoValidacion: 'pendiente', estadoVenta: 'en_proceso' },
      { id: 3, numero: 'V-0003', fecha: h, paciente: 'Lucía Fernández', dni: '35987654', obraSocial: 'Swiss Medical', numeroReceta: 'R-1003',
        items: [{ medicamentoId: 4, nombre: 'Omeprazol 20mg', cantidad: 1, precioUnitario: 6100 }], total: 6100,
        estadoValidacion: 'autorizada_manual', estadoVenta: 'preventa' }
    ]);
    this.setAll('ajustes', [
      { id: 1, medicamentoId: 1, nombre: 'Ibupirac 400mg', tipo: 'ingreso', cantidad: 20, motivo: 'Reposición de droguería', fecha: h },
      { id: 2, medicamentoId: 2, nombre: 'Amoxicilina 500mg', tipo: 'egreso', cantidad: 2, motivo: 'Producto vencido', fecha: h }
    ]);
    this.setAll('pedidosDrogueria', []);
  }
};
Store.seed();
