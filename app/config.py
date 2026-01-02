"""Configuration management using pydantic-settings."""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings with environment variable validation."""

    SUPABASE_URL: str = Field(..., description="Supabase project URL")
    SUPABASE_KEY: str = Field(..., description="Supabase anon/service key")
    ENCRYPTION_KEY: str = Field(..., description="Fernet encryption master key")
    ENVIRONMENT: str = Field(default="development", description="Environment: dev/prod")

    # Sentry
    SENTRY_DSN: str = Field(
        default="",
        description="DSN do Sentry para error tracking"
    )

    # JWT Configuration - SEM DEFAULT INSEGURO
    JWT_SECRET: str = Field(
        ...,  # Campo obrigatório, sem default
        min_length=32,
        description="Secret key for JWT tokens (min 32 chars)"
    )
    JWT_SECRET_KEY: str = Field(
        default="",
        description="Alias for JWT_SECRET (deprecated)"
    )

    @property
    def jwt_secret_validated(self) -> str:
        """Retorna JWT secret validado."""
        secret = self.JWT_SECRET or self.JWT_SECRET_KEY
        if not secret or len(secret) < 32:
            raise ValueError(
                "JWT_SECRET deve ter no mínimo 32 caracteres. "
                "Gere com: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if secret in ["change-me-in-production", "sua-chave-secreta-muito-segura-mude-em-producao"]:
            raise ValueError("JWT_SECRET ainda está com valor de exemplo! Configure uma chave segura.")
        return secret
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="Algorithm for JWT"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Token expiration time in minutes"
    )

    # Encryption
    FERNET_KEY: str = Field(
        default="",
        description="Fernet key for encryption"
    )

    # CORS Configuration
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="Comma-separated list of allowed origins"
    )

    @property
    def cors_origins_list(self) -> list:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # AI Configuration
    GEMINI_API_KEY: str = Field(..., description="Gemini API Key")
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # WhatsApp Configuration
    EVOLUTION_API_URL: str = Field(default="", description="URL da Evolution API")
    EVOLUTION_API_KEY: str = Field(default="", description="API Key da Evolution API")

    # Google Calendar
    GOOGLE_CLIENT_ID: str = Field(
        default="",
        description="Google OAuth Client ID"
    )
    GOOGLE_CLIENT_SECRET: str = Field(
        default="",
        description="Google OAuth Client Secret"
    )
    GOOGLE_REDIRECT_URI: str = Field(
        default="",
        description="Google OAuth Redirect URI"
    )

    # Meta WhatsApp
    META_WEBHOOK_VERIFY_TOKEN: str = Field(
        default="tenet_ai_verify_token",
        description="Token para verificação do webhook Meta"
    )

    # Alertas
    SLACK_WEBHOOK_URL: str = Field(
        default="",
        description="URL do webhook Slack para alertas"
    )

    # Default Agency
    DEFAULT_AGENCY_ID: Optional[str] = Field(None, description="Optional default agency ID")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()