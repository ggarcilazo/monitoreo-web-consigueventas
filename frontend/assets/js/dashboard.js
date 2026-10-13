const API_BASE = "https://consigueventas.duckdns.org/api";

const contenedorSitios = document.getElementById("sitios");
const btnChequearTodos = document.getElementById("btn-chequear-todos");
const statTotal = document.getElementById("stat-total");
const statOk = document.getElementById("stat-ok");
const statCaidos = document.getElementById("stat-caidos");

let sitiosCache = [];
let ultimosCache = [];
let uptimeCache = {};
let historialCache = {};
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
  historialCache[sitioId] = chequeos;
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

function hace(iso) {
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 3600) return `hace ${Math.max(1, Math.round(seg / 60))} min`;
  if (seg < 86400) return `hace ${Math.round(seg / 3600)} h`;
  const d = Math.round(seg / 86400);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

function anillo(valor) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c * (1 - (valor ?? 0) / 100);
  return `
    <svg class="anillo ${claseUptime(valor)}" viewBox="0 0 64 64" aria-hidden="true">
      <circle class="anillo-fondo" cx="32" cy="32" r="${r}"/>
      <circle class="anillo-valor" cx="32" cy="32" r="${r}"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        transform="rotate(-90 32 32)"/>
    </svg>`;
}

function sparkline(valores, id) {
  const v = valores.filter(x => x !== null && x !== undefined);
  if (v.length < 2) {
    return `<div class="mini-detalle">Se necesitan al menos 2 chequeos</div>`;
  }
  const w = 200, h = 48, pad = 4;
  const min = Math.min(...v), max = Math.max(...v);
  const rango = max - min || 1;
  const paso = w / (v.length - 1);
  const pts = v.map((x, i) => [i * paso, pad + (h - 2 * pad) * (1 - (x - min) / rango)]);
  const linea = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${linea} L${w} ${h} L0 ${h} Z`;
  return `
    <svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="g-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#67d4c1" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#67d4c1" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#g-${id})"/>
      <path d="${linea}" fill="none" stroke="#67d4c1" stroke-width="2"
        stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
}

function panelMetricas(sitioId) {
  const u = uptimeCache[sitioId];
  const lista = historialCache[sitioId] || [];
  const recientes = lista.slice(0, 30).reverse();
  const tiempos = recientes.map(c => c.tiempo_respuesta_ms);
  const validos = tiempos.filter(t => t !== null && t !== undefined);
  const promedio = validos.length
    ? Math.round(validos.reduce((a, b) => a + b, 0) / validos.length)
    : null;
  const caida = lista.find(c => !c.disponible);

  const uptime30 = u ? u.uptime_30d : null;
  const uptime7 = u ? u.uptime_7d : null;

  const textoCaida = caida ? hace(caida.ejecutado_en) : "Sin caídas";
  const claseCaida = caida ? "warn" : "ok";
  const detalleCaida = caida
    ? new Date(caida.ejecutado_en).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
    : "En todo el historial registrado";

  return `
  <div class="panel-metricas">
    <div class="mini">
      <div class="anillo-caja">
        ${anillo(uptime30)}
        <span class="anillo-texto">${formatoUptime(uptime30)}</span>
      </div>
      <div class="mini-info">
        <div class="mini-titulo">Disponibilidad</div>
        <div class="mini-detalle">30 días · 7 días: <strong class="${claseUptime(uptime7)}">${formatoUptime(uptime7)}</strong></div>
      </div>
    </div>

    <div class="mini mini-resp">
      <div class="mini-info">
        <div class="mini-titulo">Tiempo de respuesta</div>
        <div class="mini-detalle">Promedio <strong>${promedio ?? "—"} ms</strong> · ${validos.length} chequeos</div>
      </div>
      ${sparkline(tiempos, sitioId)}
    </div>

    <div class="mini">
      <div class="mini-info">
        <div class="mini-titulo">Última caída</div>
        <div class="mini-valor ${claseCaida}">${textoCaida}</div>
        <div class="mini-detalle">${detalleCaida}</div>
      </div>
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
  historialCache[sitioId] = chequeos;

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
    ${panelMetricas(sitioId)}
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

const vistas = {
  panel: { titulo: "Panel", subtitulo: "Estado en tiempo real de los sitios monitoreados" },
  sitios: { titulo: "Sitios", subtitulo: "Administra los sitios que se monitorean" },
  incidentes: { titulo: "Incidentes", subtitulo: "Caídas detectadas y su duración" },
  usuarios: { titulo: "Usuarios", subtitulo: "Quién tiene acceso a este panel" },
};

function irA(vista) {
  if (!vistas[vista]) vista = "panel";
  document.querySelectorAll(".vista").forEach(s => { s.hidden = s.id !== `vista-${vista}`; });
  document.querySelectorAll("#side-nav a").forEach(a => a.classList.toggle("activo", a.dataset.vista === vista));
  document.getElementById("titulo-vista").textContent = vistas[vista].titulo;
  document.getElementById("subtitulo-vista").textContent = vistas[vista].subtitulo;
  document.getElementById("btn-chequear-todos").hidden = vista !== "panel";
  document.title = `${vistas[vista].titulo} · Monitor ConsigueVentas`;
}

window.addEventListener("hashchange", () => irA(location.hash.slice(1)));
irA(location.hash.slice(1));

let rolActual = "";

async function cargarPerfil() {
  try {
    const resp = await apiFetch(`${API_BASE}/me`);
    if (!resp.ok) return;
    const yo = await resp.json();
    rolActual = yo.rol;
    document.body.dataset.rol = yo.rol;
    document.getElementById("usuario-rol").textContent = yo.rol === "admin" ? "Administrador" : "Lector";
  } catch {}
}
cargarPerfil();
