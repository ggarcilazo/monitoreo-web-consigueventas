const SUPABASE_URL = "https://fgdshcruqifmiwttwshn.supabase.co";
const SUPABASE_KEY = "sb_publishable_corrQIYSrmnDc9kartXztQ_XaQ9OuUn";
const CLAVE_SESION = "mcv_sesion";

function leerSesion() {
  try { return JSON.parse(localStorage.getItem(CLAVE_SESION)); } catch { return null; }
}

function guardarSesion(d) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expira: Date.now() + (d.expires_in - 60) * 1000,
    email: d.user?.email || "",
  }));
}

function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
  window.location.href = "login.html";
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
  return leerSesion().access_token;
}

async function apiFetch(url, opciones = {}) {
  const token = await tokenValido();
  if (!token) {
    cerrarSesion();
    throw new Error("Sesión expirada");
  }
  const resp = await fetch(url, {
    ...opciones,
    headers: { ...(opciones.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (resp.status === 401) cerrarSesion();
  return resp;
}