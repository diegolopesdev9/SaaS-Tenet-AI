import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, MessageSquare, TrendingUp, CheckCircle, Clock, XCircle, Calendar, AlertCircle, BarChart3, Filter, Building2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import TokenUsage from '../components/TokenUsage'

export default function Dashboard({ agencyId }) {
  const [metrics, setMetrics] = useState(null)
  const [advancedMetrics, setAdvancedMetrics] = useState(null)
  const [recentLeads, setRecentLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d')

  const isGeneralView = agencyId === 'geral'

  useEffect(() => {
    loadData()
  }, [agencyId, period])

  const loadData = async () => {
    try {
      setLoading(true)

      if (isGeneralView) {
        // Carregar métricas gerais (todas as agências)
        const response = await api.get(`/admin/metrics/geral?period=${period}`)
        setAdvancedMetrics(response.data)
        setMetrics(null)
        setRecentLeads([])
      } else {
        // Carregar métricas de uma agência específica
        const [metricsRes, advancedRes, leadsRes] = await Promise.all([
          api.get(`/agencias/${agencyId}/metrics`),
          api.get(`/agencias/${agencyId}/metrics/advanced?period=${period}`),
          api.get(`/agencias/${agencyId}/conversas`, { params: { limit: 5 } })
        ])

        setMetrics(metricsRes.data)
        setAdvancedMetrics(advancedRes.data)
        setRecentLeads(leadsRes.data || [])
      }

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = {
    iniciada: { label: 'Iniciada', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: Clock },
    em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: MessageSquare },
    qualificado: { label: 'Qualificado', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
    perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
    agendado: { label: 'Agendado', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Calendar }
  }

  const funnelColors = ['#3B82F6', '#60A5FA', '#34D399', '#A78BFA']

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
      {/* Uso de Tokens - Oculto na visão geral do Super Admin */}
      {!isGeneralView && (
        <div className="mb-6">
          <TokenUsage />
        </div>
      )}

      {/* Header com Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {isGeneralView ? 'Dashboard Geral' : 'Dashboard'}
            </h1>
            {isGeneralView && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                Todas as Agências
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {isGeneralView 
              ? `Visão consolidada de ${advancedMetrics?.total_agencias || 0} Tenets`
              : 'Visão geral das suas conversas e métricas'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="15d">Últimos 15 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Período:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="15d">Últimos 15 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Cards de Métricas - Visão Geral */}
      {isGeneralView && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Tenets</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{advancedMetrics?.total_agencias || 0}</p>
                <p className="text-xs text-gray-500 mt-1">cadastrados</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{advancedMetrics?.total_usuarios || 0}</p>
                <p className="text-xs text-gray-500 mt-1">ativos</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Leads</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{advancedMetrics?.total_leads || 0}</p>
                <p className="text-xs text-gray-500 mt-1">no período</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{advancedMetrics?.taxa_conversao || 0}%</p>
                <p className="text-xs text-gray-500 mt-1">média geral</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Métricas - Agência Específica */}
      {!isGeneralView && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Leads</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{advancedMetrics?.total_leads || 0}</p>
                <p className="text-xs text-gray-500 mt-1">no período</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{advancedMetrics?.conversion_rate || 0}%</p>
                <p className="text-xs text-gray-500 mt-1">leads qualificados</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
                <p className="mt-2 text-3xl font-bold text-purple-600">{advancedMetrics?.avg_conversation_hours || 0}h</p>
                <p className="text-xs text-gray-500 mt-1">por conversa</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Qualificados</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{advancedMetrics?.status_breakdown?.qualificado || 0}</p>
                <p className="text-xs text-gray-500 mt-1">prontos para vendas</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha - Leads por Dia */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Leads por Dia</h2>
          </div>
          {advancedMetrics?.chart_data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={advancedMetrics.chart_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} name="Total" />
                <Line type="monotone" dataKey="qualificado" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} name="Qualificados" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <p>Sem dados no período selecionado</p>
            </div>
          )}
        </div>

        {/* Gráfico de Funil */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Funil de Conversão</h2>
          </div>
          {advancedMetrics?.funnel_data ? (
            <div className="space-y-3">
              {advancedMetrics.funnel_data.map((item, index) => (
                <div key={item.stage} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.stage}</span>
                    <span className="text-sm font-bold text-gray-900">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                      style={{ 
                        width: `${Math.max(item.percentage, 5)}%`,
                        backgroundColor: funnelColors[index]
                      }}
                    >
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <p>Sem dados no período selecionado</p>
            </div>
          )}
        </div>
      </div>

      {/* Ranking de Tenets (apenas na Visão Geral) */}
      {isGeneralView && advancedMetrics?.agency_breakdown?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Desempenho por Tenet</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Tenet</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Total Leads</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Qualificados</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Taxa</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {advancedMetrics.agency_breakdown.map((agency, index) => (
                  <tr key={agency.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{agency.nome}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        <Users className="w-3.5 h-3.5" />
                        {agency.total}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {agency.qualificado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold ${agency.taxa >= 30 ? 'text-green-600' : agency.taxa >= 15 ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {agency.taxa}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-full rounded-full ${agency.taxa >= 30 ? 'bg-green-500' : agency.taxa >= 15 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                          style={{ width: `${Math.min(agency.taxa, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads por Status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.keys(statusConfig).map((status) => {
            const config = statusConfig[status]
            const Icon = config.icon
            const count = advancedMetrics?.status_breakdown?.[status] || 0
            return (
              <div key={status} className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${config.color}`}>
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

      {/* Leads Recentes (apenas para agência específica) */}
      {!isGeneralView && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Leads Recentes</h2>
              <Link to="/conversas" className="text-sm font-medium text-blue-600 hover:text-blue-700">
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
      )}
    </div>
  )
}