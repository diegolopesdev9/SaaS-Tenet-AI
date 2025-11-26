
"""Main FastAPI application."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes import health, webhooks
from app.database import health_check

app = FastAPI(
    title="SDR Agent SaaS API",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(webhooks.router)


@app.on_event("startup")
async def startup_event():
    """Application startup event handler."""
    print("Starting SDR Agent SaaS API...")
    db_connected = await health_check()
    if db_connected:
        print("✓ Database connection successful")
    else:
        print("✗ Database connection failed")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler.
    
    Args:
        request: The request that caused the exception
        exc: The exception raised
        
    Returns:
        JSON error response
    """
    print(f"Global exception handler caught: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc)
        }
    )
