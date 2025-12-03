
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, MessageSquare, TrendingUp, CheckCircle, Clock, XCircle, Calendar, AlertCircle } from 'lucide-react'
import api from '../services/api'

export default function Dashboard({ agencyId }) {
  const [metrics, setMetrics] = useState(null)
  const [recentLeads, setRecentLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [agencyId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar métricas
      const metricsResponse = await api.get(`/agencias/${agencyId}/metrics`)
      setMetrics(metricsResponse.data)

      // Carregar leads recentes
      const leadsResponse = await api.get(`/agencias/${agencyId}/conversas`, {
        params: { limit: 5 }
      })
      setRecentLeads(leadsResponse.data || [])

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // Configuração de cores por status
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

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.em_andamento
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visão geral das suas conversas e métricas
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Leads */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Leads</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {metrics?.total_leads || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total de Mensagens */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mensagens</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {metrics?.total_mensagens || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Taxa de Qualificação */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa Qualificação</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {metrics?.taxa_qualificacao || 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Leads Qualificados */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Qualificados</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {(metrics?.por_status?.qualificado || 0) + (metrics?.por_status?.agendado || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Leads por Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads por Status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.keys(statusConfig).map((status) => {
            const config = statusConfig[status]
            const Icon = config.icon
            const count = metrics?.por_status?.[status] || 0

            return (
              <div
                key={status}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${config.color}`}
              >
                <Icon className="w-5 h-5" />
                <div>
                  <p className="text-xs font-medium">{config.label}</p>
                  <p className="text-lg font-bold">{count}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leads Recentes */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Leads Recentes</h2>
            <Link
              to="/conversas"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Ver todos
            </Link>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {recentLeads.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            recentLeads.map((lead) => (
              <Link
                key={lead.id}
                to={`/conversas/${lead.id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {lead.lead_data?.nome || lead.lead_phone}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {lead.lead_phone} • {lead.total_mensagens} mensagens
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {getStatusBadge(lead.lead_status)}
                  <div className="text-xs text-gray-500">
                    {lead.last_message_at && new Date(lead.last_message_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
