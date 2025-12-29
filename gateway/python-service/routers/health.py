"""Health check endpoint."""

from datetime import datetime
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check():
    """Return service health status."""
    return {
        "status": "healthy",
        "service": "python-service",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
