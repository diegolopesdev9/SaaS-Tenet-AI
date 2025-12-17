
import pytest

@pytest.mark.asyncio
async def test_login_missing_credentials(client):
    """Testa login sem credenciais"""
    response = await client.post("/api/auth/login", json={})
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    """Testa login com credenciais inválidas"""
    response = await client.post("/api/auth/login", json={
        "email": "invalid@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code in [401, 404]

@pytest.mark.asyncio
async def test_me_without_token(client):
    """Testa /me sem token de autenticação"""
    response = await client.get("/api/auth/me")
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_me_with_invalid_token(client):
    """Testa /me com token inválido"""
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
