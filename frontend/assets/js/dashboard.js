const API_BASE = "https://consigueventas.duckdns.org/api";

const contenedorSitios = document.getElementById("sitios");
const btnChequearTodos = document.getElementById("btn-chequear-todos");
const statTotal = document.getElementById("stat-total");
const statOk = document.getElementById("stat-ok");
const statCaidos = document.getElementById("stat-caidos");

let sitiosCache = [];

async function cargarSitios() {
  contenedorSitios.innerHTML = `<div class="estado-carga">Cargando sitios...</div>`;
  try {
    const resp = await fetch(`${API_BASE}/sitios/`);
    sitiosCache = await resp.json();

    if (sitiosCache.length === 0) {
      contenedorSitios.innerHTML = `<div class="estado-vacio">Aún no hay sitios registrados.</div>`;
      actualizarResumen([]);
      return;
    }

    const ultimosChequeos = await Promise.all(
      sitiosCache.map(s => obtenerUltimoChequeo(s.id))
    );

    renderSitios(sitiosCache, ultimosChequeos);
    actualizarResumen(ultimosChequeos);
  } catch (err) {
    contenedorSitios.innerHTML = `<div class="estado-vacio">No se pudo conectar con el servidor.</div>`;
  }
}

async function obtenerUltimoChequeo(sitioId) {
  const resp = await fetch(`${API_BASE}/chequeos/sitio/${sitioId}`);
  const chequeos = await resp.json();
  return chequeos[0] || null;
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
      await fetch(`${API_BASE}/chequeos/ejecutar/${id}`, { method: "POST" });
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
  const resp = await fetch(`${API_BASE}/chequeos/sitio/${sitioId}`);
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
  await fetch(`${API_BASE}/chequeos/ejecutar-todos`, { method: "POST" });
  await cargarSitios();
  btnChequearTodos.disabled = false;
  btnChequearTodos.textContent = "Chequear todos";
});

cargarSitios();