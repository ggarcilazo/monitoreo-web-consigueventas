import ipaddress
import re
import socket
import statistics
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

from app.services.ssl_checker import verificar_ssl

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-PE,es;q=0.9,en;q=0.8",
}
MAX_REDIRECCIONES = 3
MAX_BYTES = 300_000
TIMEOUT = 12
LIMITE_TOTAL_SEG = 20
PRESUPUESTO_SEG = 14  # pasado este tiempo ya no se hacen comprobaciones extra

PESOS = {"disponibilidad": 0.25, "ssl": 0.20, "velocidad": 0.20, "seguridad": 0.20, "seo": 0.15}

# clave: (por qué importa, cómo corregirlo)
EXPLICA = {
    "disp": ("Si tu sitio no responde, pierdes visitas y clientes, y Google puede bajar tu posición.",
             "Revisa tu hosting y el estado del dominio; si el problema continúa, contacta a tu proveedor."),
    "bloqueo": ("Tu sitio rechazó nuestra visita automática, algo típico de un firewall o plugin de seguridad. Si también bloquea a los buscadores, perderías posicionamiento en Google.",
                "Revisa que tu firewall permita el acceso a los buscadores (por ejemplo, Googlebot)."),
    "https": ("Los navegadores marcan como «No seguro» los sitios sin HTTPS y los visitantes desconfían.",
              "Instala un certificado SSL; muchos hostings lo ofrecen gratis."),
    "ssl_vence": ("Si el certificado vence, los navegadores muestran una advertencia de seguridad que ahuyenta a tus visitantes.",
                  "Renueva el certificado antes de la fecha o activa la renovación automática en tu hosting."),
    "velocidad": ("Cada segundo de espera hace que más visitantes abandonen tu sitio, y Google premia a los sitios rápidos.",
                  "Revisa tu plan de hosting, activa un sistema de caché y optimiza las imágenes."),
    "compresion": ("Sin compresión la página pesa más y tarda más en cargar, sobre todo en celulares.",
                   "Activa la compresión Gzip o Brotli en tu servidor o con un plugin de caché."),
    "cache": ("Sin reglas de caché, tus visitantes vuelven a descargar todo en cada visita.",
              "Configura la caché del navegador o usa un plugin de caché."),
    "peso": ("Las páginas pesadas o con demasiados scripts cargan lento, sobre todo con datos móviles.",
             "Elimina plugins innecesarios, reduce scripts de terceros y comprime las imágenes."),
    "https_redirect": ("Si alguien escribe tu dirección sin https, podría entrar a una versión sin cifrar de tu sitio.",
                       "Activa la redirección forzada a HTTPS en tu hosting o en tu plugin de seguridad."),
    "hsts": ("Sin HSTS, el navegador no recuerda que tu sitio debe abrirse siempre de forma segura y, en una red pública, la conexión podría ser interceptada.",
             "Agrega la cabecera Strict-Transport-Security desde tu hosting o con un plugin de seguridad."),
    "xfo": ("Otro sitio podría mostrar el tuyo dentro de un marco invisible para engañar a tus visitantes y hacerlos pulsar donde no deben (clickjacking).",
            "Agrega la cabecera X-Frame-Options con el valor SAMEORIGIN, o la directiva frame-ancestors."),
    "xcto": ("El navegador podría interpretar un archivo como otra cosa y ejecutar contenido malicioso.",
             "Agrega la cabecera X-Content-Type-Options con el valor nosniff."),
    "csp": ("Una política de contenido limita qué scripts pueden ejecutarse en tu página y ayuda a frenar inyecciones de código malicioso.",
            "Define una Content-Security-Policy adaptada a tu sitio; conviene probarla antes en modo solo-reporte."),
    "referrer": ("Sin esta política, las direcciones internas de tu sitio pueden compartirse con otros sitios a los que enlazas.",
                 "Agrega la cabecera Referrer-Policy con el valor strict-origin-when-cross-origin."),
    "permisos": ("Permite restringir funciones del navegador (cámara, micrófono, ubicación) que tu sitio no necesita.",
                 "Agrega la cabecera Permissions-Policy dejando activas solo las funciones necesarias."),
    "versiones": ("Mostrar la versión de tu software (PHP, WordPress, servidor) ayuda a los atacantes a buscar fallas conocidas.",
                  "Oculta las versiones en la configuración del servidor o con un plugin de seguridad."),
    "titulo": ("El título es lo primero que ve un cliente en Google; sin él pierdes clics.",
               "Agrega un título claro que incluya tu servicio y tu ciudad."),
    "descripcion": ("La descripción es el texto que aparece bajo tu título en Google y convence de entrar a tu sitio.",
                    "Escribe una descripción de entre 120 y 155 caracteres, con tu servicio principal."),
    "viewport": ("Más de la mitad de las visitas vienen del celular; sin esta configuración el sitio se ve diminuto o desordenado.",
                 "Agrega la etiqueta meta viewport o usa un tema que se adapte a celulares."),
    "h1": ("El encabezado principal ayuda a Google y a tus visitantes a entender de qué trata la página.",
           "Usa un solo encabezado principal (H1) con tu servicio clave."),
    "og": ("Sin estas etiquetas, al compartir tu enlace en WhatsApp o Facebook no se ve imagen ni título atractivo.",
           "Agrega las etiquetas og:title, og:description y og:image, por ejemplo con un plugin de SEO."),
    "robots": ("Este archivo le indica a Google qué partes de tu sitio puede revisar.",
               "Crea un archivo robots.txt básico, por ejemplo con un plugin de SEO."),
    "sitemap": ("El mapa del sitio ayuda a Google a encontrar todas tus páginas.",
                "Genera un sitemap.xml con un plugin de SEO y envíalo a Google Search Console."),
}


