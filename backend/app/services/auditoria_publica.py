import ipaddress
import re
import socket
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

PESOS = {"disponibilidad": 0.25, "ssl": 0.20, "velocidad": 0.20, "seguridad": 0.20, "seo": 0.15}

CABECERAS_SEGURIDAD = [
    ("strict-transport-security", "HSTS (obliga a usar HTTPS)"),
    ("content-security-policy", "Política de seguridad de contenido (CSP)"),
    ("x-frame-options", "Protección contra clickjacking"),
    ("x-content-type-options", "Protección de tipo de contenido (nosniff)"),
    ("referrer-policy", "Política de referrer"),
    ("permissions-policy", "Política de permisos del navegador"),
]


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


# ---------- Descarga controlada ----------

def _descargar(url: str):
    actual = url
    inicio = time.perf_counter()
    with httpx.Client(timeout=TIMEOUT, headers=HEADERS, follow_redirects=False) as cliente:
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
                    if len(cuerpo) >= MAX_BYTES or time.perf_counter() - inicio > LIMITE_TOTAL_SEG:
                        break
                return r.headers, r.status_code, actual, tiempo_ms, cuerpo.decode("utf-8", errors="ignore")
    raise UrlNoPermitida("El sitio redirige demasiadas veces.")


# ---------- Armado del resultado ----------

def _estado(puntaje: int) -> str:
    if puntaje >= 80:
        return "ok"
    if puntaje >= 50:
        return "atencion"
    return "critico"


def _hallazgo(ok: bool, texto: str) -> dict:
    return {"ok": ok, "texto": texto}


def _cat(id_: str, titulo: str, puntaje: int, resumen: str, hallazgos: list) -> dict:
    return {
        "id": id_,
        "titulo": titulo,
        "puntaje": int(puntaje),
        "estado": _estado(int(puntaje)),
        "resumen": resumen,
        "hallazgos": hallazgos,
    }


def _cat_disponibilidad(estado_http: int, url: str, url_final: str) -> dict:
    if estado_http < 400:
        puntaje, resumen = 100, f"El sitio responde correctamente (HTTP {estado_http})."
    elif estado_http in (401, 403, 429):
        puntaje, resumen = 60, f"El sitio respondió HTTP {estado_http}: probablemente bloquea visitas automáticas."
    else:
        puntaje, resumen = 0, f"El sitio devolvió un error (HTTP {estado_http})."
    hallazgos = [_hallazgo(estado_http < 400, f"Código de respuesta: HTTP {estado_http}")]
    if url_final.rstrip("/") != url.rstrip("/"):
        hallazgos.append(_hallazgo(True, f"Redirige a {url_final}"))
    return _cat("disponibilidad", "Disponibilidad", puntaje, resumen, hallazgos)


def _cat_ssl(es_https: bool, url_final: str) -> dict:
    if not es_https:
        return _cat("ssl", "Certificado SSL", 0,
                    "El sitio no usa HTTPS: los datos viajan sin cifrar.",
                    [_hallazgo(False, "No se detectó conexión segura (HTTPS)")])
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
                 _hallazgo(dias > 30, f"Días restantes del certificado: {dias}")])


def _cat_velocidad(tiempo_ms: int, cab) -> dict:
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
    puntaje = max(0, base - (0 if comprimido else 10) - (0 if cache else 5))
    hallazgos = [
        _hallazgo(tiempo_ms <= 1500, f"Tiempo de respuesta del servidor: {tiempo_ms} ms"),
        _hallazgo(comprimido, "Compresión de contenido activada" if comprimido
                  else "Sin compresión de contenido (gzip o brotli)"),
        _hallazgo(cache, "Usa caché del navegador" if cache else "No define reglas de caché"),
    ]
    return _cat("velocidad", "Velocidad", puntaje, f"El servidor respondió en {tiempo_ms} ms.", hallazgos)


