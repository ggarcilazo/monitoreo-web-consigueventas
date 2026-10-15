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

  function fila(l) {
    const wa = enlaceWhatsapp(l);
    const p = l.puntaje_global;
    return `<tr data-id="${l.id}">
      <td>${fechaHora(l.creado_en)}</td>
      <td>
        <div class="sitio-nombre">${esc(l.nombre)}</div>
        <div class="sitio-url">${esc(l.correo)}${l.telefono ? " · " + esc(l.telefono) : ""}</div>
      </td>
      <td><div class="sitio-url">${esc(l.url_analizada)}</div></td>
      <td>${p === null || p === undefined ? "—" : `<span class="badge ${claseNota(p)}">${p}/100</span>`}</td>
      <td><select class="sel-estado" aria-label="Estado">${opciones(l.estado)}</select></td>
      <td>
        <div class="acciones-fila">
          <button type="button" class="secondary" data-accion="ver">Ver detalle</button>
          ${wa ? `<a class="btn-enlace" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ""}
          <a class="btn-enlace" href="${esc(enlaceCorreo(l))}">Correo</a>
          <button type="button" class="secondary peligro-suave" data-accion="eliminar">Eliminar</button>
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
  function celda(valor, proteger = true) {
    let s = String(valor ?? "");
    if (proteger && /^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportar() {
    const filas = visibles();
    if (!filas.length) { aviso("No hay contactos para exportar", "error"); return; }
    const cabecera = ["Fecha", "Nombre", "Correo", "Teléfono", "Sitio", "Puntaje", "Estado", "Notas"];
    const lineas = [cabecera.join(",")].concat(filas.map((l) => [
      celda(fechaHora(l.creado_en)),
      celda(l.nombre),
      celda(l.correo),
      celda(l.telefono, false),
      celda(l.url_analizada),
      celda(l.puntaje_global),
      celda(ESTADOS[l.estado] || l.estado),
      celda(l.notas),
    ].join(",")));
    const blob = new Blob(["\ufeff" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  }
  $("btn-exportar-leads").addEventListener("click", exportar);

  $("buscador-leads").addEventListener("input", pintar);
  $("filtro-estado-leads").addEventListener("change", pintar);

  // ---------- Navegación ----------
  function alCambiarVista() {
    if ((location.hash.slice(1) || "panel") === "leads") cargar();
  }
  window.addEventListener("hashchange", alCambiarVista);
  alCambiarVista();
})();