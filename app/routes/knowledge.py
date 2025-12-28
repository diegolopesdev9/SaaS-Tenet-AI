
"""Rotas para gerenciamento da Base de Conhecimento"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from app.services.rag_service import rag_service
from app.routes.auth import get_current_user
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base"])

class DocumentCreate(BaseModel):
    titulo: str
    conteudo: str
    categoria: Optional[str] = "geral"
    metadata: Optional[dict] = None

class DocumentResponse(BaseModel):
    id: UUID
    titulo: str
    categoria: str
    created_at: str

class SearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 5
    categoria: Optional[str] = None

@router.post("/documents")
async def add_document(doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    """Adiciona documento à base de conhecimento"""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Agência não encontrada")
    
    result = await rag_service.add_document(
        tenet_id=UUID(tenet_id),
        titulo=doc.titulo,
        conteudo=doc.conteudo,
        categoria=doc.categoria,
        metadata=doc.metadata
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Erro ao adicionar documento")
    
    return {"status": "success", "document_id": result["id"]}

@router.get("/documents")
async def list_documents(categoria: Optional[str] = None, 
                         current_user: dict = Depends(get_current_user)):
    """Lista documentos da base de conhecimento"""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Agência não encontrada")
    
    docs = await rag_service.list_documents(UUID(tenet_id), categoria)
    return {"documents": docs, "total": len(docs)}

@router.post("/search")
async def search_knowledge(search: SearchQuery, 
                           current_user: dict = Depends(get_current_user)):
    """Busca semântica na base de conhecimento"""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Agência não encontrada")
    
    results = await rag_service.search(
        tenet_id=UUID(tenet_id),
        query=search.query,
        limit=search.limit,
        categoria=search.categoria
    )
    
    return {"results": results, "total": len(results)}

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: UUID, current_user: dict = Depends(get_current_user)):
    """Remove documento da base de conhecimento"""
    success = await rag_service.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=500, detail="Erro ao remover documento")
    return {"status": "deleted"}
