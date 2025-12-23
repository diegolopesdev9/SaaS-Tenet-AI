
import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Upload, Search, Trash2, FileText, Tag, Calendar } from 'lucide-react'
import api from '../services/api'

export default function Knowledge({ agencyId }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDoc, setNewDoc] = useState({ titulo: '', conteudo: '', categoria: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [agencyId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/knowledge/documents')
      setDocuments(response.data.documents || [])
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    
    try {
      setSearching(true)
      const response = await api.post('/knowledge/search', {
        query: searchTerm,
        limit: 5
      })
      setSearchResults(response.data.results || [])
    } catch (error) {
      console.error('Erro na busca:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleAddDocument = async () => {
    if (!newDoc.titulo || !newDoc.conteudo) return
    
    try {
      setAdding(true)
      await api.post('/knowledge/documents', {
        titulo: newDoc.titulo,
        conteudo: newDoc.conteudo,
        categoria: newDoc.categoria || 'geral'
      })
      setNewDoc({ titulo: '', conteudo: '', categoria: '' })
      setShowAddModal(false)
      loadDocuments()
    } catch (error) {
      console.error('Erro ao adicionar documento:', error)
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    
    try {
      await api.delete(`/knowledge/documents/${docId}`)
      loadDocuments()
    } catch (error) {
      console.error('Erro ao excluir documento:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base de Conhecimento</h1>
          <p className="mt-1 text-sm text-gray-500">
            Adicione documentos para enriquecer as respostas da IA
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Documento
        </button>
      </div>

      {/* Busca Semântica */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Busca Semântica</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Digite uma pergunta para testar a busca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchTerm.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-500">Resultados encontrados:</p>
            {searchResults.map((result, index) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-blue-900">{result.titulo}</span>
                  <span className="text-xs text-blue-600">
                    Similaridade: {(result.similarity * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-blue-700 line-clamp-2">{result.conteudo}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Documentos */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            Documentos ({documents.length})
          </h2>
        </div>
        
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum documento adicionado</p>
            <p className="text-sm text-gray-400 mt-1">
              Adicione documentos para a IA usar como contexto
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{doc.titulo}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {doc.conteudo}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        {doc.categoria && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Tag className="w-3 h-3" />
                            {doc.categoria}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Adicionar Documento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Adicionar Documento</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={newDoc.titulo}
                  onChange={(e) => setNewDoc({ ...newDoc, titulo: e.target.value })}
                  placeholder="Ex: Política de preços"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={newDoc.categoria}
                  onChange={(e) => setNewDoc({ ...newDoc, categoria: e.target.value })}
                  placeholder="Ex: produtos, faq, políticas"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conteúdo *
                </label>
                <textarea
                  value={newDoc.conteudo}
                  onChange={(e) => setNewDoc({ ...newDoc, conteudo: e.target.value })}
                  placeholder="Cole aqui o conteúdo do documento..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDocument}
                disabled={adding || !newDoc.titulo || !newDoc.conteudo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {adding ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
