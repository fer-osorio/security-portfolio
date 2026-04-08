import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.aes import router as aes_router

app = FastAPI(title="Security Portfolio — Backend")

origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST"],
    allow_headers=["*"],
)

app.include_router(aes_router)

@app.get("/health")
def health():
    return {"status": "ok"}
