"""Configuration management using pydantic-settings."""
from pydantic_settings import BaseSettings
from pydantic import Field
import os


class Settings(BaseSettings):
    """Application settings with environment variable validation."""

    SUPABASE_URL: str = Field(..., description="Supabase project URL")
    SUPABASE_KEY: str = Field(..., description="Supabase anon/service key")
    ENCRYPTION_KEY: str = Field(..., description="Fernet encryption master key")
    ENVIRONMENT: str = Field(default="development", description="Environment: dev/prod")

    # AI Configuration
    GEMINI_API_KEY: str = Field(..., description="Gemini API Key")

    # WhatsApp Configuration
    EVOLUTION_API_URL: str = Field(..., description="Evolution API URL")
    EVOLUTION_API_KEY: str = Field(..., description="Evolution API Key")

    # Default Agency
    DEFAULT_AGENCY_ID: Optional[str] = Field(None, description="Optional default agency ID")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()