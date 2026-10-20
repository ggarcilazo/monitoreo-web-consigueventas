(() => {
  const $ = (id) => document.getElementById(id);

  let estado = null;
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
      if (resp.status === 422) return "El valor no es válido.";
    } catch {}
    return "No se pudo completar la acción.";
  }

  function insignia(el, ok, textoOk, textoNo) {
    el.textContent = ok ? textoOk : textoNo;
    el.className = `badge ${ok ? "ok" : "error"}`;
  }

  function pintar(a) {
    estado = a;
    $("aj-diagnostico").checked = a.diagnostico_publico;
    $("aj-diagnostico-estado").textContent = a.diagnostico_publico
      ? "Encendido: cualquier persona puede analizar su sitio."
      : "Apagado: la página pública avisa que el servicio no está disponible.";
    $("aj-origen").textContent = a.origen_diagnostico === "panel"
      ? "Se controla desde este panel."
      : "Usa el valor del servidor (archivo .env) hasta que lo cambies aquí.";
    $("aj-ssl").value = a.umbral_ssl_dias;
    insignia($("aj-telegram"), a.telegram_configurado, "Configurado", "Sin configurar");
    insignia($("aj-turnstile"), a.turnstile_configurado, "Configurado", "Sin configurar");
    $("btn-probar-telegram").disabled = !a.telegram_configurado;
    $("aj-version").textContent = a.version;
    $("aj-inactividad").textContent =
      typeof INACTIVIDAD_MS === "number" ? `${Math.round(INACTIVIDAD_MS / 60000)} minutos` : "—";
  }

  async function cargar() {
    try {
      const resp = await apiFetch(`${API_BASE}/ajustes/`);
      if (resp.status === 403) {
        $("ajustes-grid").hidden = true;
        $("aj-bloqueo").hidden = false;
        return;
      }
      if (!resp.ok) throw new Error();
      $("ajustes-grid").hidden = false;
      $("aj-bloqueo").hidden = true;
      pintar(await resp.json());
    } catch {
      aviso("No se pudieron cargar los ajustes", "error");
    }
  }

  async function guardar(cambios) {
    const resp = await apiFetch(`${API_BASE}/ajustes/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    if (!resp.ok) throw new Error(await mensajeError(resp));
    const nuevo = await resp.json();
    pintar(nuevo);
    return nuevo;
  }

  $("aj-diagnostico").addEventListener("change", async (e) => {
    const input = e.target;
    const quiere = input.checked;
    input.disabled = true;
    try {
      await guardar({ diagnostico_publico: quiere });
      aviso(quiere ? "Diagnóstico público encendido" : "Diagnóstico público apagado");
    } catch (err) {
      input.checked = !quiere;
      aviso(err.message, "error");
    } finally {
      input.disabled = false;
    }
  });

  $("btn-guardar-ssl").addEventListener("click", async () => {
    const valor = Number($("aj-ssl").value);
    if (!Number.isInteger(valor) || valor < 1 || valor > 60) {
      aviso("Escribe un número entero entre 1 y 60", "error");
      return;
    }
    const boton = $("btn-guardar-ssl");
    boton.disabled = true;
    try {
      await guardar({ umbral_ssl_dias: valor });
      aviso("Umbral guardado");
    } catch (err) {
      aviso(err.message, "error");
    } finally {
      boton.disabled = false;
    }
  });

  $("btn-probar-telegram").addEventListener("click", async () => {
    const boton = $("btn-probar-telegram");
    boton.disabled = true;
    boton.textContent = "Enviando...";
    try {
      const resp = await apiFetch(`${API_BASE}/ajustes/telegram-prueba`, { method: "POST" });
      if (!resp.ok) throw new Error(await mensajeError(resp));
      const datos = await resp.json();
      aviso(
        datos.enviado
          ? "Mensaje enviado: revisa tu Telegram"
          : "No se pudo entregar el mensaje. Revisa el token y el chat configurados.",
        datos.enviado ? "ok" : "error",
      );
    } catch (err) {
      aviso(err.message, "error");
    } finally {
      boton.textContent = "Enviar mensaje de prueba";
      boton.disabled = !(estado && estado.telegram_configurado);
    }
  });

  // ---------- Navegación ----------
  function alCambiarVista() {
    if ((location.hash.slice(1) || "panel") === "ajustes") cargar();
  }
  window.addEventListener("hashchange", alCambiarVista);
  alCambiarVista();
})();