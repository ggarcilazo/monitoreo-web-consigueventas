from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import sitios, chequeos

app = FastAPI(
    title="Monitoreo Web ConsigueVentas",
    description="Sistema de monitoreo y auditoría de sitios web",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sitios.router)
app.include_router(chequeos.router)


@app.get("/")
def raiz():
    return {"mensaje": "API de monitoreo web funcionando"}