(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ROLES = { admin: "Administrador", lector: "Lector" };

  let usuarios = [];
  let cargado = false;
  let suspendiendoId = null;
  let temporizadorToast = null;

  function aviso(texto, tipo = "ok") {
    const t = $("toast");
    t.textContent = texto;
    t.className = `toast visible ${tipo}`;
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => t.classList.remove("visible"), 3800);
  }

  async function mensajeError(resp) {
    try {
      const j = await resp.json();
      if (typeof j.detail === "string") return j.detail;
    } catch {}
    return "No se pudo completar la acción.";
  }

  const fechaCorta = (iso) => new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fechaLarga = (iso) => new Date(iso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });

  function haceTiempo(iso) {
    if (!iso) return "Nunca";
    const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seg < 90) return "hace un momento";
    if (seg < 3600) return `hace ${Math.round(seg / 60)} min`;
    if (seg < 86400) return `hace ${Math.round(seg / 3600)} h`;
    const d = Math.round(seg / 86400);
    return `hace ${d} ${d === 1 ? "día" : "días"}`;
  }

  function estadoDe(u) {
    if (u.suspendido) return ["error", "Suspendido"];
    if (!u.confirmado) return ["aviso", "Sin confirmar"];
    return ["ok", "Activo"];
  }

  function opcionesRol(actual) {
    const sel = ROLES[actual] ? actual : "";
    return [["admin", "Administrador"], ["lector", "Lector"], ["", "Sin acceso"]]
      .map(([v, t]) => `<option value="${v}"${sel === v ? " selected" : ""}>${t}</option>`)
      .join("");
  }

  const svg = (contenido) =>
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;
  const ICONOS = {
    suspender: svg('<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>'),
    reactivar: svg('<path d="M20 6L9 17l-5-5"/>'),
  };

  function tarjetas() {
    $("usr-total").textContent = usuarios.length;
    $("usr-admin").textContent = usuarios.filter((u) => u.rol === "admin" && !u.suspendido).length;
    $("usr-lector").textContent = usuarios.filter((u) => u.rol === "lector" && !u.suspendido).length;
    $("usr-sin").textContent = usuarios.filter((u) => !ROLES[u.rol] || u.suspendido).length;
  }

  function visibles() {
    const q = $("buscador-usuarios").value.trim().toLowerCase();
    return usuarios.filter((u) => !q || String(u.email || "").toLowerCase().includes(q));
  }

  function fila(u) {
    const [claseEstado, textoEstado] = estadoDe(u);
    const accion = u.suspendido
      ? `<button type="button" class="btn-icono" data-accion="reactivar" title="Reactivar cuenta" aria-label="Reactivar cuenta"${u.es_yo ? " disabled" : ""}>${ICONOS.reactivar}</button>`
      : `<button type="button" class="btn-icono peligro-suave" data-accion="suspender" title="${u.es_yo ? "No puedes modificar tu propia cuenta" : "Suspender cuenta"}" aria-label="Suspender cuenta"${u.es_yo ? " disabled" : ""}>${ICONOS.suspender}</button>`;
    return `<tr data-id="${esc(u.id)}">
      <td>
        <div class="sitio-nombre" title="${esc(u.email)}">${esc(u.email || "(sin correo)")}${u.es_yo ? ' <span class="tag-yo">tú</span>' : ""}</div>
      </td>
      <td><select class="sel-estado sel-rol" aria-label="Rol"${u.es_yo ? " disabled" : ""}>${opcionesRol(u.rol)}</select></td>
      <td><span class="badge ${claseEstado}">${textoEstado}</span></td>
      <td title="${u.ultimo_acceso ? esc(fechaLarga(u.ultimo_acceso)) : ""}">${haceTiempo(u.ultimo_acceso)}</td>
      <td>${fechaCorta(u.creado_en)}</td>
      <td><div class="iconos-fila">${accion}</div></td>
    </tr>`;
  }

  function pintar() {
    tarjetas();
    const filas = visibles();
    $("resumen-usuarios").textContent = `${filas.length} de ${usuarios.length} cuentas`;
    if (!filas.length) {
      const texto = usuarios.length ? "Ninguna cuenta coincide con la búsqueda." : "No hay cuentas registradas.";
      $("tbody-usuarios").innerHTML = `<tr><td colspan="6" class="estado-vacio">${texto}</td></tr>`;
      return;
    }
    $("tbody-usuarios").innerHTML = filas.map(fila).join("");
  }

  async function cargar() {
    if (!cargado) {
      $("tbody-usuarios").innerHTML = `<tr><td colspan="6" class="estado-carga">Cargando usuarios...</td></tr>`;
    }
    try {
      const resp = await apiFetch(`${API_BASE}/usuarios/`);
      if (resp.status === 403) {
        $("tbody-usuarios").innerHTML = `<tr><td colspan="6" class="estado-vacio">Solo los administradores pueden ver los usuarios.</td></tr>`;
        return;
      }
      if (!resp.ok) throw new Error();
      usuarios = await resp.json();
      cargado = true;
      pintar();
    } catch {
      $("tbody-usuarios").innerHTML = `<tr><td colspan="6" class="estado-vacio">No se pudo cargar la lista de usuarios.</td></tr>`;
    }
  }

  async function guardar(id, cuerpo) {
    const resp = await apiFetch(`${API_BASE}/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (!resp.ok) throw new Error(await mensajeError(resp));
    const actualizado = await resp.json();
    const i = usuarios.findIndex((u) => u.id === id);
    if (i >= 0) usuarios[i] = actualizado;
    return actualizado;
  }

  // ---------- Cambio de rol ----------
  $("tbody-usuarios").addEventListener("change", async (e) => {
    const sel = e.target.closest(".sel-rol");
    if (!sel) return;
    const id = sel.closest("tr").dataset.id;
    const anterior = (usuarios.find((u) => u.id === id) || {}).rol;
    sel.disabled = true;
    try {
      await guardar(id, sel.value ? { rol: sel.value } : { quitar_rol: true });
      aviso("Rol actualizado. Puede tardar hasta un minuto en aplicarse.");
      pintar();
    } catch (err) {
      sel.value = ROLES[anterior] ? anterior : "";
      sel.disabled = false;
      aviso(err.message, "error");
    }
  });

  // ---------- Suspender y reactivar ----------
  $("tbody-usuarios").addEventListener("click", async (e) => {
    const boton = e.target.closest("button[data-accion]");
    if (!boton || boton.disabled) return;
    const id = boton.closest("tr").dataset.id;
    const u = usuarios.find((x) => x.id === id);
    if (!u) return;

    if (boton.dataset.accion === "suspender") {
      suspendiendoId = id;
      $("dlg-suspender-texto").innerHTML =
        `<b>${esc(u.email)}</b> no podrá iniciar sesión y sus sesiones activas dejarán de funcionar en menos de un minuto. Puedes reactivar la cuenta cuando quieras.`;
      $("dlg-suspender").showModal();
    } else {
      boton.disabled = true;
      try {
        await guardar(id, { suspendido: false });
        aviso("Cuenta reactivada");
        pintar();
      } catch (err) {
        aviso(err.message, "error");
        boton.disabled = false;
      }
    }
  });

  $("btn-cancelar-suspender").addEventListener("click", () => $("dlg-suspender").close());
  $("btn-confirmar-suspender").addEventListener("click", async () => {
    const boton = $("btn-confirmar-suspender");
    boton.disabled = true;
    try {
      await guardar(suspendiendoId, { suspendido: true });
      $("dlg-suspender").close();
      aviso("Cuenta suspendida");
      pintar();
    } catch (err) {
      aviso(err.message, "error");
    } finally {
      boton.disabled = false;
    }
  });

  $("buscador-usuarios").addEventListener("input", pintar);

  // ---------- Navegación ----------
  function alCambiarVista() {
    if ((location.hash.slice(1) || "panel") === "usuarios") cargar();
  }
  window.addEventListener("hashchange", alCambiarVista);
  alCambiarVista();
})();