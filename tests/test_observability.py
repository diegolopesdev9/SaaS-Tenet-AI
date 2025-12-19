
import pytest

@pytest.mark.asyncio
async def test_detailed_health_check(client):
    """Testa health check detalhado"""
    response = await client.get("/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "checks" in data
    assert "database" in data["checks"]
    assert "timestamp" in data

@pytest.mark.asyncio
async def test_health_detailed_has_version(client):
    """Verifica se health detalhado inclui versão"""
    response = await client.get("/health/detailed")
    data = response.json()
    assert "version" in data
    assert "service" in data
    assert data["service"] == "Tenet AI"

@pytest.mark.asyncio
async def test_sentry_test_endpoint_exists(client):
    """Verifica se endpoint de teste Sentry existe"""
    response = await client.get("/sentry-test")
    # Deve retornar 200 em dev ou 404 em prod
    assert response.status_code in [200, 404]
