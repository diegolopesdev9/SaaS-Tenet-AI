import React, { useState, useEffect } from 'react'
import { Upload, FileText, Trash2, Eye, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'
import api from '../services/api'

export default function Knowledge({ agencyId }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState(null)
  const [previewDocument, setPreviewDocument] = useState(null)

  useEffect(() => {
    loadDocuments()
  }, [agencyId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/knowledge/documents?agencia_id=${agencyId}`)
      setDocuments(response.data)
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar documentos' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('agencia_id', agencyId)

    try {
      setUploading(true)
      setUploadProgress(0)

      const response = await api.post('/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      setMessage({ type: 'success', text: 'Documento enviado com sucesso!' })
      await loadDocuments()
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao fazer upload' })
    } finally {
      setUploading(false)
      setUploadProgress(0)
      event.target.value = ''
    }
  }

  const handleDelete = async (documentId) => {
    if (!confirm('Tem certeza que deseja deletar este documento?')) return

    try {
      await api.delete(`/knowledge/documents/${documentId}`)
      setMessage({ type: 'success', text: 'Documento deletado com sucesso!' })
      await loadDocuments()
    } catch (error) {
      console.error('Erro ao deletar documento:', error)
      setMessage({ type: 'error', text: 'Erro ao deletar documento' })
    }
  }

  const handlePreview = (document) => {
    setPreviewDocument(document)
  }

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    return <FileText className="w-5 h-5 text-gray-500" />
  }

  const getFileTypeBadge = (filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    const types = {
      pdf: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'PDF' },
      doc: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'DOC' },
      docx: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'DOCX' },
      txt: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'TXT' },
      csv: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'CSV' },
      xlsx: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'XLSX' },
      xls: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'XLS' }
    }
    const type = types[ext] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: ext.toUpperCase() }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${type.bg} ${type.text}`}>
        {type.label}
      </span>
    )
  }

  const getStatusBadge = (status) => {
    const statuses = {
      processing: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Processando', icon: Loader2 },
      processed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Processado', icon: CheckCircle },
      error: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Erro', icon: AlertCircle }
    }
    const statusInfo = statuses[status] || statuses.processed
    const Icon = statusInfo.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${statusInfo.bg} ${statusInfo.text}`}>
        <Icon className="w-3 h-3" />
        {statusInfo.label}
      </span>
    )
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Carregando documentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
        <p className="mt-1 text-sm text-gray-400">
          Faça upload de documentos para treinar o agente com conhecimento específico
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Upload Area */}
      <div className="mb-8">
        <label className="block">
          <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all bg-[#2D2D2D] border-white/30 hover:border-cyan-500 hover:bg-cyan-500/5 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-300 font-medium mb-1">
              {uploading ? 'Fazendo upload...' : 'Clique para fazer upload ou arraste arquivos'}
            </p>
            <p className="text-sm text-gray-500">
              PDF, DOC, DOCX, TXT, CSV, XLSX (máx. 10MB)
            </p>
            {uploading && (
              <div className="mt-4 max-w-xs mx-auto">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 mt-2">{uploadProgress}%</p>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Documents List */}
      <div className="bg-[#2D2D2D] rounded-lg border border-white/10">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Documentos</h2>
          <p className="text-sm text-gray-400 mt-1">
            {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
          </p>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">Nenhum documento enviado ainda</p>
            <p className="text-sm text-gray-500 mt-1">Faça upload do primeiro documento acima</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getFileIcon(doc.filename)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {doc.filename}
                        </p>
                        {getFileTypeBadge(doc.filename)}
                        {getStatusBadge(doc.status || 'processed')}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-gray-400">
                          {formatFileSize(doc.file_size)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(doc.created_at)}
                        </p>
                        {doc.chunks_count && (
                          <p className="text-xs text-gray-400">
                            {doc.chunks_count} fragmentos
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handlePreview(doc)}
                      className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2D2D2D] rounded-lg border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{previewDocument.filename}</h3>
              <button
                onClick={() => setPreviewDocument(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-1">Informações</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Tamanho:</span>
                      <span className="ml-2 text-gray-300">{formatFileSize(previewDocument.file_size)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Data:</span>
                      <span className="ml-2 text-gray-300">{formatDate(previewDocument.created_at)}</span>
                    </div>
                    {previewDocument.chunks_count && (
                      <div>
                        <span className="text-gray-500">Fragmentos:</span>
                        <span className="ml-2 text-gray-300">{previewDocument.chunks_count}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-2">{getStatusBadge(previewDocument.status || 'processed')}</span>
                    </div>
                  </div>
                </div>
                {previewDocument.content && (
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-2">Conteúdo</p>
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-white/10">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {previewDocument.content.substring(0, 1000)}
                        {previewDocument.content.length > 1000 && '...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}