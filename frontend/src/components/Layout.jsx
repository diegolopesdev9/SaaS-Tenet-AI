
import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Settings, MessageSquare, Menu, X, Bot, ChevronRight, LogOut, Shield, Building2, Users, Link2, Bell, ChevronDown } from 'lucide-react'
import api from '../services/api'
import authService from '../services/auth'

export default function Layout({ agencyId, agencies, selectedAgencyId, onAgencyChange, isSuperAdmin }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [agencyName, setAgencyName] = useState('Carregando...')
  const [user, setUser] = useState(null)
  const [showAgencyDropdown, setShowAgencyDropdown] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const loadAgencyConfig = async () => {
      if (!agencyId) return
      try {
        const response = await api.get(`/agencias/${agencyId}/config`)
        setAgencyName(response.data.nome || 'Agência')
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

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Conversas', href: '/conversas', icon: MessageSquare },
    { name: 'Integrações', href: '/integracoes', icon: Link2 },
    { name: 'Notificações', href: '/notificacoes', icon: Bell },
    { name: 'Configurações', href: '/config', icon: Settings },
  ]

  const superAdminNavigation = [
    { name: 'Agências', href: '/admin/agencias', icon: Building2 },
    { name: 'Usuários', href: '/admin/usuarios', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header com Seletor de Agência para Super Admin */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold text-gray-900 truncate">
                  {isSuperAdmin ? 'TENET AI' : (agencyName ? `Tenet ${agencyName}` : 'TENET AI')}
                </h1>
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    <Shield className="w-3 h-3" />
                    Super Admin
                  </span>
                )}
              </div>
            </div>

            {/* Seletor de Agência para Super Admin */}
            {isSuperAdmin && agencies.length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => setShowAgencyDropdown(!showAgencyDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 truncate">{agencyName}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAgencyDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showAgencyDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowAgencyDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                      {/* Opção Geral - Todas as Agências */}
                      <button
                        onClick={() => handleSelectAgency({ id: 'geral', nome: 'Visão Geral' })}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          selectedAgencyId === 'geral' ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">Visão Geral</span>
                        <span className="ml-auto text-xs text-gray-400">Todas</span>
                        {selectedAgencyId === 'geral' && (
                          <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        )}
                      </button>
                      
                      {/* Lista de Agências */}
                      {agencies.map((agency) => (
                        <button
                          key={agency.id}
                          onClick={() => handleSelectAgency(agency)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
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
                  </>
                )}
              </div>
            ) : (
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 truncate">{agencyName}</span>
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {/* Navegação da Agência Selecionada */}
            <div className="mb-2">
              <span className="px-3 text-xs font-semibold text-gray-400 uppercase">
                Agência
              </span>
            </div>
            
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                </NavLink>
              )
            })}

            {/* Menu Super Admin */}
            {user?.role === 'super_admin' && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="mb-2">
                  <span className="px-3 text-xs font-semibold text-gray-400 uppercase">
                    Administração
                  </span>
                </div>
                {superAdminNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </nav>

          {/* Rodapé com Usuário e Logout */}
          <div className="px-3 py-4 border-t border-gray-200">
            {user && (
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-medium text-gray-900 truncate">{user.nome}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
