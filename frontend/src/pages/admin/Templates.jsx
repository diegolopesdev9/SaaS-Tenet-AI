
import React, { useState, useEffect } from 'react'
import { FileText, Plus, Edit, Copy, ChevronDown, ChevronUp, Search, Lock } from 'lucide-react'
import api from '../../services/api'
import authService from '../../services/auth'

export default function Templates({ agencyId }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNicho, setSelectedNicho] = useState('')
  const [expandedTemplate, setExpandedTemplate] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [agencyNicho, setAgencyNicho] = useState(null)
  
  const user = authService.getUser()
  const isSuperAdmin = user?.role === 'super_admin'

  useEffect(() => {
    loadAgencyConfig()
  }, [agencyId])

  useEffect(() => {
    loadTemplates()
  }, [selectedNicho, agencyNicho])

  const loadAgencyConfig = async () => {
    if (isSuperAdmin) {
      setAgencyNicho(null) // Super admin vê todos
      return
    }
    
    try {
      const response = await api.get(`/agencias/${agencyId}/config`)
      setAgencyNicho(response.data.nicho || 'sdr')
      setSelectedNicho(response.data.nicho || 'sdr')
    } catch (error) {
      console.error('Erro ao carregar config da agência:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Se não é super admin, força filtro pelo nicho da agência
      const nichoFilter = isSuperAdmin ? selectedNicho : agencyNicho
      const url = nichoFilter ? `/templates?nicho=${nichoFilter}` : '/templates'
      
      const response = await api.get(url)
      const templatesData = response.data?.templates || response.data || []
      setTemplates(Array.isArray(templatesData) ? templatesData : [])
      
    } catch (err) {
      console.error('Erro ao carregar templates:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(t => 
    t.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getNichoColor = (nicho) => {
    const colors = {
      sdr: 'bg-blue-100 text-blue-800',
      suporte: 'bg-green-100 text-green-800',
      rh: 'bg-purple-100 text-purple-800',
      vendas: 'bg-orange-100 text-orange-800',
      custom: 'bg-gray-100 text-gray-800'
    }
    return colors[nicho?.toLowerCase()] || colors.custom
  }

  const getNichoColorDark = (nicho) => {
    const colors = {
      sdr: 'bg-cyan-500/20 text-cyan-400',
      suporte: 'bg-green-500/20 text-green-400',
      rh: 'bg-purple-500/20 text-purple-400',
      vendas: 'bg-yellow-500/20 text-yellow-400',
      custom: 'bg-gray-500/20 text-gray-400'
    }
    return colors[nicho?.toLowerCase()] || colors.custom
  }

  const getNichoIcon = (nicho) => {
    const icons = {
      sdr: '🎯',
      suporte: '🛠️',
      rh: '👥',
      vendas: '💰',
      custom: '⚙️'
    }
    return icons[nicho?.toLowerCase()] || '📄'
  }

  const getNichoName = (nicho) => {
    const names = {
      sdr: 'Tenet SDR',
      suporte: 'Tenet Suporte',
      rh: 'Tenet RH',
      vendas: 'Tenet Vendas',
      custom: 'Tenet Custom'
    }
    return names[nicho?.toLowerCase()] || 'Tenet'
  }

  const nichosList = [
    { id: 'sdr', nome: 'SDR', desc: 'Qualificação de leads' },
    { id: 'suporte', nome: 'Suporte', desc: 'Atendimento técnico' },
    { id: 'rh', nome: 'RH', desc: 'Recursos humanos' },
    { id: 'vendas', nome: 'Vendas', desc: 'Atendimento comercial' },
    { id: 'custom', nome: 'Custom', desc: 'Personalizado' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isSuperAdmin ? 'Templates de Prompts' : `Templates - ${getNichoName(agencyNicho)}`}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isSuperAdmin 
              ? 'Gerencie os templates de prompts de todos os nichos'
              : 'Templates disponíveis para o seu agente'
            }
          </p>
        </div>
        {isSuperAdmin && (
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-600 transition-colors font-semibold">
            <Plus className="w-4 h-4" />
            Novo Template
          </button>
        )}
      </div>

      {/* Aviso para usuário comum */}
      {!isSuperAdmin && (
        <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex gap-3">
            <Lock className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-white">Templates do {getNichoName(agencyNicho)}</h3>
              <p className="text-sm text-cyan-300 mt-1">
                Você tem acesso aos templates do nicho do seu Tenet. 
                Para acessar outros nichos, entre em contato com o administrador.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
        {isSuperAdmin && (
          <select
            value={selectedNicho}
            onChange={(e) => setSelectedNicho(e.target.value)}
            className="px-4 py-2 bg-[#1A1A1A] border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="" className="bg-[#1A1A1A] text-white">Todos os nichos</option>
            <option value="sdr" className="bg-[#1A1A1A] text-white">SDR - Qualificação</option>
            <option value="suporte" className="bg-[#1A1A1A] text-white">Suporte Técnico</option>
            <option value="rh" className="bg-[#1A1A1A] text-white">Recursos Humanos</option>
            <option value="vendas" className="bg-[#1A1A1A] text-white">Vendas</option>
            <option value="custom" className="bg-[#1A1A1A] text-white">Personalizado</option>
          </select>
        )}
      </div>

      {/* Cards de Nichos - Somente Super Admin */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {nichosList.map((nicho) => (
            <div
              key={nicho.id}
              onClick={() => setSelectedNicho(nicho.id === selectedNicho ? '' : nicho.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedNicho === nicho.id
                  ? 'border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/10'
                  : 'border-white/10 bg-[#2D2D2D] hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/10'
              }`}
            >
              <div className="text-2xl mb-2">{getNichoIcon(nicho.id)}</div>
              <p className="font-semibold text-white">{nicho.nome}</p>
              <p className="text-xs text-gray-500">{nicho.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de Templates */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-[#2D2D2D] rounded-lg border border-white/10">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum template encontrado</p>
            <p className="text-sm text-gray-500 mt-1">
              {isSuperAdmin 
                ? 'Tente outro nicho ou crie um novo template'
                : 'Entre em contato com o administrador para adicionar templates'
              }
            </p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-[#2D2D2D] rounded-lg border border-white/10 overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1A1A1A]"
                onClick={() => setExpandedTemplate(
                  expandedTemplate === template.id ? null : template.id
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#1A1A1A] rounded-lg flex items-center justify-center text-xl">
                    {getNichoIcon(template.nicho)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{template.nome}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getNichoColorDark(template.nicho)}`}>
                        {template.nicho}
                      </span>
                      {template.is_default && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{template.descricao}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); }}
                        className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                        title="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); }}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {expandedTemplate === template.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              
              {expandedTemplate === template.id && (
                <div className="px-4 pb-4 border-t border-white/10">
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Prompt do Sistema
                      </label>
                      <pre className="p-3 bg-[#1A1A1A] rounded-lg text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-48">
                        {template.prompt_sistema || 'Sem prompt definido'}
                      </pre>
                    </div>
                    {template.variaveis && template.variaveis.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Variáveis disponíveis
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {template.variaveis.map((v, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full font-mono"
                            >
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
