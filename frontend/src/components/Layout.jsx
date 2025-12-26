
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
  Cog
} from 'lucide-react'
import api from '../services/api'
import authService from '../services/auth'

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
    { name: 'Tenets', href: '/admin/agencias', icon: Building2 },
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-gray-900 truncate">{getHeaderTitle()}</h1>
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    <Shield className="w-3 h-3" />
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
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isGeneralView ? (
                      <Globe className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    ) : (
                      <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-700 truncate">
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
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
                      {/* Opção Visão Geral */}
                      <button
                        onClick={() => handleSelectAgency({ id: 'geral', nome: 'Visão Geral' })}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          isGeneralView ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                        }`}
                      >
                        <Globe className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">Visão Geral</span>
                        <span className="ml-auto text-xs text-gray-400">Todas</span>
                      </button>
                      
                      {/* Lista de Tenets Agrupados por Tipo */}
                      {Object.entries(tenetsByTipo).map(([tipo, tenetsDoTipo]) => (
                        tenetsDoTipo.length > 0 && (
                          <div key={tipo}>
                            {/* Cabeçalho do Grupo */}
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {tipoLabels[tipo]}
                              </span>
                            </div>
                            
                            {/* Itens do Grupo */}
                            {tenetsDoTipo.map((agency) => (
                              <button
                                key={agency.id}
                                onClick={() => handleSelectAgency(agency)}
                                className={`w-full flex items-center gap-2 px-3 py-2 pl-6 text-left hover:bg-gray-50 transition-colors ${
                                  agency.id === selectedAgencyId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Visão Geral</p>
                </div>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">Dashboard Geral</span>
                </NavLink>

                {user?.role === 'super_admin' && (
                  <>
                    <div className="px-3 py-2 mt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administração</p>
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
                                ? 'bg-purple-50 text-purple-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
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
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tenet: {agencyName}</p>
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
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{item.name}</span>
                    </NavLink>
                  )
                })}

                {user?.role === 'super_admin' && (
                  <>
                    <div className="px-3 py-2 mt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administração</p>
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
                                ? 'bg-purple-50 text-purple-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
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
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
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
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{item.name}</span>
                    </NavLink>
                  )
                })}
              </>
            )}
          </nav>

          {/* User Info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.nome || 'Usuário'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">TENET AI © 2024</p>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors lg:hidden"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
