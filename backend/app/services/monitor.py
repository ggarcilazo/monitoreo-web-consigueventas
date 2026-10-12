import time
import httpx


def verificar_disponibilidad(url: str, timeout: int = 15) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    }
    inicio = time.perf_counter()
    try:
        respuesta = httpx.get(url, timeout=timeout, follow_redirects=True, headers=headers)
        tiempo_ms = int((time.perf_counter() - inicio) * 1000)
        return {
            "disponible": respuesta.status_code < 400,
            "codigo_http": respuesta.status_code,
            "tiempo_respuesta_ms": tiempo_ms,
        }
    except httpx.RequestError:
        return {"disponible": False, "codigo_http": None, "tiempo_respuesta_ms": None}