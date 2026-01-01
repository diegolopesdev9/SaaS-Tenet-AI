import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom' // Import useNavigate
import { Search, Filter, Users, MessageSquare, Clock, CheckCircle, XCircle, Calendar, ChevronRight, RefreshCw, Loader2, User } from 'lucide-react' // Import Loader2 and User
import api from '../services/api'

// Helper functions for date and time formatting
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function Conversations({ agencyId }) {
  const navigate = useNavigate() // Initialize useNavigate
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)

  // State for filters (assuming these are needed for the new select elements)
  const [filterStatus, setFilterStatus] = useState('all') // Example state
  const [sortBy, setSortBy] = useState('last_message') // Example state
  const [sortOrder, setSortOrder] = useState('desc') // Example state

  useEffect(() => {
    loadConversations()
  }, [agencyId, filter, filterStatus, sortBy, sortOrder]) // Add new filters to dependency array

  const loadConversations = async () => {
    try {
      setLoading(true)

      // Construir query params
      const params = { limit: 50, status: filterStatus, sortBy: sortBy, sortOrder: sortOrder } // Include new filter params
      // The original code had this condition: if (filter !== 'all') { params.status = filter }
      // It seems filterStatus is now the primary status filter. If 'filter' is still needed for something else,
      // its logic might need to be integrated or clarified. For now, using filterStatus.

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

  // Configuração de status (Keep original statusConfig for getStatusBadge)
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

  // Filtros de status (Keep original filters for the button-based filter)
  const filters = [
    { value: 'all', label: 'Todos' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'qualificado', label: 'Qualificados' },
    { value: 'agendado', label: 'Agendados' },
    { value: 'perdido', label: 'Perdidos' }
  ]

  // Função para obter badge de status
  const getStatusBadge = (status) => {
    // Updated badge styles for dark theme
    const badges = {
      ativo: <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">Ativo</span>,
      concluido: <span className="px-2 py-1 text-xs font-medium rounded-full bg-cyan-500/20 text-cyan-400">Concluído</span>,
      inativo: <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-400">Inativo</span>
    }
    return badges[status] || badges.inativo
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
    <div className="space-y-6 p-6 bg-[#1A1A1A] min-h-screen"> {/* Added dark background */}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversas</h1> {/* Changed text color */}
          <p className="mt-1 text-sm text-gray-400"> {/* Changed text color */}
            {total} {total === 1 ? 'conversa encontrada' : 'conversas encontradas'}
          </p>
        </div>
        <button
          onClick={loadConversations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D2D2D] border border-white/20 rounded-lg text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      {/* Updated filter section for dark theme and select elements */}
      <div className="bg-[#2D2D2D] rounded-lg border border-white/10 p-6">
        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, empresa ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Filtros de status (buttons) */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">Status:</span>
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.value
                    ? 'bg-cyan-600 text-white' // Dark theme active filter
                    : 'bg-[#3A3A3A] text-white hover:bg-[#4A4A4A]' // Dark theme inactive filter
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* New Select Filters for dark theme */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all" className="bg-[#1A1A1A] text-white">Todos</option>
                <option value="em_andamento" className="bg-[#1A1A1A] text-white">Em Andamento</option>
                <option value="qualificado" className="bg-[#1A1A1A] text-white">Qualificado</option>
                <option value="agendado" className="bg-[#1A1A1A] text-white">Agendado</option>
                <option value="perdido" className="bg-[#1A1A1A] text-white">Perdido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="last_message" className="bg-[#1A1A1A] text-white">Última Mensagem</option>
                <option value="created_at" className="bg-[#1A1A1A] text-white">Data de Criação</option>
                <option value="name" className="bg-[#1A1A1A] text-white">Nome do Contato</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Ordem</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="desc" className="bg-[#1A1A1A] text-white">Decrescente</option>
                <option value="asc" className="bg-[#1A1A1A] text-white">Crescente</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="bg-[#2D2D2D] rounded-lg border border-white/10 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" /> {/* Changed loader color */}
            <p className="mt-4 text-gray-400">Carregando conversas...</p> {/* Changed text color */}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" /> {/* Changed icon color */}
            <h3 className="text-lg font-semibold text-white mb-2"> {/* Changed text color */}
              Nenhuma conversa encontrada
            </h3>
            <p className="text-gray-400"> {/* Changed text color */}
              {search ? 'Tente ajustar sua busca' : 'As conversas aparecerão aqui quando iniciadas'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10"> {/* Changed divider color */}
            {filteredConversations.map((conv) => {
              const leadName = conv.lead_data?.nome || 'Lead sem nome'
              const leadCompany = conv.lead_data?.empresa
              const leadPhone = conv.lead_phone

              return (
                <Link
                  key={conv.id}
                  to={`/conversas/${conv.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors group" // Changed hover background
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"> {/* Changed gradient */}
                    {conv.lead_data?.nome ? getInitials(conv.lead_data.nome) : <Users className="w-6 h-6" />}
                  </div>

                  {/* Informações do lead */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white truncate"> {/* Changed text color */}
                        {leadName}
                      </h3>
                      {getStatusBadge(conv.lead_status)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400"> {/* Changed text color */}
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
                    <div className="flex items-center gap-2 text-sm text-gray-400"> {/* Changed text color */}
                      <MessageSquare className="w-4 h-4" />
                      <span>{conv.total_mensagens || 0}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-400 transition-colors" /> {/* Changed icon color */}
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