class UrlNoPermitida(Exception):
    pass


class DominioNoResuelve(Exception):
    pass


# ---------- Validación de la dirección ----------

def normalizar_url(texto: str) -> str:
    texto = (texto or "").strip()
    if not texto:
        raise UrlNoPermitida("Escribe la dirección de tu sitio web.")
    if "://" not in texto:
        texto = "https://" + texto
    _validar_forma(texto)
    return texto


def _validar_forma(url: str) -> str:
    try:
        p = urlparse(url)
        puerto = p.port
    except ValueError:
        raise UrlNoPermitida("La dirección no es válida.")
    if p.scheme not in ("http", "https") or not p.hostname:
        raise UrlNoPermitida("Escribe una dirección web válida, por ejemplo https://tusitio.com")
    if p.username or p.password:
        raise UrlNoPermitida("La dirección no puede incluir usuario ni contraseña.")
    if puerto not in (None, 80, 443):
        raise UrlNoPermitida("Solo se admiten los puertos web estándar (80 y 443).")
    return p.hostname


def _validar_host_publico(host: str) -> None:
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except (socket.gaierror, UnicodeError):
        raise DominioNoResuelve()
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0].split("%")[0])
        except ValueError:
            raise UrlNoPermitida("Esa dirección no es pública.")
        if not ip.is_global:
            raise UrlNoPermitida("Esa dirección no es pública.")


# ---------- Descargas controladas ----------

def _descargar(url: str, max_bytes: int = MAX_BYTES, timeout: int = TIMEOUT):
    """Sigue hasta 3 redirecciones validando cada destino.
    Devuelve (cabeceras, estado, url_final, tiempo_ms, html, bytes_leidos)."""
    actual = url
    inicio = time.perf_counter()
    with httpx.Client(timeout=timeout, headers=HEADERS, follow_redirects=False) as cliente:
        for _ in range(MAX_REDIRECCIONES + 1):
            host = _validar_forma(actual)
            _validar_host_publico(host)
            with cliente.stream("GET", actual) as r:
                if r.is_redirect and r.headers.get("location"):
                    actual = str(r.url.join(r.headers["location"]))
                    continue
                tiempo_ms = int((time.perf_counter() - inicio) * 1000)
                cuerpo = b""
                for trozo in r.iter_bytes():
                    cuerpo += trozo
                    if len(cuerpo) >= max_bytes or time.perf_counter() - inicio > LIMITE_TOTAL_SEG:
                        break
                return (r.headers, r.status_code, actual, tiempo_ms,
                        cuerpo.decode("utf-8", errors="ignore"), len(cuerpo))
    raise UrlNoPermitida("El sitio redirige demasiadas veces.")


