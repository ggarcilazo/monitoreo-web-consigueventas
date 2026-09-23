import ssl
import socket
from datetime import datetime, timezone
from urllib.parse import urlparse


def verificar_ssl(url: str, timeout: int = 10) -> dict:
    dominio = urlparse(url).hostname
    if not dominio:
        return {"ssl_valido": None, "ssl_dias_restantes": None}

    try:
        contexto = ssl.create_default_context()
        with socket.create_connection((dominio, 443), timeout=timeout) as sock:
            with contexto.wrap_socket(sock, server_hostname=dominio) as ssock:
                cert = ssock.getpeercert()

        fecha_venc = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
        fecha_venc = fecha_venc.replace(tzinfo=timezone.utc)
        dias_restantes = (fecha_venc - datetime.now(timezone.utc)).days

        return {"ssl_valido": dias_restantes > 0, "ssl_dias_restantes": dias_restantes}
    except Exception:
        return {"ssl_valido": False, "ssl_dias_restantes": None}