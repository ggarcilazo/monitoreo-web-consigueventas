(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let lista = [];
  let cargado = false;
  let editandoId = null;
  let eliminandoId = null;
  let panelDesactualizado = false;
  let temporizadorToast = null;

  function aviso(texto, tipo = "ok") {
    const t = $("toast");
    t.textContent = texto;
    t.className = `toast visible ${tipo}`;
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => t.classList.remove("visible"), 3500);
  }

  async function detalle(resp) {
    try {
      const j = await resp.json();
      if (typeof j.detail === "string") return j.detail;
      if (resp.status === 422) return "Revisa los datos: el nombre o la dirección no son válidos.";
    } catch {}
    return "No se pudo completar la acción.";
  }

  function fecha(iso) {
    return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  async function cargar() {
    if (!cargado) {
      $("tbody-sitios").innerHTML = `<tr><td colspan="5" class="estado-carga">Cargando sitios...</td></tr>`;
    }
    try {
      const resp = await apiFetch(`${API_BASE}/sitios/`);
      if (!resp.ok) throw new Error();
      lista = await resp.json();
      cargado = true;
      pintar();
    } catch {
      $("tbody-sitios").innerHTML = `<tr><td colspan="5" class="estado-vacio">No se pudo cargar la lista de sitios.</td></tr>`;
    }
  }

  function pintar() {
    const q = $("buscador-sitios").value.trim().toLowerCase();
    const filas = lista.filter((s) =>
      !q || s.nombre_cliente.toLowerCase().includes(q) || s.url.toLowerCase().includes(q));

    const activos = lista.filter((s) => s.activo).length;
    $("resumen-sitios").textContent = `${lista.length} registrados · ${activos} monitoreados`;

    if (filas.length === 0) {
      const texto = lista.length ? "Ningún sitio coincide con la búsqueda." : "Aún no hay sitios registrados.";
      $("tbody-sitios").innerHTML = `<tr><td colspan="5" class="estado-vacio">${texto}</td></tr>`;
      return;
    }

    $("tbody-sitios").innerHTML = filas.map((s) => `
      <tr data-id="${s.id}">
        <td>
          <div class="sitio-nombre">${esc(s.nombre_cliente)}</div>
          <div class="sitio-url">${esc(s.url)}</div>
        </td>
        <td><span class="badge ${s.activo ? "ok" : ""}">${s.activo ? "Monitoreado" : "En pausa"}</span></td>
        <td><span class="badge ${s.oculto ? "" : "ok"}">${s.oculto ? "Oculto" : "Visible"}</span></td>
        <td>${fecha(s.creado_en)}</td>
        <td class="solo-admin">
          <div class="acciones-fila">
            <button type="button" class="secondary" data-accion="editar">Editar</button>
            <button type="button" class="secondary" data-accion="pausar">${s.activo ? "Pausar" : "Reanudar"}</button>
            <button type="button" class="secondary" data-accion="ocultar">${s.oculto ? "Mostrar" : "Ocultar"}</button>
            <button type="button" class="secondary peligro-suave" data-accion="eliminar">Eliminar</button>
          </div>
        </td>
      </tr>`).join("");
  }

  async function cambiar(sitio, cambios, boton, mensaje) {
    boton.disabled = true;
    try {
      const resp = await apiFetch(`${API_BASE}/sitios/${sitio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (!resp.ok) throw new Error(await detalle(resp));
      Object.assign(sitio, await resp.json());
      panelDesactualizado = true;
      aviso(mensaje);
      pintar();
    } catch (err) {
      aviso(err.message || "No se pudo guardar el cambio.", "error");
      boton.disabled = false;
    }
  }

  // ---------- Agregar / editar ----------
  function mostrarErr(texto) {
    const e = $("error-sitio");
    e.textContent = texto;
    e.classList.add("visible");
  }

  function abrirFormulario(sitio = null) {
    editandoId = sitio ? sitio.id : null;
    $("dlg-sitio-titulo").textContent = sitio ? "Editar sitio" : "Agregar sitio";
    $("sitio-nombre").value = sitio ? sitio.nombre_cliente : "";
    $("sitio-url").value = sitio ? sitio.url : "";
    $("sitio-oculto").checked = sitio ? sitio.oculto : false;
    $("error-sitio").classList.remove("visible");
    $("dlg-sitio").showModal();
    $("sitio-nombre").focus();
  }

  $("form-sitio").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("error-sitio").classList.remove("visible");

    const nombre = $("sitio-nombre").value.trim();
    let url = $("sitio-url").value.trim();
    if (nombre.length < 2) { mostrarErr("Escribe el nombre del cliente."); return; }
    if (!url) { mostrarErr("Escribe la dirección del sitio."); return; }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { new URL(url); } catch { mostrarErr("La dirección no es válida."); return; }

    const boton = $("btn-guardar-sitio");
    boton.disabled = true;
    boton.textContent = "Guardando...";
    try {
      const cuerpo = JSON.stringify({ nombre_cliente: nombre, url, oculto: $("sitio-oculto").checked });
      const nuevo = editandoId === null;
      const resp = await apiFetch(nuevo ? `${API_BASE}/sitios/` : `${API_BASE}/sitios/${editandoId}`, {
        method: nuevo ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
      });
      if (!resp.ok) { mostrarErr(await detalle(resp)); return; }

      const guardado = await resp.json();
      $("dlg-sitio").close();
      panelDesactualizado = true;

      if (nuevo) {
        aviso("Sitio agregado. Haciendo el primer chequeo...");
        try { await apiFetch(`${API_BASE}/chequeos/ejecutar/${guardado.id}`, { method: "POST" }); } catch {}
        aviso("Sitio agregado y chequeado");
      } else {
        aviso("Cambios guardados");
      }
      await cargar();
    } catch {
      mostrarErr("No se pudo conectar con el servidor.");
    } finally {
      boton.disabled = false;
      boton.textContent = "Guardar";
    }
  });

  $("btn-cancelar-sitio").addEventListener("click", () => $("dlg-sitio").close());
  $("btn-agregar-sitio").addEventListener("click", () => abrirFormulario());

  // ---------- Eliminar ----------
  function abrirEliminar(sitio) {
    eliminandoId = sitio.id;
    $("dlg-eliminar-texto").innerHTML =
      `Se eliminará <b>${esc(sitio.nombre_cliente)}</b> y todo su historial de chequeos. Esta acción no se puede deshacer.`;
    $("dlg-eliminar").showModal();
  }

  $("btn-cancelar-eliminar").addEventListener("click", () => $("dlg-eliminar").close());

  $("btn-confirmar-eliminar").addEventListener("click", async () => {
    const boton = $("btn-confirmar-eliminar");
    boton.disabled = true;
    try {
      const resp = await apiFetch(`${API_BASE}/sitios/${eliminandoId}`, { method: "DELETE" });
      if (!resp.ok) throw new Error(await detalle(resp));
      lista = lista.filter((s) => s.id !== eliminandoId);
      $("dlg-eliminar").close();
      panelDesactualizado = true;
      aviso("Sitio eliminado");
      pintar();
    } catch (err) {
      aviso(err.message || "No se pudo eliminar.", "error");
    } finally {
      boton.disabled = false;
    }
  });

  // ---------- Acciones de la tabla ----------
  $("tbody-sitios").addEventListener("click", (e) => {
    const boton = e.target.closest("button[data-accion]");
    if (!boton) return;
    const sitio = lista.find((s) => s.id === Number(boton.closest("tr").dataset.id));
    if (!sitio) return;

    switch (boton.dataset.accion) {
      case "editar": abrirFormulario(sitio); break;
      case "pausar":
        cambiar(sitio, { activo: !sitio.activo }, boton,
          sitio.activo ? "Sitio en pausa: ya no se chequea" : "Monitoreo reanudado");
        break;
      case "ocultar":
        cambiar(sitio, { oculto: !sitio.oculto }, boton,
          sitio.oculto ? "El sitio vuelve a mostrarse en el panel" : "Sitio oculto del panel");
        break;
      case "eliminar": abrirEliminar(sitio); break;
    }
  });

  $("buscador-sitios").addEventListener("input", pintar);

  // ---------- Navegación ----------
  function alCambiarVista() {
    const vista = location.hash.slice(1) || "panel";
    if (vista === "sitios") cargar();
    if (vista === "panel" && panelDesactualizado) {
      panelDesactualizado = false;
      if (typeof cargarSitios === "function") cargarSitios();
    }
  }
  window.addEventListener("hashchange", alCambiarVista);
  alCambiarVista();
})();