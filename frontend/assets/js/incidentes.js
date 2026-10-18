(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let lista = [];
  let cargado = false;

  function fechaDosLineas(iso) {
    const d = new Date(iso);
    const dia = d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const hora = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    return `<div class="fecha-dia">${dia}</div><div class="fecha-hora">${hora}</div>`;
  }

  function duracion(seg) {
    if (seg === null || seg === undefined) return "—";
    if (seg < 60) return "menos de 1 min";
    const min = Math.round(seg / 60);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) {
      const m = min % 60;
      return m ? `${h} h ${m} min` : `${h} h`;
    }
    const d = Math.floor(h / 24);
    const resto = h % 24;
    return resto ? `${d} d ${resto} h` : `${d} d`;
  }

  function porSitio() {
    const sitio = $("inc-sitio").value;
    return lista.filter((i) => !sitio || String(i.sitio_id) === sitio);
  }

  function visibles() {
    const estado = $("inc-estado").value;
    return porSitio().filter((i) =>
      estado === "todos" || (estado === "abiertos" ? i.abierto : !i.abierto));
  }

  function llenarSitios() {
    const sel = $("inc-sitio");
    const actual = sel.value;
    const unicos = new Map();
    lista.forEach((i) => unicos.set(i.sitio_id, i.nombre_cliente));
    const opciones = [...unicos.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
    sel.innerHTML = `<option value="">Todos los sitios</option>` +
      opciones.map(([id, nombre]) => `<option value="${id}">${esc(nombre)}</option>`).join("");
    sel.value = unicos.has(Number(actual)) ? actual : "";
  }

  function tarjetas() {
    const base = porSitio();
    const resueltos = base.filter((i) => !i.abierto);
    $("inc-total").textContent = base.length;
    $("inc-abiertos").textContent = base.filter((i) => i.abierto).length;
    $("inc-promedio").textContent = resueltos.length
      ? duracion(Math.round(resueltos.reduce((a, i) => a + i.duracion_seg, 0) / resueltos.length))
      : "—";

    const conteo = new Map();
    base.forEach((i) => {
      const c = conteo.get(i.sitio_id) || { nombre: i.nombre_cliente, n: 0 };
      c.n += 1;
      conteo.set(i.sitio_id, c);
    });
    const top = [...conteo.values()].sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, "es"))[0];
    $("inc-top").textContent = top ? `${top.nombre} (${top.n})` : "—";
  }

  function fila(i) {
    return `<tr class="${i.abierto ? "fila-abierta" : ""}">
      <td>
        <div class="sitio-nombre" title="${esc(i.nombre_cliente)}">${esc(i.nombre_cliente)}</div>
        <div class="sitio-url" title="${esc(i.url)}">${esc(i.url)}</div>
      </td>
      <td>${fechaDosLineas(i.inicio)}</td>
      <td>${i.fin ? fechaDosLineas(i.fin) : "—"}</td>
      <td>${duracion(i.duracion_seg)}${i.abierto ? '<div class="fecha-hora">y contando</div>' : ""}</td>
      <td>${i.codigo_http ?? "Sin respuesta"}</td>
      <td>${i.chequeos_fallidos}</td>
      <td><span class="badge ${i.abierto ? "error" : "ok"}">${i.abierto ? "Abierto" : "Resuelto"}</span></td>
    </tr>`;
  }

  function pintar() {
    tarjetas();
    const filas = visibles();
    $("resumen-incidentes").textContent = `${filas.length} de ${lista.length} incidentes`;
    if (!filas.length) {
      const texto = lista.length
        ? "Ningún incidente coincide con los filtros."
        : "Sin incidentes en este periodo. Todos los sitios respondieron bien.";
      $("tbody-incidentes").innerHTML = `<tr><td colspan="7" class="estado-vacio">${texto}</td></tr>`;
      return;
    }
    $("tbody-incidentes").innerHTML = filas.map(fila).join("");
  }

  async function cargar() {
    if (!cargado) {
      $("tbody-incidentes").innerHTML = `<tr><td colspan="7" class="estado-carga">Cargando incidentes...</td></tr>`;
    } else {
      $("resumen-incidentes").textContent = "Actualizando...";
    }
    try {
      const resp = await apiFetch(`${API_BASE}/incidentes/?dias=${$("inc-periodo").value}`);
      if (!resp.ok) throw new Error();
      lista = await resp.json();
      cargado = true;
      llenarSitios();
      pintar();
    } catch {
      $("tbody-incidentes").innerHTML = `<tr><td colspan="7" class="estado-vacio">No se pudo cargar la lista de incidentes.</td></tr>`;
    }
  }

  $("inc-periodo").addEventListener("change", cargar);
  $("inc-sitio").addEventListener("change", pintar);
  $("inc-estado").addEventListener("change", pintar);

  // ---------- Navegación ----------
  function alCambiarVista() {
    if ((location.hash.slice(1) || "panel") === "incidentes") cargar();
  }
  window.addEventListener("hashchange", alCambiarVista);
  alCambiarVista();
})();