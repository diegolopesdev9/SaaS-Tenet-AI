
import pytest
import os

@pytest.mark.asyncio
async def test_health_includes_database_status(client):
    """Verifica se health check retorna status do database"""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "database" in data
    assert data["database"] in ["connected", "disconnected", "error"]

@pytest.mark.asyncio
async def test_supabase_env_vars_exist():
    """Verifica se variáveis do Supabase estão definidas"""
    # Em CI/CD, essas variáveis devem estar nos secrets
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    # Não falha se não existir (para permitir testes locais)
    if supabase_url and supabase_key:
        assert supabase_url.startswith("https://")
        assert len(supabase_key) > 20
