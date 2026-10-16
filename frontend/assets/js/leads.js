(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ESTADOS = { nuevo: "Nuevo", contactado: "Contactado", en_proceso: "En proceso", ganado: "Ganado", descartado: "Descartado" };

  let leads = [];
  let cargado = false;
  let detalleId = null;
  let eliminandoId = null;
  let temporizadorToast = null;

  function aviso(texto, tipo = "ok") {
    const t = $("toast");
    t.textContent = texto;
    t.className = `toast visible ${tipo}`;
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => t.classList.remove("visible"), 3500);
  }

  async function mensajeError(resp) {
    try {
      const j = await resp.json();
      if (typeof j.detail === "string") return j.detail;
    } catch {}
    return "No se pudo completar la acción.";
  }

  const fechaHora = (iso) => new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  const claseNota = (p) => (p >= 80 ? "ok" : p >= 50 ? "aviso" : "error");

  function enlaceWhatsapp(l) {
    let d = String(l.telefono || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.length === 9) d = "51" + d;
    const msg = `Hola ${l.nombre}, te escribo de ConsigueVentas. Vi que analizaste ${l.url_analizada} en nuestro diagnóstico gratuito y me gustaría ayudarte a mejorar los puntos que salieron.`;
    return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
  }

  function enlaceCorreo(l) {
    const asunto = "Tu diagnóstico web · ConsigueVentas";
    const cuerpo = `Hola ${l.nombre},\n\nVi que analizaste ${l.url_analizada} en nuestro diagnóstico gratuito. Me gustaría ayudarte a mejorar los puntos que salieron.\n\nSaludos,\nConsigueVentas`;
    return `mailto:${encodeURIComponent(l.correo)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }

  function opciones(actual) {
    return Object.entries(ESTADOS)
      .map(([v, t]) => `<option value="${v}"${actual === v ? " selected" : ""}>${t}</option>`)
      .join("");
  }

  function visibles() {
    const q = $("buscador-leads").value.trim().toLowerCase();
    const est = $("filtro-estado-leads").value;
    return leads.filter((l) =>
      (est === "todos" || l.estado === est) &&
      (!q || [l.nombre, l.correo, l.telefono, l.url_analizada].some((x) => String(x || "").toLowerCase().includes(q))));
  }

  function tarjetas() {
    const semana = Date.now() - 7 * 86400000;
    const conPuntaje = leads.filter((l) => l.puntaje_global !== null && l.puntaje_global !== undefined);
    $("lead-total").textContent = leads.length;
    $("lead-nuevos").textContent = leads.filter((l) => l.estado === "nuevo").length;
    $("lead-semana").textContent = leads.filter((l) => new Date(l.creado_en).getTime() >= semana).length;
    $("lead-puntaje").textContent = conPuntaje.length
      ? Math.round(conPuntaje.reduce((a, l) => a + l.puntaje_global, 0) / conPuntaje.length)
      : "—";
  }

  const svg = (contenido) =>
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;
  const ICONOS = {
    ver: svg('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
    whatsapp: svg('<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"/>'),
    correo: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>'),
    borrar: svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'),
  };

  function fila(l) {
    const wa = enlaceWhatsapp(l);
    const p = l.puntaje_global;
    const f = new Date(l.creado_en);
    const dia = f.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const hora = f.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    return `<tr data-id="${l.id}">
      <td><div class="fecha-dia">${dia}</div><div class="fecha-hora">${hora}</div></td>
      <td>
        <div class="sitio-nombre" title="${esc(l.nombre)}">${esc(l.nombre)}</div>
        <div class="sitio-url" title="${esc(l.correo)}">${esc(l.correo)}</div>
        ${l.telefono ? `<div class="sitio-url">${esc(l.telefono)}</div>` : ""}
      </td>
      <td><div class="sitio-url" title="${esc(l.url_analizada)}">${esc(l.url_analizada)}</div></td>
      <td>${p === null || p === undefined ? "—" : `<span class="badge ${claseNota(p)}">${p}/100</span>`}</td>
      <td><select class="sel-estado" aria-label="Estado">${opciones(l.estado)}</select></td>
      <td>
        <div class="iconos-fila">
          <button type="button" class="btn-icono" data-accion="ver" title="Ver detalle" aria-label="Ver detalle">${ICONOS.ver}</button>
          ${wa ? `<a class="btn-icono" href="${esc(wa)}" target="_blank" rel="noopener noreferrer" title="Escribir por WhatsApp" aria-label="Escribir por WhatsApp">${ICONOS.whatsapp}</a>` : ""}
          <a class="btn-icono" href="${esc(enlaceCorreo(l))}" title="Enviar correo" aria-label="Enviar correo">${ICONOS.correo}</a>
          <button type="button" class="btn-icono peligro-suave" data-accion="eliminar" title="Eliminar" aria-label="Eliminar">${ICONOS.borrar}</button>
        </div>
      </td>
    </tr>`;
  }

  function pintar() {
    tarjetas();
    const filas = visibles();
    $("resumen-leads").textContent = `${filas.length} de ${leads.length} contactos`;
    if (!filas.length) {
      const texto = leads.length
        ? "Ningún contacto coincide con los filtros."
        : "Aún no hay contactos. Aparecerán aquí cuando alguien use el diagnóstico gratuito.";
      $("tbody-leads").innerHTML = `<tr><td colspan="6" class="estado-vacio">${texto}</td></tr>`;
      return;
    }
    $("tbody-leads").innerHTML = filas.map(fila).join("");
  }

  async function cargar() {
    if (!cargado) {
      $("tbody-leads").innerHTML = `<tr><td colspan="6" class="estado-carga">Cargando contactos...</td></tr>`;
    }
    try {
      const resp = await apiFetch(`${API_BASE}/leads/`);
      if (resp.status === 403) {
        $("tbody-leads").innerHTML = `<tr><td colspan="6" class="estado-vacio">Solo los administradores pueden ver los leads.</td></tr>`;
        return;
      }
      if (!resp.ok) throw new Error();
      leads = await resp.json();
      cargado = true;
      pintar();
    } catch {
      $("tbody-leads").innerHTML = `<tr><td colspan="6" class="estado-vacio">No se pudo cargar la lista de contactos.</td></tr>`;
    }
  }

  async function guardar(id, cambios) {
    const resp = await apiFetch(`${API_BASE}/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    if (!resp.ok) throw new Error(await mensajeError(resp));
    const actualizado = await resp.json();
    const i = leads.findIndex((l) => l.id === id);
    if (i >= 0) leads[i] = { ...leads[i], ...actualizado };
    return actualizado;
  }

  // ---------- Cambio de estado desde la tabla ----------
  $("tbody-leads").addEventListener("change", async (e) => {
    const sel = e.target.closest(".sel-estado");
    if (!sel) return;
    const id = Number(sel.closest("tr").dataset.id);
    const anterior = leads.find((l) => l.id === id)?.estado;
    try {
      await guardar(id, { estado: sel.value });
      aviso("Estado actualizado");
      tarjetas();
    } catch (err) {
      sel.value = anterior;
      aviso(err.message, "error");
    }
  });

  $("tbody-leads").addEventListener("click", (e) => {
    const boton = e.target.closest("button[data-accion]");
    if (!boton) return;
    const id = Number(boton.closest("tr").dataset.id);
    if (boton.dataset.accion === "ver") abrirDetalle(id);
    if (boton.dataset.accion === "eliminar") abrirEliminar(id);
  });

  // ---------- Detalle ----------
  function htmlInforme(inf) {
    if (!inf || !inf.categorias) {
      return `<p class="det-nota">Este contacto no tiene informe guardado (se registró antes de esta función).</p>`;
    }
    return inf.categorias.map((c) => {
      const fallos = (c.hallazgos || []).filter((h) => !h.ok);
      const clase = c.estado === "ok" ? "ok" : c.estado === "atencion" ? "aviso" : "error";
      const lista = fallos.length
        ? `<ul class="det-fallos">${fallos.map((h) =>
            `<li>${esc(h.texto)}${h.solucion ? `<small>${esc(h.solucion)}</small>` : ""}</li>`).join("")}</ul>`
        : `<p class="det-nota">Sin problemas en esta categoría.</p>`;
      return `<div class="det-cat">
        <div class="det-cat-cab"><strong>${esc(c.titulo)}</strong><span class="badge ${clase}">${c.puntaje}/100</span></div>
        ${lista}
      </div>`;
    }).join("");
  }

  async function abrirDetalle(id) {
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    detalleId = id;
    $("det-titulo").textContent = l.nombre;
    $("det-contacto").textContent = `${l.correo}${l.telefono ? " · " + l.telefono : ""} · registrado el ${fechaHora(l.creado_en)}`;
    $("det-sitio").textContent = `Sitio analizado: ${l.url_analizada}`;
    $("det-estado").innerHTML = opciones(l.estado);
    $("det-notas").value = l.notas || "";
    $("det-puntaje").textContent = l.puntaje_global != null ? `· ${l.puntaje_global}/100` : "";
    $("error-det-lead").classList.remove("visible");
    $("det-informe").innerHTML = `<div class="estado-carga">Cargando informe...</div>`;
    $("dlg-lead").showModal();
    try {
      const resp = await apiFetch(`${API_BASE}/leads/${id}`);
      if (!resp.ok) throw new Error();
      const d = await resp.json();
      if (detalleId === id) $("det-informe").innerHTML = htmlInforme(d.informe);
    } catch {
      $("det-informe").innerHTML = `<p class="det-nota">No se pudo cargar el informe.</p>`;
    }
  }

  $("btn-guardar-lead").addEventListener("click", async () => {
    const boton = $("btn-guardar-lead");
    boton.disabled = true;
    try {
      await guardar(detalleId, { estado: $("det-estado").value, notas: $("det-notas").value });
      $("dlg-lead").close();
      aviso("Cambios guardados");
      pintar();
    } catch (err) {
      $("error-det-lead").textContent = err.message;
      $("error-det-lead").classList.add("visible");
    } finally {
      boton.disabled = false;
    }
  });
  $("btn-cerrar-lead").addEventListener("click", () => $("dlg-lead").close());

  // ---------- Eliminar ----------
  function abrirEliminar(id) {
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    eliminandoId = id;
    $("dlg-eliminar-lead-texto").innerHTML =
      `Se eliminarán los datos de <b>${esc(l.nombre)}</b> (${esc(l.correo)}). Esta acción no se puede deshacer.`;
    $("dlg-eliminar-lead").showModal();
  }

  $("btn-cancelar-eliminar-lead").addEventListener("click", () => $("dlg-eliminar-lead").close());
  $("btn-confirmar-eliminar-lead").addEventListener("click", async () => {
    const boton = $("btn-confirmar-eliminar-lead");
    boton.disabled = true;
    try {
      const resp = await apiFetch(`${API_BASE}/leads/${eliminandoId}`, { method: "DELETE" });
      if (!resp.ok) throw new Error(await mensajeError(resp));
      leads = leads.filter((l) => l.id !== eliminandoId);
      $("dlg-eliminar-lead").close();
      aviso("Contacto eliminado");
      pintar();
    } catch (err) {
      aviso(err.message, "error");
    } finally {
      boton.disabled = false;
    }
  });

  // ---------- Exportar CSV ----------
    // ---------- Exportar a Excel ----------
  const COLORES_ESTADO = {
    nuevo: ["FFDBEAFE", "FF1E40AF"],
    contactado: ["FFFEF3C7", "FF92400E"],
    en_proceso: ["FFEDE9FE", "FF5B21B6"],
    ganado: ["FFD1FAE5", "FF065F46"],
    descartado: ["FFE5E7EB", "FF374151"],
  };
  function coloresPuntaje(p) {
    if (p >= 80) return ["FFD1FAE5", "FF065F46"];
    if (p >= 50) return ["FFFEF3C7", "FF92400E"];
    return ["FFFEE2E2", "FF991B1B"];
  }
  const relleno = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
  const bordeFino = { style: "thin", color: { argb: "FFD1D5DB" } };
  const bordes = { top: bordeFino, left: bordeFino, bottom: bordeFino, right: bordeFino };
  // Excel no guarda zona horaria: se desplaza la fecha para que muestre la hora local.
  const comoLocal = (iso) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000); };
  const hoyTexto = () => new Date().toISOString().slice(0, 10);

  function descargar(blob, nombre) {
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  }

  function cargarExcelJS() {
    if (window.ExcelJS) return Promise.resolve();
    return new Promise((resolver, rechazar) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
      s.onload = resolver;
      s.onerror = () => rechazar(new Error("No se pudo cargar el generador de Excel"));
      document.head.appendChild(s);
    });
  }

  // Respaldo: CSV con separador explícito para que Excel lo abra en columnas.
  const dos = (n) => String(n).padStart(2, "0");
  function fechaCSV(iso) {
    const d = new Date(iso);
    return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
  }
  function celdaCSV(valor, proteger = true) {
    let s = String(valor ?? "");
    if (proteger && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function exportarCSV(filas) {
    const cab = ["N.°", "Fecha de registro", "Nombre", "Correo", "Teléfono", "Sitio analizado", "Puntaje", "Estado", "Notas de seguimiento"];
    const lineas = ["sep=;", cab.join(";")].concat(filas.map((l, i) => [
      i + 1, fechaCSV(l.creado_en), l.nombre, l.correo, l.telefono, l.url_analizada,
      l.puntaje_global, ESTADOS[l.estado] || l.estado, l.notas,
    ].map((v, k) => celdaCSV(v, k !== 4)).join(";")));
    descargar(new Blob(["\ufeff" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" }),
      `leads-consigueventas-${hoyTexto()}.csv`);
  }

  async function exportarExcel() {
    const filas = visibles();
    if (!filas.length) { aviso("No hay contactos para exportar", "error"); return; }
    const boton = $("btn-exportar-leads");
    boton.disabled = true;
    boton.textContent = "Generando...";
    try {
      await cargarExcelJS();
      const wb = new ExcelJS.Workbook();
      wb.creator = "Monitor ConsigueVentas";
      wb.created = new Date();

      // ----- Hoja 1: Resumen -----
      const res = wb.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
      res.columns = [{ width: 28 }, { width: 24 }];
      res.mergeCells("A1:B1");
      const titulo = res.getCell("A1");
      titulo.value = "Reporte de leads · ConsigueVentas";
      titulo.font = { size: 16, bold: true, color: { argb: "FF0F766E" } };
      res.getRow(1).height = 28;

      const est = $("filtro-estado-leads").value;
      const q = $("buscador-leads").value.trim();
      const conPuntaje = filas.filter((l) => l.puntaje_global != null);
      const promedio = conPuntaje.length
        ? Math.round(conPuntaje.reduce((a, l) => a + l.puntaje_global, 0) / conPuntaje.length)
        : "—";
      const datos = [
        ["Generado el", new Date().toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })],
        ["Filtro de estado", est === "todos" ? "Todos" : ESTADOS[est]],
        ["Búsqueda", q || "—"],
        ["Contactos incluidos", filas.length],
        ["Puntaje promedio", promedio],
      ];
      datos.forEach(([clave, valor], i) => {
        const r = res.getRow(3 + i);
        r.getCell(1).value = clave;
        r.getCell(1).font = { bold: true, color: { argb: "FF374151" } };
        r.getCell(2).value = valor;
        r.getCell(2).alignment = { horizontal: "left" };
      });

      const filaCab = 3 + datos.length + 1;
      ["Estado", "Contactos"].forEach((texto, i) => {
        const c = res.getRow(filaCab).getCell(i + 1);
        c.value = texto;
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = relleno("FF0F766E");
        c.alignment = { horizontal: i ? "center" : "left" };
      });
      Object.entries(ESTADOS).forEach(([clave, texto], i) => {
        const r = res.getRow(filaCab + 1 + i);
        const [bg, fg] = COLORES_ESTADO[clave];
        r.getCell(1).value = texto;
        r.getCell(1).fill = relleno(bg);
        r.getCell(1).font = { bold: true, color: { argb: fg } };
        r.getCell(1).border = bordes;
        r.getCell(2).value = filas.filter((l) => l.estado === clave).length;
        r.getCell(2).alignment = { horizontal: "center" };
        r.getCell(2).border = bordes;
      });

      // ----- Hoja 2: Contactos -----
      const hoja = wb.addWorksheet("Contactos", { views: [{ state: "frozen", ySplit: 1 }] });
      hoja.columns = [
        { header: "N.°", key: "n", width: 6 },
        { header: "Fecha de registro", key: "fecha", width: 20 },
        { header: "Nombre", key: "nombre", width: 26 },
        { header: "Correo", key: "correo", width: 32 },
        { header: "Teléfono / WhatsApp", key: "telefono", width: 20 },
        { header: "Sitio analizado", key: "sitio", width: 34 },
        { header: "Puntaje", key: "puntaje", width: 10 },
        { header: "Estado", key: "estado", width: 16 },
        { header: "Notas de seguimiento", key: "notas", width: 44 },
      ];
      const cab = hoja.getRow(1);
      cab.height = 26;
      cab.eachCell((c) => {
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = relleno("FF0F766E");
        c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        c.border = bordes;
      });

      filas.forEach((l, i) => {
        const r = hoja.addRow({
          n: i + 1,
          fecha: comoLocal(l.creado_en),
          nombre: l.nombre,
          correo: l.correo,
          telefono: l.telefono || "",
          sitio: l.url_analizada,
          puntaje: l.puntaje_global ?? "",
          estado: ESTADOS[l.estado] || l.estado,
          notas: l.notas || "",
        });
        r.eachCell({ includeEmpty: true }, (c) => {
          c.border = bordes;
          c.alignment = { vertical: "middle", wrapText: true };
        });
        r.getCell("fecha").numFmt = "dd/mm/yyyy hh:mm";
        r.getCell("telefono").numFmt = "@";
        ["n", "puntaje", "estado"].forEach((k) => {
          r.getCell(k).alignment = { vertical: "middle", horizontal: "center" };
        });
        if (l.puntaje_global != null) {
          const [bg, fg] = coloresPuntaje(l.puntaje_global);
          r.getCell("puntaje").fill = relleno(bg);
          r.getCell("puntaje").font = { bold: true, color: { argb: fg } };
        }
        const [bgE, fgE] = COLORES_ESTADO[l.estado] || COLORES_ESTADO.descartado;
        r.getCell("estado").fill = relleno(bgE);
        r.getCell("estado").font = { bold: true, color: { argb: fgE } };
      });

      hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columns.length } };
      hoja.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

      const buffer = await wb.xlsx.writeBuffer();
      descargar(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `leads-consigueventas-${hoyTexto()}.xlsx`,
      );
      aviso("Archivo de Excel generado");
    } catch {
      exportarCSV(filas);
      aviso("No se pudo generar el Excel; se descargó un CSV", "error");
    } finally {
      boton.disabled = false;
      boton.textContent = "Exportar Excel";
    }
  }
  $("btn-exportar-leads").addEventListener("click", exportarExcel);

  $("buscador-leads").addEventListener("input", pintar);
  $("filtro-estado-leads").addEventListener("change", pintar);

  // ---------- Navegación ----------
  function alCambiarVista() {
    if ((location.hash.slice(1) || "panel") === "leads") cargar();
  }
  window.addEventListener("hashchange", alCambiarVista);
  alCambiarVista();
})();