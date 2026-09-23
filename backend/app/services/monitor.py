import time
import httpx


def verificar_disponibilidad(url: str, timeout: int = 10) -> dict:
    inicio = time.perf_counter()
    try:
        respuesta = httpx.get(url, timeout=timeout, follow_redirects=True)
        tiempo_ms = int((time.perf_counter() - inicio) * 1000)
        return {
            "disponible": respuesta.status_code < 400,
            "codigo_http": respuesta.status_code,
            "tiempo_respuesta_ms": tiempo_ms,
        }
    except httpx.RequestError:
        return {
            "disponible": False,
            "codigo_http": None,
            "tiempo_respuesta_ms": None,
        }   