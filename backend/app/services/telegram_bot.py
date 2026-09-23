import httpx

from app.config import settings


def enviar_alerta(mensaje: str) -> bool:
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return False

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": mensaje,
        "parse_mode": "HTML",
    }

    try:
        respuesta = httpx.post(url, json=payload, timeout=10)
        return respuesta.status_code == 200
    except httpx.RequestError:
        return False