def _medir_tiempo(url: str):
    """Tiempo hasta recibir la respuesta (sin bajar el contenido). None si falla."""
    try:
        _validar_host_publico(_validar_forma(url))
        inicio = time.perf_counter()
        with httpx.Client(timeout=6, headers=HEADERS, follow_redirects=False) as cliente:
            with cliente.stream("GET", url):
                return int((time.perf_counter() - inicio) * 1000)
    except Exception:
        return None


def _redirige_a_https(host: str, inicio_total: float):
    """True si http:// redirige a https://, False si no, None si no se pudo comprobar."""
    if time.perf_counter() - inicio_total > PRESUPUESTO_SEG:
        return None
    try:
        _validar_host_publico(host)
        with httpx.Client(timeout=5, headers=HEADERS, follow_redirects=False) as cliente:
            with cliente.stream("GET", f"http://{host}/") as r:
                if r.is_redirect:
                    return r.headers.get("location", "").lower().startswith("https://")
                return False
    except httpx.ConnectError:
        return True  # el puerto 80 está cerrado: solo se puede entrar por HTTPS
    except Exception:
        return None


def _revisar_robots_y_sitemap(base: str, inicio_total: float):
    def pedir(ruta):
        if time.perf_counter() - inicio_total > PRESUPUESTO_SEG:
            return None
        try:
            _, estado, _, _, cuerpo, _ = _descargar(base + ruta, max_bytes=20_000, timeout=5)
            tipo = _.get("content-type", "").lower() if False else ""
        except Exception:
            return None
        return estado, cuerpo

    r = pedir("/robots.txt")
    robots = None if r is None else (r[0] == 200 and "<html" not in r[1][:500].lower())

    if robots and re.search(r"^\s*sitemap:\s*\S+", r[1], re.I | re.M):
        return robots, True

    desconocido = False
    for ruta in ("/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"):
        s = pedir(ruta)
        if s is None:
            desconocido = True
            continue
        estado, cuerpo = s
        if estado == 200 and ("<urlset" in cuerpo or "<sitemapindex" in cuerpo):
            return robots, True
    return robots, (None if desconocido else False)


# ---------- Armado del resultado ----------

def _estado(puntaje: int) -> str:
    if puntaje >= 80:
        return "ok"
    if puntaje >= 50:
        return "atencion"
    return "critico"


def _hallazgo(ok: bool, texto: str, importa=None, solucion=None) -> dict:
    h = {"ok": ok, "texto": texto}
    if not ok and importa:
        h["importa"] = importa
        h["solucion"] = solucion
    return h


def _cat(id_: str, titulo: str, puntaje: int, resumen: str, hallazgos: list) -> dict:
    return {
        "id": id_,
        "titulo": titulo,
        "puntaje": int(puntaje),
        "estado": _estado(int(puntaje)),
        "resumen": resumen,
        "hallazgos": hallazgos,
    }


def _evaluar(checks):
    """checks: (peso, ok, texto_si, texto_no, importa, solucion). ok=None -> no verificado, se omite."""
    hallazgos = []
    ganado = total = 0
    for peso, ok, si, no, importa, solucion in checks:
        if ok is None:
            continue
        total += peso
        if ok:
            ganado += peso
            hallazgos.append(_hallazgo(True, si))
        else:
            hallazgos.append(_hallazgo(False, no, importa, solucion))
    puntaje = round(100 * ganado / total) if total else 0
    cumplidos = sum(1 for h in hallazgos if h["ok"])
    return puntaje, cumplidos, len(hallazgos), hallazgos


