from fastapi import FastAPI
from app.routers import sitios, chequeos

app = FastAPI(
    title="Monitoreo Web ConsigueVentas",
    description="Sistema de monitoreo y auditoría de sitios web",
    version="0.1.0",
)

app.include_router(sitios.router)
app.include_router(chequeos.router)


@app.get("/")
def raiz():
    return {"mensaje": "API de monitoreo web funcionando"}