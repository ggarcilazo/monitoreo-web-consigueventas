from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import requerir_usuario
from app.routers import sitios, chequeos, publico

app = FastAPI(
    title="Monitoreo Web ConsigueVentas",
    description="Sistema de monitoreo y auditoría de sitios web",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://monitoreo-web-consigueventas.giovanni-g-lopez-21.workers.dev",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Cron-Key"],
)

app.include_router(sitios.router, dependencies=[Depends(requerir_usuario)])
app.include_router(chequeos.router)
app.include_router(publico.router)


@app.get("/")
def raiz():
    return {"mensaje": "API de monitoreo web funcionando"}

@app.get("/me")
def perfil(usuario: dict = Depends(requerir_usuario)):
    return usuario