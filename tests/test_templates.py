
import pytest

@pytest.mark.asyncio
async def test_list_nichos(client):
    """Testa listagem de nichos"""
    response = await client.get("/templates/nichos")
    assert response.status_code == 200
    data = response.json()
    assert "nichos" in data

@pytest.mark.asyncio
async def test_list_templates(client):
    """Testa listagem de templates"""
    response = await client.get("/templates")
    assert response.status_code == 200
    data = response.json()
    assert "templates" in data
    assert "total" in data

@pytest.mark.asyncio
async def test_list_templates_by_nicho(client):
    """Testa filtro de templates por nicho"""
    response = await client.get("/templates?nicho=sdr")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_get_default_template_not_found(client):
    """Testa busca de template padrão inexistente"""
    response = await client.get("/templates/nicho/inexistente/default")
    assert response.status_code == 404
