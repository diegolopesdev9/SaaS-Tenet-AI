
import pytest

@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "SDR Agent SaaS"
    assert "database" in data

@pytest.mark.asyncio
async def test_health_returns_json(client):
    response = await client.get("/health")
    assert response.headers["content-type"] == "application/json"
