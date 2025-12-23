
import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Plus, Upload, Search, Trash2, FileText, Tag, Calendar, File, X } from 'lucide-react'
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
  const [uploadMode, setUploadMode] = useState('text') // 'text' ou 'file'
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadDocuments()
  }, [agencyId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/knowledge/documents')
      const data = response.data?.documents || response.data || []
      setDocuments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
      setDocuments([])
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
      setSearchResults(response.data?.results || [])
    } catch (error) {
      console.error('Erro na busca:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setNewDoc({ ...newDoc, titulo: file.name.replace(/\.[^/.]+$/, '') })
      
      // Ler conteúdo se for arquivo de texto
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setNewDoc(prev => ({ ...prev, conteudo: e.target.result }))
        }
        reader.readAsText(file)
      }
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
      setSelectedFile(null)
      setUploadMode('text')
      setShowAddModal(false)
      loadDocuments()
    } catch (error) {
      console.error('Erro ao adicionar documento:', error)
      alert('Erro ao adicionar documento. Tente novamente.')
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

  const resetModal = () => {
    setShowAddModal(false)
    setNewDoc({ titulo: '', conteudo: '', categoria: '' })
    setSelectedFile(null)
    setUploadMode('text')
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
        <h2 className="font-semibold text-gray-900 mb-4">🔍 Busca Semântica</h2>
        <p className="text-sm text-gray-500 mb-4">
          Teste a busca por similaridade. Digite uma pergunta e veja quais documentos serão usados como contexto.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ex: Qual é a política de preços?"
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
            <p className="text-sm font-medium text-gray-700">Resultados encontrados:</p>
            {searchResults.map((result, index) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-blue-900">{result.titulo}</span>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    {(result.similarity * 100).toFixed(0)}% similar
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            📚 Documentos ({documents.length})
          </h2>
        </div>
        
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum documento adicionado</p>
            <p className="text-sm text-gray-400 mt-1">
              Adicione documentos para a IA usar como contexto nas conversas
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
                    title="Excluir documento"
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
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Adicionar Documento</h2>
              <button onClick={resetModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setUploadMode('text')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    uploadMode === 'text'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Digitar texto
                </button>
                <button
                  onClick={() => setUploadMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    uploadMode === 'file'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload de arquivo
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Upload de Arquivo */}
              {uploadMode === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arquivo (.txt, .md)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.text"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <File className="w-8 h-8 text-blue-600" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">Clique para selecionar um arquivo</p>
                        <p className="text-sm text-gray-400 mt-1">Suporta .txt e .md</p>
                      </>
                    )}
                  </div>
                </div>
              )}

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
                <select
                  value={newDoc.categoria}
                  onChange={(e) => setNewDoc({ ...newDoc, categoria: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma categoria</option>
                  <option value="produtos">Produtos</option>
                  <option value="servicos">Serviços</option>
                  <option value="precos">Preços</option>
                  <option value="faq">FAQ</option>
                  <option value="politicas">Políticas</option>
                  <option value="processos">Processos</option>
                  <option value="geral">Geral</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conteúdo *
                </label>
                <textarea
                  value={newDoc.conteudo}
                  onChange={(e) => setNewDoc({ ...newDoc, conteudo: e.target.value })}
                  placeholder="Cole aqui o conteúdo do documento..."
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {newDoc.conteudo.length} caracteres
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={resetModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDocument}
                disabled={adding || !newDoc.titulo || !newDoc.conteudo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {adding ? 'Adicionando...' : 'Adicionar Documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
