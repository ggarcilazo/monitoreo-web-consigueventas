const API_BASE = "https://consigueventas.duckdns.org/api";

const contenedorSitios = document.getElementById("sitios");
const btnChequearTodos = document.getElementById("btn-chequear-todos");
const statTotal = document.getElementById("stat-total");
const statOk = document.getElementById("stat-ok");
const statCaidos = document.getElementById("stat-caidos");

let sitiosCache = [];
let ultimosCache = [];
let uptimeCache = {};
let filtroEstado = "todos";
let textoBusqueda = "";
let ordenActual = "nombre";

async function cargarSitios() {
  contenedorSitios.innerHTML = `<div class="estado-carga">Cargando sitios...</div>`;
  try {
    const resp = await apiFetch(`${API_BASE}/sitios/`);
    sitiosCache = await resp.json();
    sitiosCache = sitiosCache.filter(s => !s.oculto);

    if (sitiosCache.length === 0) {
      contenedorSitios.innerHTML = `<div class="estado-vacio">Aún no hay sitios registrados.</div>`;
      actualizarResumen([]);
      return;
    }

    const ultimosChequeos = await Promise.all(
      sitiosCache.map(s => obtenerUltimoChequeo(s.id))
    );

    uptimeCache = await obtenerUptime();
    ultimosCache = ultimosChequeos;
    aplicarFiltros();
    actualizarResumen(ultimosChequeos);
    actualizarUltimoChequeo(ultimosChequeos);
  } catch (err) {
    contenedorSitios.innerHTML = `<div class="estado-vacio">No se pudo conectar con el servidor.</div>`;
  }
}

async function obtenerUltimoChequeo(sitioId) {
  const resp = await apiFetch(`${API_BASE}/chequeos/sitio/${sitioId}`);
  const chequeos = await resp.json();
  return chequeos[0] || null;
}

function estadoDe(c) {
  return !c ? "sin-datos" : (c.disponible ? "ok" : "error");
}

const comparadores = {
  nombre: (a, b) => a.sitio.nombre_cliente.localeCompare(b.sitio.nombre_cliente, "es"),
  estado: (a, b) => {
    const peso = { error: 0, "sin-datos": 1, ok: 2 };
    return peso[estadoDe(a.chequeo)] - peso[estadoDe(b.chequeo)]
      || a.sitio.nombre_cliente.localeCompare(b.sitio.nombre_cliente, "es");
  },
  lento: (a, b) => (b.chequeo?.tiempo_respuesta_ms ?? -1) - (a.chequeo?.tiempo_respuesta_ms ?? -1),
  ssl: (a, b) => (a.chequeo?.ssl_dias_restantes ?? 99999) - (b.chequeo?.ssl_dias_restantes ?? 99999),
};

function aplicarFiltros() {
  const q = textoBusqueda.trim().toLowerCase();
  let filas = sitiosCache.map((s, i) => ({ sitio: s, chequeo: ultimosCache[i] }));

  if (filtroEstado !== "todos") {
    filas = filas.filter(f => estadoDe(f.chequeo) === filtroEstado);
  }
  if (q) {
    filas = filas.filter(f =>
      f.sitio.nombre_cliente.toLowerCase().includes(q) || f.sitio.url.toLowerCase().includes(q)
    );
  }
  filas.sort(comparadores[ordenActual]);

  if (filas.length === 0) {
    contenedorSitios.innerHTML = `<div class="estado-vacio">Ningún sitio coincide con los filtros.</div>`;
    return;
  }
  renderSitios(filas.map(f => f.sitio), filas.map(f => f.chequeo));
}

function setFiltro(estado) {
  filtroEstado = estado;
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("activo", c.dataset.estado === estado));
  document.querySelectorAll(".stat[data-estado]").forEach(s =>
    s.classList.toggle("seleccionado", estado !== "todos" && s.dataset.estado === estado)
  );
  aplicarFiltros();
}

function actualizarUltimoChequeo(chequeos) {
  const fechas = chequeos.filter(Boolean).map(c => new Date(c.ejecutado_en).getTime());
  document.getElementById("ultimo-chequeo").textContent = fechas.length
    ? "Último chequeo: " + new Date(Math.max(...fechas)).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
    : "";
}

async function obtenerUptime() {
  try {
    const resp = await apiFetch(`${API_BASE}/chequeos/uptime`);
    if (!resp.ok) return {};
    const lista = await resp.json();
    return Object.fromEntries(lista.map(u => [u.sitio_id, u]));
  } catch {
    return {};
  }
}

