
import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  User, 
  Building, 
  Briefcase, 
  Target, 
  Phone, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Bot, 
  RefreshCw 
} from 'lucide-react'
import api from '../services/api'

export default function ConversationDetail({ agencyId }) {
  const { conversationId } = useParams()
  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadConversation()
  }, [agencyId, conversationId])

  const loadConversation = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/agencias/${agencyId}/conversas/${conversationId}`)
      setConversation(response.data)
    } catch (error) {
      console.error('Erro ao carregar conversa:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus) => {
    try {
      setUpdating(true)
      await api.patch(
        `/agencias/${agencyId}/conversas/${conversationId}/status`,
        null,
        { params: { new_status: newStatus } }
      )
      
      // Atualizar estado local
      setConversation(prev => ({
        ...prev,
        lead_status: newStatus
      }))
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status')
    } finally {
      setUpdating(false)
    }
  }

  // Configuração de status
  const statusConfig = {
    iniciada: {
      label: 'Iniciada',
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      icon: Clock
    },
    em_andamento: {
      label: 'Em Andamento',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: MessageSquare
    },
    qualificado: {
      label: 'Qualificado',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: CheckCircle
    },
    perdido: {
      label: 'Perdido',
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: XCircle
    },
    agendado: {
      label: 'Agendado',
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      icon: Calendar
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-[#1A1A1A] min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Carregando conversa...</p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="text-center py-12 bg-[#1A1A1A] min-h-screen">
        <p className="text-gray-400">Conversa não encontrada</p>
        <Link
          to="/conversas"
          className="mt-4 inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para conversas
        </Link>
      </div>
    )
  }

  const leadData = conversation.lead_data || {}
  const history = conversation.historico_json || []
  const currentStatus = conversation.lead_status || 'iniciada'
  const statusInfo = statusConfig[currentStatus] || statusConfig.em_andamento
  const StatusIcon = statusInfo.icon

  return (
    <div className="space-y-6 bg-[#1A1A1A] min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/conversas"
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {leadData.nome || 'Lead sem nome'}
            </h1>
            <p className="text-sm text-gray-400">{conversation.lead_phone}</p>
          </div>
        </div>
        <button
          onClick={loadConversation}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D2D2D] border border-white/20 rounded-lg text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Layout em 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 - Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Card Status */}
          <div className="bg-[#2D2D2D] rounded-lg border border-white/10 p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Status do Lead</h2>
            
            {/* Status atual */}
            <div className="mb-4">
              <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${statusInfo.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusInfo.label}
              </span>
            </div>

            {/* Botões para mudar status */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700 mb-2">Alterar para:</p>
              {Object.entries(statusConfig).map(([status, config]) => {
                if (status === currentStatus) return null
                const Icon = config.icon
                
                return (
                  <button
                    key={status}
                    onClick={() => updateStatus(status)}
                    disabled={updating}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${config.color} hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Card Dados do Lead */}
          <div className="bg-[#2D2D2D] rounded-lg border border-white/10 p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Dados do Lead</h2>
            
            <div className="space-y-3">
              {leadData.nome && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">Nome</p>
                    <p className="text-sm font-medium text-white">{leadData.nome}</p>
                  </div>
                </div>
              )}

              {leadData.empresa && (
                <div className="flex items-start gap-3">
                  <Building className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">Empresa</p>
                    <p className="text-sm font-medium text-white">{leadData.empresa}</p>
                  </div>
                </div>
              )}

              {leadData.cargo && (
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">Cargo</p>
                    <p className="text-sm font-medium text-white">{leadData.cargo}</p>
                  </div>
                </div>
              )}

              {leadData.desafio && (
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">Desafio</p>
                    <p className="text-sm font-medium text-white">{leadData.desafio}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Telefone</p>
                  <p className="text-sm font-medium text-white">{conversation.lead_phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card Estatísticas */}
          <div className="bg-[#2D2D2D] rounded-lg border border-white/10 p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Estatísticas</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">Total de mensagens</span>
                </div>
                <span className="text-sm font-semibold text-white">
                  {conversation.total_mensagens || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Turnos de conversa</span>
                </div>
                <span className="text-sm font-semibold text-white">
                  {Math.floor((conversation.total_mensagens || 0) / 2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2 - Histórico (2/3) */}
        <div className="lg:col-span-2">
          <div className="bg-[#2D2D2D] rounded-lg border border-white/10">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Histórico da Conversa</h2>
              <p className="text-sm text-gray-400 mt-1">
                {history.length} {history.length === 1 ? 'mensagem' : 'mensagens'}
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto bg-[#1A1A1A]">
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                history.map((msg, index) => {
                  const isUser = msg.role === 'user'
                  
                  return (
                    <div
                      key={index}
                      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isUser 
                          ? 'bg-cyan-600' 
                          : 'bg-gray-700'
                      }`}>
                        {isUser ? (
                          <User className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-gray-300" />
                        )}
                      </div>

                      {/* Mensagem */}
                      <div className={`flex-1 max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-4 py-3 rounded-lg ${
                          isUser 
                            ? 'bg-cyan-600 text-white' 
                            : 'bg-[#2D2D2D] text-white border border-white/10'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.timestamp && (
                          <p className="text-xs text-gray-500 mt-1 px-1">
                            {formatTimestamp(msg.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
