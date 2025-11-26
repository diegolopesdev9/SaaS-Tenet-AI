
"""Configuration management using pydantic-settings."""
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable validation."""
    
    SUPABASE_URL: str = Field(..., description="Supabase project URL")
    SUPABASE_KEY: str = Field(..., description="Supabase anon/service key")
    ENCRYPTION_KEY: str = Field(..., description="Fernet encryption master key")
    ENVIRONMENT: str = Field(default="development", description="Environment: dev/prod")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
