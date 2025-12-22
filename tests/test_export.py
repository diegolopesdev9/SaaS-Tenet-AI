
import pytest

@pytest.mark.asyncio
async def test_export_csv_requires_auth(client):
    """Testa que exportação CSV requer autenticação"""
    response = await client.get("/api/export/leads/csv")
    assert response.status_code in [401, 403]

@pytest.mark.asyncio
async def test_export_json_requires_auth(client):
    """Testa que exportação JSON requer autenticação"""
    response = await client.get("/api/export/leads/json")
    assert response.status_code in [401, 403]