def _cat_disponibilidad(estado_http: int, url: str, url_final: str) -> dict:
    if estado_http < 400:
        puntaje, resumen, explica = 100, f"El sitio responde correctamente (HTTP {estado_http}).", ("", "")
    elif estado_http in (401, 403, 429):
        puntaje = 60
        resumen = f"El sitio respondió HTTP {estado_http}: probablemente bloquea visitas automáticas."
        explica = EXPLICA["bloqueo"]
    else:
        puntaje, resumen, explica = 0, f"El sitio devolvió un error (HTTP {estado_http}).", EXPLICA["disp"]
    hallazgos = [_hallazgo(estado_http < 400, f"Código de respuesta: HTTP {estado_http}", *explica)]
    if url_final.rstrip("/") != url.rstrip("/"):
        hallazgos.append(_hallazgo(True, f"Redirige a {url_final}"))
    return _cat("disponibilidad", "Disponibilidad", puntaje, resumen, hallazgos)


def _cat_ssl(es_https: bool, url_final: str) -> dict:
    if not es_https:
        return _cat("ssl", "Certificado SSL", 0,
                    "El sitio no usa HTTPS: los datos viajan sin cifrar.",
                    [_hallazgo(False, "No se detectó conexión segura (HTTPS)", *EXPLICA["https"])])
    try:
        dias = verificar_ssl(url_final).get("ssl_dias_restantes")
    except Exception:
        dias = None
    if dias is None:
        return _cat("ssl", "Certificado SSL", 70,
                    "Usa HTTPS, pero no se pudo leer la fecha de vencimiento del certificado.",
                    [_hallazgo(True, "Conexión segura (HTTPS)"),
                     _hallazgo(False, "No se pudo leer el vencimiento del certificado")])
    if dias <= 0:
        puntaje, resumen = 0, "El certificado SSL está vencido."
    elif dias <= 15:
        puntaje, resumen = 40, f"El certificado vence en {dias} días: conviene renovarlo ya."
    elif dias <= 30:
        puntaje, resumen = 70, f"El certificado vence en {dias} días."
    else:
        puntaje, resumen = 100, f"Certificado vigente, vence en {dias} días."
    return _cat("ssl", "Certificado SSL", puntaje, resumen,
                [_hallazgo(True, "Conexión segura (HTTPS)"),
                 _hallazgo(dias > 30, f"Días restantes del certificado: {dias}", *EXPLICA["ssl_vence"])])


def _cat_velocidad(tiempos: list, cab, html: str, bytes_leidos: int) -> dict:
    tiempo_ms = int(statistics.median(tiempos))
    if tiempo_ms <= 800:
        base = 100
    elif tiempo_ms <= 1500:
        base = 85
    elif tiempo_ms <= 2500:
        base = 65
    elif tiempo_ms <= 4000:
        base = 40
    else:
        base = 20

    comprimido = cab.get("content-encoding", "").lower() in ("gzip", "br", "deflate", "zstd")
    cache = bool(cab.get("cache-control") or cab.get("etag") or cab.get("expires"))
    scripts = len(re.findall(r"<script\b", html, re.I))
    truncado = bytes_leidos >= MAX_BYTES
    peso_kb = round(bytes_leidos / 1024)
    pesada = truncado or scripts > 40
    peso_txt = f"{peso_kb}+ KB de HTML" if truncado else f"{peso_kb} KB de HTML"

    puntaje = max(0, base - (0 if comprimido else 10) - (0 if cache else 5) - (5 if pesada else 0))
    n = len(tiempos)
    hallazgos = [
        _hallazgo(tiempo_ms <= 1500,
                  f"Tiempo de respuesta del servidor: {tiempo_ms} ms ({n} {'medición' if n == 1 else 'mediciones'})",
                  *EXPLICA["velocidad"]),
        _hallazgo(comprimido,
                  "Compresión de contenido activada" if comprimido else "Sin compresión de contenido (gzip o brotli)",
                  *EXPLICA["compresion"]),
        _hallazgo(cache,
                  "Usa caché del navegador" if cache else "No define reglas de caché",
                  *EXPLICA["cache"]),
        _hallazgo(not pesada,
                  f"Página liviana ({peso_txt}, {scripts} scripts)" if not pesada
                  else f"Página pesada ({peso_txt}, {scripts} scripts)",
                  *EXPLICA["peso"]),
    ]
    resumen = (f"El servidor respondió en {tiempo_ms} ms." if n == 1
               else f"El servidor respondió en {tiempo_ms} ms (mediana de {n} mediciones).")
    return _cat("velocidad", "Velocidad", puntaje, resumen, hallazgos)


