
import pytest

@pytest.mark.asyncio
async def test_whatsapp_webhook_empty_message(client):
    """Testa webhook com mensagem vazia - deve retornar 200"""
    payload = {
        "data": {
            "key": {"remoteJid": "5511999999999@s.whatsapp.net"},
            "pushName": "Teste",
            "message": {}
        }
    }
    response = await client.post("/webhooks/whatsapp", json=payload)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_whatsapp_webhook_no_data(client):
    """Testa webhook sem data - deve retornar 200"""
    response = await client.post("/webhooks/whatsapp", json={})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_rdstation_webhook(client):
    """Testa webhook RD Station"""
    payload = {"leads": [{"email": "test@test.com"}]}
    response = await client.post("/webhooks/rdstation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == 200

@pytest.mark.asyncio
async def test_whatsapp_health(client):
    """Testa endpoint de health do webhook"""
    response = await client.get("/webhooks/whatsapp/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
