import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import router

app = FastAPI(title="Drone Telemetry API - Hackathon 2026")

# CORS налаштування
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Підключаємо наші ендпоінти
app.include_router(router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Backend is running with professional structure!"}