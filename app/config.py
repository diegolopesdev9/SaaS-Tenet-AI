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

    # JWT Configuration
    JWT_SECRET: str = Field(
        default="change-me-in-production",
        description="Secret key for JWT tokens"
    )
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
    EVOLUTION_API_URL: str = Field(..., description="Evolution API URL")
    EVOLUTION_API_KEY: str = Field(..., description="Evolution API Key")

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