def _versiones_expuestas(cab, html: str) -> list:
    hallado = []
    for nombre in ("server", "x-powered-by"):
        valor = cab.get(nombre, "")
        if re.search(r"\d+\.\d+", valor):
            hallado.append(valor[:60])
    gen = re.search(r"<meta[^>]+name=[\"']generator[\"'][^>]*content=[\"']([^\"']+)", html, re.I)
    if gen and re.search(r"\d+\.\d+", gen.group(1)):
        hallado.append(gen.group(1)[:60])
    return hallado


def _cat_seguridad(cab, html: str, es_https: bool, redirige_https) -> dict:
    csp = cab.get("content-security-policy", "").strip()
    csp_debil = csp.lower().replace(" ", "") in ("", "upgrade-insecure-requests")
    versiones = _versiones_expuestas(cab, html)
    checks = [
        (10, redirige_https if es_https else False,
         "El sitio redirige de http a https", "No fuerza la redirección de http a https", *EXPLICA["https_redirect"]),
        (20, bool(cab.get("strict-transport-security")) and es_https,
         "HSTS activado (obliga a usar HTTPS)", "Falta HSTS (obliga a usar HTTPS)", *EXPLICA["hsts"]),
        (20, bool(cab.get("x-frame-options")) or "frame-ancestors" in csp.lower(),
         "Protección contra clickjacking activada", "Falta protección contra clickjacking", *EXPLICA["xfo"]),
        (15, cab.get("x-content-type-options", "").lower() == "nosniff",
         "Protección de tipo de contenido (nosniff) activada", "Falta la protección de tipo de contenido (nosniff)", *EXPLICA["xcto"]),
        (10, not csp_debil,
         "Política de seguridad de contenido (CSP) definida", "Falta una política de seguridad de contenido (CSP) completa", *EXPLICA["csp"]),
        (10, bool(cab.get("referrer-policy")),
         "Política de referrer definida", "Falta la política de referrer", *EXPLICA["referrer"]),
        (5, bool(cab.get("permissions-policy")),
         "Política de permisos del navegador definida", "Falta la política de permisos del navegador", *EXPLICA["permisos"]),
        (10, not versiones,
         "No expone versiones de software", "Expone versiones de software: " + ", ".join(versiones), *EXPLICA["versiones"]),
    ]
    puntaje, cumplidos, total, hallazgos = _evaluar(checks)
    cat = _cat("seguridad", "Seguridad", puntaje,
               f"Cumple {cumplidos} de {total} comprobaciones de seguridad básicas.", hallazgos)
    if es_https and cat["estado"] == "critico":
        cat["estado"] = "atencion"
    return cat


