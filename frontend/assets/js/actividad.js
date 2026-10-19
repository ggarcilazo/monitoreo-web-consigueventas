(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ENTIDADES = { sitio: "Sitio", lead: "Lead", usuario: "Usuario" };
  const NO_PERSONAS = new Set(["visitante (público)", "sistema"]);

  const svg = (contenido) =>
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;
  const ICONOS = {
    sitio: svg('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
    lead: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>'),
    usuario: svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  };

  let lista = [];
  let cargado = false;

  function haceTiempo(iso) {
    const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seg < 90) return "hace un momento";
    if (seg < 3600) return `hace ${Math.round(seg / 60)} min`;
    if (seg < 86400) return `hace ${Math.round(seg / 3600)} h`;
    const d = Math.round(seg / 86400);
    return `hace ${d} ${d === 1 ? "día" : "días"}`;
  }

  function etiquetaDia(iso) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    const dif = Math.round((hoy - d) / 86400000);
    if (dif === 0) return "Hoy";
    if (dif === 1) return "Ayer";
    return d.toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }

  function visibles() {
    const q = $("buscador-actividad").value.trim().toLowerCase();
    return lista.filter((e) => !q || `${e.descripcion} ${e.usuario_email || ""}`.toLowerCase().includes(q));
  }

  function tarjetas() {
    $("act-total").textContent = lista.length;
    const personas = new Set(lista.map((e) => e.usuario_email).filter((m) => m && !NO_PERSONAS.has(m)));
    $("act-personas").textContent = personas.size;
    $("act-ultimo").textContent = lista.length ? haceTiempo(lista[0].creado_en) : "—";
  }

  function evento(e) {
    const peligro = /eliminad/.test(e.accion) ? " ev-peligro" : "";
    const hora = new Date(e.creado_en).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    return `<div class="evento">
      <span class="evento-icono ev-${esc(e.entidad)}${peligro}">${ICONOS[e.entidad] || ICONOS.sitio}</span>
      <div class="evento-cuerpo">
        <div class="evento-texto">${esc(e.descripcion)}</div>
        <div class="evento-meta">${esc(e.usuario_email || "sistema")} · ${hora}</div>
      </div>
      <span class="badge">${esc(ENTIDADES[e.entidad] || e.entidad)}</span>
    </div>`;
  }

  function pintar() {
    tarjetas();
    const filas = visibles();
    const caja = $("linea-actividad");
    $("resumen-actividad").textContent = `${filas.length} de ${lista.length} eventos`;

    if (!filas.length) {
      const texto = lista.length ? "Ningún evento coincide con la búsqueda." : "Sin actividad en este periodo.";
      caja.innerHTML = `<div class="estado-vacio">${texto}</div>`;
      return;
    }

    const grupos = new Map();
    filas.forEach((e) => {
      const clave = new Date(e.creado_en).toLocaleDateString("es-PE");
      if (!grupos.has(clave)) grupos.set(clave, { titulo: etiquetaDia(e.creado_en), eventos: [] });
      grupos.get(clave).eventos.push(e);
    });

    caja.innerHTML = [...grupos.values()].map((g) =>
      `<section><h3 class="dia-titulo">${esc(g.titulo)}</h3><div class="dia-eventos">${g.eventos.map(evento).join("")}</div></section>`
    ).join("") + (lista.length >= 500
      ? `<p class="nota-precision">Se muestran los 500 eventos más recientes del periodo.</p>` : "");
  }

  async function cargar() {
    const caja = $("linea-actividad");
    if (!cargado) caja.innerHTML = `<div class="estado-carga">Cargando actividad...</div>`;
    else $("resumen-actividad").textContent = "Actualizando...";

    const tipo = $("act-tipo").value;
    const url = `${API_BASE}/actividad/?dias=${$("act-periodo").value}&limite=500${tipo ? `&entidad=${tipo}` : ""}`;
    try {
      const resp = await apiFetch(url);
      if (resp.status === 403) {
        caja.innerHTML = `<div class="estado-vacio">Solo los administradores pueden ver la actividad.</div>`;
        return;
      }
      if (!resp.ok) throw new Error();
      lista = await resp.json();
      cargado = true;
      pintar();
    } catch {
      caja.innerHTML = `<div class="estado-vacio">No se pudo cargar la actividad.</div>`;
    }
  }

  $("act-periodo").addEventListener("change", cargar);
  $("act-tipo").addEventListener("change", cargar);
  $("buscador-actividad").addEventListener("input", pintar);

  // ---------- Navegación ----------
  function alCambiarVista() {
    if ((location.hash.slice(1) || "panel") === "actividad") cargar();
  }
  window.addEventListener("hashchange", alCambiarVista);
  alCambiarVista();
})();