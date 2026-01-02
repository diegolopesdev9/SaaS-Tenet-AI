"""Main FastAPI application."""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.utils.rate_limit import limiter
from app.middleware.request_id import RequestIDMiddleware
from app.routes import health, webhooks, knowledge, templates, ab_tests, export, admin_metrics, lgpd
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.super_admin import router as super_admin_router
from app.routes.integrations import router as integrations_router
from app.routes.notifications import router as notifications_router
from app.routes.templates import router as templates_router
from app.routes.ab_tests import router as ab_tests_router
from app.routes.whatsapp_connection import router as whatsapp_connection_router
from app.routes.google_calendar import router as calendar_router
from app.routes.google_sheets import router as google_sheets_router
from app.routes.admin_config import router as admin_config_router
from app.routes.billing import router as billing_router
from app.routes.register import router as register_router
from app.database import health_check
from app.config import settings

# Inicializa Sentry se configurado
if settings.SENTRY_DSN and "sentry.io" in settings.SENTRY_DSN and "seu-dsn" not in settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=0.1,  # 10% das transações
        profiles_sample_rate=0.1,
        send_default_pii=False,  # Não enviar dados sensíveis
    )

app = FastAPI(
    title="TENET AI API",
    version="3.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ========== CORS CONFIGURATION (SEGURO) ==========
# Determinar origins permitidas baseado no ambiente
def get_cors_origins():
    """Retorna lista de origins permitidas baseado no ambiente."""
    if settings.ENVIRONMENT == "development":
        # Em desenvolvimento, permitir localhost
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ] + settings.cors_origins_list
    else:
        # Em produção, apenas origins configuradas explicitamente
        origins = settings.cors_origins_list
        if not origins:
            raise ValueError(
                "CORS_ORIGINS deve ser configurado em produção! "
                "Ex: CORS_ORIGINS=https://app.tenetai.com.br"
            )
        return origins

cors_origins = get_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Lista específica, nunca ["*"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Removido OPTIONS (automático)
    allow_headers=["Authorization", "Content-Type"],  # Headers específicos
    expose_headers=["X-Request-ID"],  # Headers expostos ao client
    max_age=600,  # Cache preflight por 10 minutos
)

# Log das origins configuradas (apenas em startup)
import logging
logger = logging.getLogger(__name__)
logger.info(f"CORS configurado para origins: {cors_origins}")

app.add_middleware(RequestIDMiddleware)

# Include routers
app.include_router(health.router)
app.include_router(webhooks.router)
app.include_router(lgpd.router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(super_admin_router)
app.include_router(integrations_router)
app.include_router(notifications_router)
app.include_router(knowledge.router)
app.include_router(templates.router)
app.include_router(ab_tests.router)
app.include_router(export.router)
app.include_router(admin_metrics.router)
app.include_router(whatsapp_connection_router)
app.include_router(calendar_router)
app.include_router(google_sheets_router)
app.include_router(admin_config_router)
app.include_router(billing_router)
app.include_router(register_router)

# Servir frontend em produção
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    # Montar assets estáticos
    assets_path = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="static-assets")

    # Rota raiz serve index.html
    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    # Catch-all para React Router (SPA) - deve ser a ÚLTIMA rota
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Ignorar rotas de API
        if full_path.startswith("api") or full_path.startswith("webhooks"):
            raise HTTPException(status_code=404, detail="Not Found")

        # Verificar se é um arquivo estático
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # Retornar index.html para rotas do React
        return FileResponse(os.path.join(frontend_dist, "index.html"))


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