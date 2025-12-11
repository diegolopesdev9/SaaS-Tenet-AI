import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Settings, MessageSquare, Menu, X, Bot, ChevronRight, LogOut, Shield, Building2, Users, Link2 } from 'lucide-react'
import api from '../services/api'
import authService from '../services/auth'

export default function Layout({ agencyId }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [agencyName, setAgencyName] = useState('Carregando...')
  const [user, setUser] = useState(null)
  const location = useLocation()

  useEffect(() => {
    const loadAgencyConfig = async () => {
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

    if (agencyId) {
      loadAgencyConfig()
    }
    loadUser()
  }, [agencyId])

  const handleLogout = () => {
    authService.logout()
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Conversas', href: '/conversas', icon: MessageSquare },
    { name: 'Integrações', href: '/integracoes', icon: Link2 },
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
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold text-gray-900 truncate">SDR Agent</h1>
                <p className="text-xs text-gray-500 truncate">{agencyName}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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

            {user?.role === 'super_admin' && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                  <Shield className="w-4 h-4" />
                  Super Admin
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

          <div className="px-3 py-4 border-t border-gray-200">
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