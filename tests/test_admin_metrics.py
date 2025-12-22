
import pytest

@pytest.mark.asyncio
async def test_general_metrics_requires_auth(client):
    """Testa que métricas gerais requerem autenticação"""
    response = await client.get("/api/admin/metrics/geral")
    assert response.status_code in [401, 403]

@pytest.mark.asyncio
async def test_general_metrics_with_period(client):
    """Testa parâmetro de período"""
    response = await client.get("/api/admin/metrics/geral?period=30d")
    assert response.status_code in [401, 403]