function formatoFecha(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function formatoUptime(valor) {
  if (valor === null || valor === undefined) return "—";
  return (valor === 100 ? "100" : valor.toFixed(2)) + "%";
}

function claseUptime(valor) {
  if (valor === null || valor === undefined) return "";
  if (valor >= 99.5) return "alto";
  if (valor >= 95) return "medio";
  return "bajo";
}

function barraUptime(sitioId) {
  const u = uptimeCache[sitioId];
  if (!u) return "";

  const etiquetas = {
    ok: "Sin caídas",
    caido: "Caído todo el día",
    parcial: "Con caídas",
    sin_datos: "Sin datos",
  };

  const cuadros = u.dias.map(d => {
    const detalle = d.estado === "sin_datos"
      ? "sin chequeos"
      : `${d.ok} de ${d.chequeos} chequeos disponibles`;
    return `<span class="dia ${d.estado}" title="${formatoFecha(d.fecha)} · ${etiquetas[d.estado]} (${detalle})"></span>`;
  }).join("");

  return `
  <div class="uptime">
    <div class="uptime-barra">${cuadros}</div>
    <div class="uptime-cifras">
      <span>7 días <strong class="${claseUptime(u.uptime_7d)}">${formatoUptime(u.uptime_7d)}</strong></span>
      <span>30 días <strong class="${claseUptime(u.uptime_30d)}">${formatoUptime(u.uptime_30d)}</strong></span>
    </div>
  </div>`;
}


function actualizarResumen(ultimosChequeos) {
  const total = sitiosCache.length;
  const ok = ultimosChequeos.filter(c => c && c.disponible).length;
  const caidos = ultimosChequeos.filter(c => c && !c.disponible).length;

  statTotal.textContent = total;
  statOk.textContent = ok;
  statCaidos.textContent = caidos;
}

function renderSitios(sitios, ultimosChequeos) {
  contenedorSitios.innerHTML = "";

  sitios.forEach((sitio, i) => {
    const ultimo = ultimosChequeos[i];
    const card = document.createElement("div");
    card.className = "sitio-card";

    let estadoClase = "sin-datos";
    let estadoTexto = "Sin chequear";
    if (ultimo) {
      estadoClase = ultimo.disponible ? "ok" : "error";
      estadoTexto = ultimo.disponible ? "Disponible" : "Caído";
    }

    card.innerHTML = `
  <div class="sitio-header ${estadoClase === 'sin-datos' ? '' : estadoClase}" data-id="${sitio.id}">
    <div class="sitio-info">
      <div class="sitio-textos">
        <div class="sitio-nombre">${sitio.nombre_cliente}</div>
        <div class="sitio-url">${sitio.url}</div>
      </div>
    </div>
    <div class="sitio-metricas">
      <span class="badge ${estadoClase === 'sin-datos' ? '' : estadoClase}">${estadoTexto}</span>
      <span>Resp: <strong>${ultimo?.tiempo_respuesta_ms ?? "—"} ms</strong></span>
      <span>SSL: <strong>${ultimo?.ssl_dias_restantes ?? "—"} días</strong></span>
    </div>
    <div class="sitio-acciones">
      <button class="secondary btn-chequear" data-id="${sitio.id}">Chequear ahora</button>
    </div>
  </div>
  ${barraUptime(sitio.id)}
  <div class="historial" id="historial-${sitio.id}">
    <div class="estado-carga">Cargando historial...</div>
  </div>
    `;

    contenedorSitios.appendChild(card);
  });

  document.querySelectorAll(".sitio-header").forEach(header => {
    header.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-chequear")) return;
      const id = header.dataset.id;
      toggleHistorial(id);
    });
  });

  document.querySelectorAll(".btn-chequear").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = "Chequeando...";
      await apiFetch(`${API_BASE}/chequeos/ejecutar/${id}`, { method: "POST" });
      await cargarSitios();
    });
  });
}

async function toggleHistorial(sitioId) {
  const div = document.getElementById(`historial-${sitioId}`);
  const abierto = div.classList.contains("abierto");

  if (abierto) {
    div.classList.remove("abierto");
    return;
  }

  div.classList.add("abierto");
  const resp = await apiFetch(`${API_BASE}/chequeos/sitio/${sitioId}`);
  const chequeos = await resp.json();

  if (chequeos.length === 0) {
    div.innerHTML = `<div class="estado-vacio">Sin chequeos registrados.</div>`;
    return;
  }

  const filas = chequeos.slice(0, 10).map(c => `
    <tr>
      <td>${new Date(c.ejecutado_en).toLocaleString("es-PE")}</td>
      <td><span class="badge ${c.disponible ? "ok" : "error"}">${c.disponible ? "Disponible" : "Caído"}</span></td>
      <td>${c.tiempo_respuesta_ms ?? "—"} ms</td>
      <td>${c.ssl_dias_restantes ?? "—"} días</td>
    </tr>
  `).join("");

  div.innerHTML = `
    <table>
      <thead>
        <tr><th>Fecha</th><th>Estado</th><th>Respuesta</th><th>SSL</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

btnChequearTodos.addEventListener("click", async () => {
  btnChequearTodos.disabled = true;
  btnChequearTodos.textContent = "Chequeando todos...";
  await apiFetch(`${API_BASE}/chequeos/ejecutar-todos`, { method: "POST" });
  await cargarSitios();
  btnChequearTodos.disabled = false;
  btnChequearTodos.textContent = "Chequear todos";
});

cargarSitios();

document.getElementById("btn-salir").addEventListener("click", cerrarSesion);
document.getElementById("usuario-email").textContent = (leerSesion() || {}).email || "";

document.getElementById("buscador").addEventListener("input", (e) => {
  textoBusqueda = e.target.value;
  aplicarFiltros();
});
document.getElementById("orden").addEventListener("change", (e) => {
  ordenActual = e.target.value;
  aplicarFiltros();
});
document.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => setFiltro(c.dataset.estado)));
document.querySelectorAll(".stat[data-estado]").forEach(s => s.addEventListener("click", () => setFiltro(s.dataset.estado)));