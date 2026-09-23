from app.services.telegram_bot import enviar_alerta


def evaluar_y_alertar(sitio_nombre: str, sitio_url: str, resultado: dict) -> list[str]:
    alertas_enviadas = []

    if not resultado.get("disponible"):
        mensaje = (
            f"🔴 <b>Sitio caído</b>\n"
            f"Cliente: {sitio_nombre}\n"
            f"URL: {sitio_url}\n"
            f"Código HTTP: {resultado.get('codigo_http')}"
        )
        if enviar_alerta(mensaje):
            alertas_enviadas.append("sitio_caido")

    tiempo_ms = resultado.get("tiempo_respuesta_ms")
    if tiempo_ms and tiempo_ms > 3000:
        mensaje = (
            f"🟡 <b>Sitio lento</b>\n"
            f"Cliente: {sitio_nombre}\n"
            f"URL: {sitio_url}\n"
            f"Tiempo de respuesta: {tiempo_ms} ms"
        )
        if enviar_alerta(mensaje):
            alertas_enviadas.append("sitio_lento")

    dias_ssl = resultado.get("ssl_dias_restantes")
    if dias_ssl is not None and dias_ssl <= 15:
        mensaje = (
            f"⚠️ <b>SSL por vencer</b>\n"
            f"Cliente: {sitio_nombre}\n"
            f"URL: {sitio_url}\n"
            f"Días restantes: {dias_ssl}"
        )
        if enviar_alerta(mensaje):
            alertas_enviadas.append("ssl_por_vencer")

    return alertas_enviadas