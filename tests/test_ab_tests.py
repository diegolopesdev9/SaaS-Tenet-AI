
import pytest

@pytest.mark.asyncio
async def test_list_ab_tests_requires_auth(client):
    """Testa que listagem requer autenticação"""
    response = await client.get("/ab-tests")
    assert response.status_code in [401, 403]

@pytest.mark.asyncio
async def test_get_active_test_requires_auth(client):
    """Testa que busca de teste ativo requer autenticação"""
    response = await client.get("/ab-tests/active")
    assert response.status_code in [401, 403]

@pytest.mark.asyncio
async def test_create_test_requires_auth(client):
    """Testa que criação requer autenticação"""
    response = await client.post("/ab-tests", json={
        "nome": "Teste",
        "variante_a_prompt": "Prompt A",
        "variante_b_prompt": "Prompt B"
    })
    assert response.status_code in [401, 403]