def _cat_seo(html: str, es_https: bool, robots, sitemap) -> dict:
    titulo = re.search(r"<title[^>]*>\s*(.*?)\s*</title>", html, re.I | re.S)
    desc = re.search(r"<meta[^>]+name=[\"']description[\"'][^>]*>", html, re.I)
    desc_ok = bool(desc and re.search(r"content=[\"'][^\"']{10,}", desc.group(0), re.I))
    viewport = bool(re.search(r"<meta[^>]+name=[\"']viewport[\"']", html, re.I))
    h1 = bool(re.search(r"<h1[\s>]", html, re.I))
    og = (bool(re.search(r"<meta[^>]+property=[\"']og:title[\"']", html, re.I))
          and bool(re.search(r"<meta[^>]+property=[\"']og:image[\"']", html, re.I)))
    checks = [
        (15, bool(titulo and titulo.group(1).strip()),
         "Tiene título de página", "Falta el título de la página", *EXPLICA["titulo"]),
        (15, desc_ok,
         "Tiene meta descripción", "Falta la meta descripción", *EXPLICA["descripcion"]),
        (15, viewport,
         "Está preparado para móviles (viewport)", "No está preparado para móviles (falta viewport)", *EXPLICA["viewport"]),
        (10, h1,
         "Tiene un encabezado principal (H1)", "No se encontró un encabezado principal (H1)", *EXPLICA["h1"]),
        (10, es_https,
         "Usa HTTPS", "No usa HTTPS", *EXPLICA["https"]),
        (15, og,
         "Se ve bien al compartirlo en redes (Open Graph)",
         "Al compartir el enlace en redes no se verá título ni imagen (faltan etiquetas Open Graph)", *EXPLICA["og"]),
        (10, robots,
         "Tiene archivo robots.txt", "No se encontró el archivo robots.txt", *EXPLICA["robots"]),
        (10, sitemap,
         "Tiene mapa del sitio (sitemap)", "No se encontró un mapa del sitio (sitemap)", *EXPLICA["sitemap"]),
    ]
    puntaje, cumplidos, total, hallazgos = _evaluar(checks)
    return _cat("seo", "SEO y móvil", puntaje,
                f"Cumple {cumplidos} de {total} comprobaciones de SEO y móvil.", hallazgos)


def _sitio_inaccesible(url: str, analizado_en: str, motivo: str) -> dict:
    return {
        "url": url,
        "url_final": url,
        "analizado_en": analizado_en,
        "estado_http": None,
        "tiempo_respuesta_ms": None,
        "puntaje_global": 0,
        "categorias": [_cat("disponibilidad", "Disponibilidad", 0, motivo,
                            [_hallazgo(False, motivo, *EXPLICA["disp"])])],
    }


def auditar_url(texto: str) -> dict:
    inicio_total = time.perf_counter()
    url = normalizar_url(texto)
    analizado_en = datetime.now(timezone.utc).isoformat()
    try:
        cab, estado_http, url_final, tiempo_ms, html, bytes_leidos = _descargar(url)
    except DominioNoResuelve:
        return _sitio_inaccesible(url, analizado_en, "El dominio no existe o no se pudo encontrar.")
    except httpx.RequestError as e:
        if "CERTIFICATE" in str(e).upper():
            motivo = "El certificado SSL del sitio no es válido o no es de confianza."
        else:
            motivo = "El sitio no respondió a tiempo o rechazó la conexión."
        return _sitio_inaccesible(url, analizado_en, motivo)

    p = urlparse(url_final)
    es_https = p.scheme == "https"
    base = f"{p.scheme}://{p.netloc}"

    tiempos = [tiempo_ms]
    if tiempo_ms < 3000:
        for _ in range(2):
            if time.perf_counter() - inicio_total > 10:
                break
            t = _medir_tiempo(url_final)
            if t is not None:
                tiempos.append(t)

    redirige = _redirige_a_https(p.hostname, inicio_total) if es_https else False
    robots, sitemap = _revisar_robots_y_sitemap(base, inicio_total)

    categorias = [
        _cat_disponibilidad(estado_http, url, url_final),
        _cat_ssl(es_https, url_final),
        _cat_velocidad(tiempos, cab, html, bytes_leidos),
        _cat_seguridad(cab, html, es_https, redirige),
        _cat_seo(html, es_https, robots, sitemap),
    ]
    puntaje = round(sum(c["puntaje"] * PESOS[c["id"]] for c in categorias))
    return {
        "url": url,
        "url_final": url_final,
        "analizado_en": analizado_en,
        "estado_http": estado_http,
        "tiempo_respuesta_ms": int(statistics.median(tiempos)),
        "puntaje_global": puntaje,
        "categorias": categorias,
    }