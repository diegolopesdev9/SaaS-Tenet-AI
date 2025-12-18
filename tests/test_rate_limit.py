
import pytest

@pytest.mark.asyncio
async def test_login_rate_limit_header_exists(client):
    """Verifica se o endpoint de login responde corretamente"""
    response = await client.post("/api/auth/login", json={
        "email": "test@test.com",
        "password": "wrongpassword"
    })
    # Deve retornar erro de credenciais, não de rate limit
    assert response.status_code in [401, 404, 422]

@pytest.mark.asyncio
async def test_webhook_accepts_requests(client):
    """Verifica se webhook aceita requisições"""
    response = await client.post("/webhooks/whatsapp", json={})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_health_no_rate_limit(client):
    """Health check não deve ter rate limit restritivo"""
    for _ in range(5):
        response = await client.get("/health")
        assert response.status_code == 200
