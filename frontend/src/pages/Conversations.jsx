
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Users, MessageSquare, Clock, CheckCircle, XCircle, Calendar, ChevronRight, RefreshCw } from 'lucide-react'
import api from '../services/api'

export default function Conversations({ agencyId }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadConversations()
  }, [agencyId, filter])

  const loadConversations = async () => {
    try {
      setLoading(true)

      // Construir query params
      const params = { limit: 50 }
      if (filter !== 'all') {
        params.status = filter
      }

      // Carregar conversas
      const response = await api.get(`/agencias/${agencyId}/conversas`, { params })
      const data = response.data || []
      
      setConversations(data)
      setTotal(data.length)

    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      setConversations([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // Configuração de status
  const statusConfig = {
    iniciada: {
      label: 'Iniciada',
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: Clock
    },
    em_andamento: {
      label: 'Em Andamento',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: MessageSquare
    },
    qualificado: {
      label: 'Qualificado',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: CheckCircle
    },
    perdido: {
      label: 'Perdido',
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: XCircle
    },
    agendado: {
      label: 'Agendado',
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: Calendar
    }
  }

  // Filtros de status
  const filters = [
    { value: 'all', label: 'Todos' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'qualificado', label: 'Qualificados' },
    { value: 'agendado', label: 'Agendados' },
    { value: 'perdido', label: 'Perdidos' }
  ]

  // Função para obter badge de status
  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.em_andamento
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    )
  }

  // Função para obter iniciais do nome
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Filtrar conversas pela busca local
  const filteredConversations = conversations.filter(conv => {
    if (!search) return true

    const searchLower = search.toLowerCase()
    const nome = conv.lead_data?.nome?.toLowerCase() || ''
    const empresa = conv.lead_data?.empresa?.toLowerCase() || ''
    const telefone = conv.lead_phone?.toLowerCase() || ''

    return nome.includes(searchLower) || 
           empresa.includes(searchLower) || 
           telefone.includes(searchLower)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversas</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} {total === 1 ? 'conversa encontrada' : 'conversas encontradas'}
          </p>
        </div>
        <button
          onClick={loadConversations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, empresa ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtros de status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando conversas...</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma conversa encontrada
            </h3>
            <p className="text-gray-500">
              {search ? 'Tente ajustar sua busca' : 'As conversas aparecerão aqui quando iniciadas'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conv) => {
              const leadName = conv.lead_data?.nome || 'Lead sem nome'
              const leadCompany = conv.lead_data?.empresa
              const leadPhone = conv.lead_phone

              return (
                <Link
                  key={conv.id}
                  to={`/conversas/${conv.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {conv.lead_data?.nome ? getInitials(conv.lead_data.nome) : <Users className="w-6 h-6" />}
                  </div>

                  {/* Informações do lead */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {leadName}
                      </h3>
                      {getStatusBadge(conv.lead_status)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="truncate">{leadPhone}</span>
                      {leadCompany && (
                        <>
                          <span>•</span>
                          <span className="truncate">{leadCompany}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mensagens e seta */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MessageSquare className="w-4 h-4" />
                      <span>{conv.total_mensagens || 0}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
