const SUPABASE_URL = "https://fgdshcruqifmiwttwshn.supabase.co";
const SUPABASE_KEY = "sb_publishable_0i6w0U9P5QGV83DoEh5ang_zOdRhyXv";
const CLAVE_SESION = "mcv_sesion";
const CLAVE_ACTIVIDAD = "mcv_actividad";
const INACTIVIDAD_MS = 30 * 60 * 1000; // tiempo sin actividad antes de cerrar la sesión

function sesionCruda() {
  try { return JSON.parse(localStorage.getItem(CLAVE_SESION)); } catch { return null; }
}

function marcarActividad() {
  try { localStorage.setItem(CLAVE_ACTIVIDAD, String(Date.now())); } catch {}
}

function inactiva() {
  try {
    const t = Number(localStorage.getItem(CLAVE_ACTIVIDAD));
    if (!t) { marcarActividad(); return false; }
    return Date.now() - t > INACTIVIDAD_MS;
  } catch { return false; }
}

function revocar(s) {
  if (!s || !s.access_token) return Promise.resolve();
  return fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${s.access_token}` },
    keepalive: true,
  }).catch(() => {});
}

function leerSesion() {
  const s = sesionCruda();
  if (s && inactiva()) {
    revocar(s);
    localStorage.removeItem(CLAVE_SESION);
    return null;
  }
  return s;
}

function guardarSesion(d) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expira: Date.now() + (d.expires_in - 60) * 1000,
    email: d.user?.email || "",
  }));
  marcarActividad();
}

async function cerrarSesion(motivo) {
  const razon = typeof motivo === "string" ? motivo : "";
  const s = sesionCruda();
  localStorage.removeItem(CLAVE_SESION);
  localStorage.removeItem(CLAVE_ACTIVIDAD);
  if (s) await Promise.race([revocar(s), new Promise((r) => setTimeout(r, 1500))]);
  window.location.replace("login.html" + (razon ? `?motivo=${razon}` : ""));
}

async function iniciarSesion(email, password) {
  let r;
  try {
    r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor de acceso. Revisa tu conexión.");
  }

  if (!r.ok) {
    let d = {};
    try { d = await r.json(); } catch {}
    console.error("Login Supabase:", r.status, d);
    const codigo = d.error_code || d.code || "";
    const detalle = d.msg || d.error_description || d.message || "";
    if (codigo === "invalid_credentials") throw new Error("Correo o contraseña incorrectos");
    if (codigo === "email_not_confirmed") throw new Error("Este usuario aún no está confirmado en Supabase");
    throw new Error(`No se pudo ingresar (${r.status}): ${detalle || codigo || "error desconocido"}`);
  }

  guardarSesion(await r.json());
}

async function tokenValido() {
  const s = leerSesion();
  if (!s) return null;
  if (Date.now() < s.expira) return s.access_token;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (!r.ok) return null;
  guardarSesion(await r.json());
  return sesionCruda().access_token;
}

async function apiFetch(url, opciones = {}) {
  const token = await tokenValido();
  if (!token) {
    cerrarSesion("expirada");
    throw new Error("Sesión expirada");
  }
  const resp = await fetch(url, {
    ...opciones,
    headers: { ...(opciones.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (resp.status === 401) cerrarSesion("expirada");
  return resp;
}

// ---------- Vigilancia de inactividad y botón «Atrás» ----------
(function vigilar() {
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && !sesionCruda() && !location.pathname.includes("login")) {
      window.location.replace("login.html");
    }
  });

  if (!sesionCruda()) return;

  let ultimo = 0;
  const actividad = () => {
    const ahora = Date.now();
    if (ahora - ultimo > 15000) {
      ultimo = ahora;
      if (sesionCruda()) marcarActividad();
    }
  };
  ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach((ev) =>
    document.addEventListener(ev, actividad, { passive: true, capture: true }));

  const revisar = () => {
    if (sesionCruda() && inactiva()) cerrarSesion("inactividad");
  };
  setInterval(revisar, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) revisar(); });
})();