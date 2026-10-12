from datetime import datetime, timezone, timedelta

from app.services.telegram_bot import enviar_alerta

ZONA_PERU = timezone(timedelta(hours=-5))


def _hora_actual() -> str:
    return datetime.now(ZONA_PERU).strftime("%d/%m/%Y %I:%M %p")


def evaluar_y_alertar(sitio_nombre: str, sitio_url: str, resultado: dict) -> list[str]:
    
    alertas_enviadas = []
    hora = _hora_actual()

    if not resultado.get("disponible"):
        mensaje = (
            f"🔴 <b>SITIO CAÍDO</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🏢 <b>Cliente:</b> {sitio_nombre}\n"
            f"🔗 <b>URL:</b> {sitio_url}\n"
            f"📡 <b>Código HTTP:</b> {resultado.get('codigo_http') or 'Sin respuesta'}\n"
            f"🕒 <b>Detectado:</b> {hora}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ Se recomienda verificar el hosting o el estado del dominio."
        )
        if enviar_alerta(mensaje):
            alertas_enviadas.append("sitio_caido")
    else:
        mensaje = (
            f"🟢 <b>SITIO RECUPERADO</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🏢 <b>Cliente:</b> {sitio_nombre}\n"
            f"🔗 <b>URL:</b> {sitio_url}\n"
            f"⏱️ <b>Tiempo de respuesta:</b> {resultado.get('tiempo_respuesta_ms')} ms\n"
            f"🕒 <b>Recuperado:</b> {hora}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"✅ El sitio ya está disponible nuevamente."
        )
        if enviar_alerta(mensaje):
            alertas_enviadas.append("sitio_recuperado")

    tiempo_ms = resultado.get("tiempo_respuesta_ms")
    if resultado.get("disponible") and tiempo_ms and tiempo_ms > 3000:
        mensaje = (
            f"🟡 <b>SITIO LENTO</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🏢 <b>Cliente:</b> {sitio_nombre}\n"
            f"🔗 <b>URL:</b> {sitio_url}\n"
            f"⏱️ <b>Tiempo de respuesta:</b> {tiempo_ms} ms\n"
            f"🕒 <b>Detectado:</b> {hora}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ Supera el umbral de 3000 ms. Revisar rendimiento."
        )
        if enviar_alerta(mensaje):
            alertas_enviadas.append("sitio_lento")

    dias_ssl = resultado.get("ssl_dias_restantes")
    if dias_ssl is not None and dias_ssl <= 15:
        mensaje = (
            f"⚠️ <b>SSL POR VENCER</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🏢 <b>Cliente:</b> {sitio_nombre}\n"
            f"🔗 <b>URL:</b> {sitio_url}\n"
            f"📅 <b>Días restantes:</b> {dias_ssl}\n"
            f"🕒 <b>Verificado:</b> {hora}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🔒 Renovar el certificado antes del vencimiento."
        )
        if enviar_alerta(mensaje):
            alertas_enviadas.append("ssl_por_vencer")

    return alertas_enviadas

def enviar_resumen(resultados: list[dict]) -> bool:
    caidos_ahora = [r for r in resultados if not r["disponible"]]
    nuevos_caidos = [r for r in caidos_ahora if r["cambio"]]
    recuperados = [r for r in resultados if r["disponible"] and r["cambio"]]
    ssl_por_vencer = [r for r in resultados if r["ssl_dias"] is not None and r["ssl_dias"] <= 15 and r["ssl_cambio"]]
    if not (nuevos_caidos or recuperados or ssl_por_vencer):
        return False

    icono = "🔴" if caidos_ahora else "🟢"
    if caidos_ahora:
        estado = f"{len(caidos_ahora)} de {len(resultados)} sitios caídos"
    else:
        estado = f"Los {len(resultados)} sitios están disponibles"

    lineas = [f"{icono} <b>Monitor ConsigueVentas</b> · {_hora_actual()}", estado]

    if nuevos_caidos:
        lineas.append("\n🔻 <b>Cayeron:</b>")
        lineas += [f"• {r['nombre']} ({r['codigo'] or 'sin respuesta'})" for r in nuevos_caidos]
    if recuperados:
        lineas.append("\n✅ <b>Recuperados:</b>")
        lineas += [f"• {r['nombre']}" for r in recuperados]
    if ssl_por_vencer:
        lineas.append("\n🔒 <b>SSL por vencer:</b>")
        lineas += [f"• {r['nombre']} ({r['ssl_dias']} días)" for r in ssl_por_vencer]

    return enviar_alerta("\n".join(lineas))