"""
AcreBlitz Gateway - Python Service

FastAPI-based weather service using the National Weather Service API.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import health, weather

ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
IS_DEV = ENVIRONMENT in ["development", "dev", "local"]

app = FastAPI(
    title="AcreBlitz Gateway - Python Service",
    description="Python/FastAPI endpoints for the unified API gateway",
    version="1.0.0",
    docs_url="/docs" if IS_DEV else None,
    redoc_url="/redoc" if IS_DEV else None,
    openapi_url="/openapi.json" if IS_DEV else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(weather.router)


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "name": "AcreBlitz Gateway - Python Service",
        "version": "1.0.0",
        "endpoints": {
            "/health": "Service health check",
            "/weather/forecast": "Get weather forecast for coordinates",
        },
    }