def _cat_seguridad(cab, es_https: bool) -> dict:
    hallazgos = []
    presentes = 0
    csp = cab.get("content-security-policy", "")
    for clave, nombre in CABECERAS_SEGURIDAD:
        if clave == "x-frame-options":
            ok = bool(cab.get(clave)) or "frame-ancestors" in csp.lower()
        elif clave == "strict-transport-security":
            ok = bool(cab.get(clave)) and es_https
        else:
            ok = bool(cab.get(clave))
        presentes += 1 if ok else 0
        hallazgos.append(_hallazgo(ok, nombre if ok else f"Falta: {nombre}"))
    puntaje = round(100 * presentes / len(CABECERAS_SEGURIDAD))
    return _cat("seguridad", "Seguridad", puntaje,
                f"Tiene {presentes} de {len(CABECERAS_SEGURIDAD)} cabeceras de seguridad recomendadas.",
                hallazgos)


def _cat_seo(html: str, es_https: bool) -> dict:
    titulo = re.search(r"<title[^>]*>\s*(.*?)\s*</title>", html, re.I | re.S)
    desc = re.search(r"<meta[^>]+name=[\"']description[\"'][^>]*>", html, re.I)
    desc_ok = bool(desc and re.search(r"content=[\"'][^\"']{10,}", desc.group(0), re.I))
    viewport = bool(re.search(r"<meta[^>]+name=[\"']viewport[\"']", html, re.I))
    h1 = bool(re.search(r"<h1[\s>]", html, re.I))
    comprobaciones = [
        (bool(titulo and titulo.group(1).strip()), "Tiene título de página", "Falta el título de la página"),
        (desc_ok, "Tiene meta descripción", "Falta la meta descripción"),
        (viewport, "Está preparado para móviles (viewport)", "No declara viewport para móviles"),
        (h1, "Tiene un encabezado principal (H1)", "No se encontró un encabezado principal (H1)"),
        (es_https, "Usa HTTPS", "No usa HTTPS"),
    ]
    hallazgos = [_hallazgo(ok, si if ok else no) for ok, si, no in comprobaciones]
    cumplidos = sum(1 for ok, _, _ in comprobaciones if ok)
    return _cat("seo", "SEO básico", round(100 * cumplidos / len(comprobaciones)),
                f"Cumple {cumplidos} de {len(comprobaciones)} comprobaciones básicas.", hallazgos)


def _sitio_inaccesible(url: str, analizado_en: str, motivo: str) -> dict:
    return {
        "url": url,
        "url_final": url,
        "analizado_en": analizado_en,
        "estado_http": None,
        "tiempo_respuesta_ms": None,
        "puntaje_global": 0,
        "categorias": [_cat("disponibilidad", "Disponibilidad", 0, motivo,
                            [_hallazgo(False, motivo)])],
    }


def auditar_url(texto: str) -> dict:
    url = normalizar_url(texto)
    analizado_en = datetime.now(timezone.utc).isoformat()
    try:
        cab, estado_http, url_final, tiempo_ms, html = _descargar(url)
    except DominioNoResuelve:
        return _sitio_inaccesible(url, analizado_en, "El dominio no existe o no se pudo encontrar.")
    except httpx.RequestError as e:
        if "CERTIFICATE" in str(e).upper():
            motivo = "El certificado SSL del sitio no es válido o no es de confianza."
        else:
            motivo = "El sitio no respondió a tiempo o rechazó la conexión."
        return _sitio_inaccesible(url, analizado_en, motivo)

    es_https = urlparse(url_final).scheme == "https"
    categorias = [
        _cat_disponibilidad(estado_http, url, url_final),
        _cat_ssl(es_https, url_final),
        _cat_velocidad(tiempo_ms, cab),
        _cat_seguridad(cab, es_https),
        _cat_seo(html, es_https),
    ]
    puntaje = round(sum(c["puntaje"] * PESOS[c["id"]] for c in categorias))
    return {
        "url": url,
        "url_final": url_final,
        "analizado_en": analizado_en,
        "estado_http": estado_http,
        "tiempo_respuesta_ms": tiempo_ms,
        "puntaje_global": puntaje,
        "categorias": categorias,
    }