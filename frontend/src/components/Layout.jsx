import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings,
  MessageSquare,
  Menu,
  X,
  Bot,
  ChevronRight,
  LogOut,
  Shield,
  Building2,
  Users,
  Link2,
  Bell,
  ChevronDown,
  BookOpen,
  FlaskConical,
  FileText,
  Globe,
  Cog,
  Sparkles
} from 'lucide-react'
import api from '../services/api'
import authService from '../services/auth'
import TokenIndicator from './TokenIndicator'
import UsageAlert from './UsageAlert'

export default function Layout({ agencyId, agencies, selectedAgencyId, onAgencyChange, isSuperAdmin }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [agencyName, setAgencyName] = useState('Carregando...')
  const [agencyNicho, setAgencyNicho] = useState('')
  const [user, setUser] = useState(null)
  const [showAgencyDropdown, setShowAgencyDropdown] = useState(false)
  const location = useLocation()

  const isGeneralView = selectedAgencyId === 'geral'

  useEffect(() => {
    const loadAgencyConfig = async () => {
      if (!agencyId || agencyId === 'geral') {
        setAgencyName('Visão Geral')
        setAgencyNicho('')
        return
      }
      try {
        const response = await api.get(`/agencias/${agencyId}/config`)
        setAgencyName(response.data.nome || 'Agência')
        setAgencyNicho(response.data.nicho || 'SDR')
      } catch (error) {
        console.error('Erro ao carregar configurações da agência:', error)
        setAgencyName('Agência')
      }
    }

    const loadUser = async () => {
      try {
        const response = await api.get('/auth/me')
        setUser(response.data)
      } catch (error) {
        console.error('Erro ao carregar usuário:', error)
      }
    }

    loadAgencyConfig()
    loadUser()
  }, [agencyId])

  const handleLogout = () => {
    localStorage.removeItem('selectedAgencyId')
    authService.logout()
  }

  const handleSelectAgency = (agency) => {
    onAgencyChange(agency.id)
    setAgencyName(agency.nome)
    setShowAgencyDropdown(false)
  }

  // Agrupar tenets por tipo
  const tenetsByTipo = {
    sdr: agencies.filter(t => t.tipo === 'sdr' || t.nicho === 'sdr'),
    suporte: agencies.filter(t => t.tipo === 'suporte' || t.nicho === 'suporte'),
    rh: agencies.filter(t => t.tipo === 'rh' || t.nicho === 'rh'),
    vendas: agencies.filter(t => t.tipo === 'vendas' || t.nicho === 'vendas'),
    custom: agencies.filter(t => t.tipo === 'custom' || t.nicho === 'custom')
  }

  const tipoLabels = {
    sdr: '🎯 SDR',
    suporte: '🛠️ Suporte',
    rh: '👥 RH',
    vendas: '💰 Vendas',
    custom: '⚙️ Custom'
  }

  // Menu para usuários de agência
  const agencyNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Conversas', href: '/conversas', icon: MessageSquare },
    { name: 'Base de Conhecimento', href: '/conhecimento', icon: BookOpen },
    { name: 'Integrações', href: '/integracoes', icon: Link2 },
    { name: 'Notificações', href: '/notificacoes', icon: Bell },
    { name: 'Configurações', href: '/config', icon: Settings },
  ]

  // Menu de administração para Super Admin
  const superAdminNavigation = [
    { name: 'Tenets', href: '/admin/tenets', icon: Building2 },
    { name: 'Usuários', href: '/admin/usuarios', icon: Users },
    { name: 'Templates', href: '/admin/templates', icon: FileText },
    { name: 'A/B Tests', href: '/admin/ab-tests', icon: FlaskConical },
  ]

  // Determina o título baseado no contexto
  const getHeaderTitle = () => {
    if (isSuperAdmin) {
      return 'TENET AI'
    }
    return `Tenet ${agencyNicho || 'AI'}`
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-[#0F0F0F] border-r border-white/10 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">
                  <span className="font-bold text-white">TENET</span>
                  <span className="font-bold text-cyan-400">AI</span>
                </h1>
                {user?.role === 'super_admin' && (
                  <span className="text-xs text-cyan-400 px-2 py-1 rounded-full font-medium bg-cyan-500/10">
                    Super Admin
                  </span>
                )}
              </div>
            </div>

            {/* Seletor de Tenet para Super Admin */}
            {isSuperAdmin && agencies.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowAgencyDropdown(!showAgencyDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isGeneralView ? (
                      <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    ) : (
                      <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-white truncate">
                      {isGeneralView ? 'Visão Geral' : agencyName}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAgencyDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showAgencyDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowAgencyDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1 bg-[#0F0F0F] border border-white/10 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
                      {/* Opção Visão Geral */}
                      <button
                        onClick={() => handleSelectAgency({ id: 'geral', nome: 'Visão Geral' })}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors border-b border-white/5 ${
                          isGeneralView ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-400'
                        }`}
                      >
                        <Globe className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">Visão Geral</span>
                        <span className="ml-auto text-xs text-gray-500">Todas</span>
                      </button>

                      {/* Lista de Tenets Agrupados por Tipo */}
                      {Object.entries(tenetsByTipo).map(([tipo, tenetsDoTipo]) => (
                        tenetsDoTipo.length > 0 && (
                          <div key={tipo}>
                            {/* Cabeçalho do Grupo */}
                            <div className="px-3 py-2 bg-white/5 border-b border-white/5">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {tipoLabels[tipo]}
                              </span>
                            </div>

                            {/* Itens do Grupo */}
                            {tenetsDoTipo.map((agency) => (
                              <button
                                key={agency.id}
                                onClick={() => handleSelectAgency(agency)}
                                className={`w-full flex items-center gap-2 px-3 py-2 pl-6 text-left hover:bg-white/5 transition-colors ${
                                  agency.id === selectedAgencyId ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400' : 'text-gray-400'
                                }`}
                              >
                                <Building2 className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{agency.nome}</span>
                                {agency.id === selectedAgencyId && (
                                  <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        )
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

            {/* Menu do Super Admin - Visão Geral */}
            {isSuperAdmin && isGeneralView && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visão Geral</p>
                </div>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive && location.pathname === '/'
                        ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">Dashboard Geral</span>
                </NavLink>

                {user?.role === 'super_admin' && (
                  <>
                    <div className="px-4 py-2 mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administração</p>
                    </div>
                    {superAdminNavigation.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`
                          }
                        >
                          <Icon className={`w-5 h-5 flex-shrink-0`} />
                          <span className="flex-1">{item.name}</span>
                        </NavLink>
                      )
                    })}
                  </>
                )}
              </>
            )}

            {/* Menu do Super Admin - Tenet Selecionado */}
            {isSuperAdmin && !isGeneralView && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenet: {agencyName}</p>
                </div>
                {agencyNavigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0`} />
                      <span className="flex-1">{item.name}</span>
                    </NavLink>
                  )
                })}

                {user?.role === 'super_admin' && (
                  <>
                    <div className="px-4 py-2 mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administração</p>
                    </div>
                    {superAdminNavigation.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`
                          }
                        >
                          <Icon className={`w-5 h-5 flex-shrink-0`} />
                          <span className="flex-1">{item.name}</span>
                        </NavLink>
                      )
                    })}
                  </>
                )}
              </>
            )}

            {/* Menu do Usuário Normal */}
            {!isSuperAdmin && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</p>
                </div>
                {agencyNavigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0`} />
                      <span className="flex-1">{item.name}</span>
                    </NavLink>
                  )
                })}
              </>
            )}
          </nav>

          {/* User Info */}
          <div className="mt-auto p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center font-semibold">
                {user?.nome?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.nome || 'Usuário'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>

          {!isGeneralView && (
            <div className="pt-4 border-t border-white/10">
              <TokenIndicator />
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-600 text-center">TENET AI © 2024</p>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white/5 border border-white/10 rounded-lg shadow-sm hover:bg-white/10 transition-colors lg:hidden"
      >
        {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <main className="flex-1 p-6 bg-[#1A1A1A] min-h-screen">
          <UsageAlert />
          <Outlet />
        </main>
      </div>
    </div>
  )
}