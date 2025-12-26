
import React, { useState, useEffect } from 'react'
import { 
  Link2, CheckCircle, XCircle, Loader2, Settings, Trash2, 
  ToggleLeft, ToggleRight, TestTube, Plus, AlertCircle, User, Calendar, BarChart3
} from 'lucide-react'
import api from '../services/api'

const CRM_OPTIONS = [
  { id: 'rdstation', name: 'RD Station', color: 'bg-blue-500', description: 'Marketing e automação' },
  { id: 'pipedrive', name: 'Pipedrive', color: 'bg-green-500', description: 'CRM de vendas' },
  { id: 'notion', name: 'Notion', color: 'bg-gray-800', description: 'Database e documentos' },
  { id: 'moskit', name: 'Moskit', color: 'bg-purple-500', description: 'CRM brasileiro' },
  { id: 'zoho', name: 'Zoho CRM', color: 'bg-red-500', description: 'CRM completo' }
]

export default function Integrations({ agencyId }) {
  const [integrations, setIntegrations] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCRM, setSelectedCRM] = useState(null)
  const [formData, setFormData] = useState({
    api_key: '',
    api_token: '',
    database_id: '',
    pipeline_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(null)
  const [message, setMessage] = useState(null)
  const [adminConfig, setAdminConfig] = useState({
    admin_name: '',
    admin_whatsapp_number: ''
  })
  const [reportsConfig, setReportsConfig] = useState({
    daily_report_enabled: true,
    daily_report_time: '08:00',
    weekly_report_enabled: true,
    weekly_report_day: 1,
    weekly_report_time: '09:00'
  })
  const [calendarStatus, setCalendarStatus] = useState({ connected: false })

  useEffect(() => {
    loadIntegrations()
    loadLogs()
    loadAdminConfig()
    loadCalendarStatus()
  }, [agencyId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const calendarStatusParam = params.get('calendar')
    
    if (calendarStatusParam === 'connected') {
      setMessage({ type: 'success', text: 'Google Calendar conectado com sucesso!' })
      loadCalendarStatus()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (calendarStatusParam === 'error') {
      setMessage({ type: 'error', text: 'Erro ao conectar Google Calendar: ' + params.get('message') })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const loadIntegrations = async () => {
    try {
      const response = await api.get(`/integrations/${agencyId}`)
      setIntegrations(response.data)
    } catch (error) {
      console.error('Erro ao carregar integrações:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    try {
      const response = await api.get(`/integrations/${agencyId}/logs?limit=20`)
      setLogs(response.data)
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    }
  }

  const loadAdminConfig = async () => {
    try {
      const response = await api.get('/admin-config/')
      setAdminConfig({
        admin_name: response.data.admin_name || '',
        admin_whatsapp_number: response.data.admin_whatsapp_number || ''
      })
      if (response.data.reports) {
        setReportsConfig(response.data.reports)
      }
    } catch (error) {
      console.error('Erro ao carregar config admin:', error)
    }
  }

  const loadCalendarStatus = async () => {
    try {
      const response = await api.get('/calendar/status')
      setCalendarStatus(response.data)
    } catch (error) {
      console.error('Erro ao carregar status calendar:', error)
    }
  }

  const handleSaveAdminConfig = async () => {
    setLoading(true)
    try {
      await api.post('/admin-config/', adminConfig)
      setMessage({ type: 'success', text: 'Configuração do admin salva!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configuração' })
    }
    setLoading(false)
  }

  const handleSaveReportsConfig = async () => {
    setLoading(true)
    try {
      await api.post('/admin-config/reports', reportsConfig)
      setMessage({ type: 'success', text: 'Configuração de relatórios salva!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configuração' })
    }
    setLoading(false)
  }

  const handleTestReport = async () => {
    setLoading(true)
    try {
      await api.post('/admin-config/test-report')
      setMessage({ type: 'success', text: 'Relatório de teste enviado!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao enviar relatório' })
    }
    setLoading(false)
  }

  const handleConnectCalendar = async () => {
    try {
      const response = await api.get('/calendar/auth/url')
      window.location.href = response.data.auth_url
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar Google Calendar' })
    }
  }

  const handleDisconnectCalendar = async () => {
    if (!confirm('Deseja desconectar o Google Calendar?')) return
    
    try {
      await api.post('/calendar/disconnect')
      setCalendarStatus({ connected: false })
      setMessage({ type: 'success', text: 'Google Calendar desconectado' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao desconectar' })
    }
  }

  const handleOpenModal = (crm) => {
    setSelectedCRM(crm)
    const existing = integrations.find(i => i.crm_type === crm.id)
    setFormData({
      api_key: '',
      api_token: '',
      database_id: existing?.database_id || '',
      pipeline_id: existing?.pipeline_id || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!selectedCRM) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      await api.post(`/integrations/${agencyId}`, {
        crm_type: selectedCRM.id,
        api_key: formData.api_key || null,
        api_token: formData.api_token || null,
        database_id: formData.database_id || null,
        pipeline_id: formData.pipeline_id || null,
        is_active: true
      })
      
      setMessage({ type: 'success', text: `${selectedCRM.name} configurado com sucesso!` })
      setShowModal(false)
      loadIntegrations()
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao salvar' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (crmType) => {
    setTesting(crmType)
    try {
      const response = await api.post(`/integrations/${agencyId}/test/${crmType}`)
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Conexão estabelecida com sucesso!' })
      } else {
        setMessage({ type: 'error', text: 'Falha na conexão. Verifique as credenciais.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao testar conexão' })
    } finally {
      setTesting(null)
    }
  }

  const handleToggle = async (crmType) => {
    try {
      const response = await api.patch(`/integrations/${agencyId}/${crmType}/toggle`)
      loadIntegrations()
      setMessage({ 
        type: 'success', 
        text: `Integração ${response.data.is_active ? 'ativada' : 'desativada'}` 
      })
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao alternar status' })
    }
  }

  const handleDelete = async (crmType) => {
    if (!confirm('Tem certeza que deseja remover esta integração?')) return
    
    try {
      await api.delete(`/integrations/${agencyId}/${crmType}`)
      loadIntegrations()
      setMessage({ type: 'success', text: 'Integração removida' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao remover integração' })
    }
  }

  const getIntegrationStatus = (crmId) => {
    return integrations.find(i => i.crm_type === crmId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrações CRM</h1>
        <p className="mt-2 text-gray-600">
          Conecte seus CRMs para enviar leads qualificados automaticamente
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">×</button>
        </div>
      )}

      {/* Seção Admin WhatsApp */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <User className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Admin do Tenet</h3>
            <p className="text-sm text-gray-500">Configure o administrador que receberá relatórios e poderá enviar comandos</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Admin
            </label>
            <input
              type="text"
              value={adminConfig.admin_name}
              onChange={(e) => setAdminConfig({...adminConfig, admin_name: e.target.value})}
              placeholder="Ex: João Silva"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp do Admin
            </label>
            <input
              type="text"
              value={adminConfig.admin_whatsapp_number}
              onChange={(e) => setAdminConfig({...adminConfig, admin_whatsapp_number: e.target.value})}
              placeholder="Ex: 5511999999999"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Formato: DDI + DDD + Número (ex: 5511999999999)</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">📱 Comandos disponíveis para o Admin:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-700">
            <span>• relatorio</span>
            <span>• leads</span>
            <span>• leads semana</span>
            <span>• qualificados</span>
            <span>• metricas</span>
            <span>• status</span>
            <span>• pausar</span>
            <span>• ajuda</span>
          </div>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSaveAdminConfig}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Admin'}
          </button>
          
          <button
            onClick={handleTestReport}
            disabled={loading || !adminConfig.admin_whatsapp_number}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            📊 Enviar Relatório Teste
          </button>
        </div>
      </div>

      {/* Seção Relatórios Automáticos */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Relatórios Automáticos</h3>
            <p className="text-sm text-gray-500">Configure o envio automático de relatórios para o admin</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Relatório Diário */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={reportsConfig.daily_report_enabled}
                onChange={(e) => setReportsConfig({...reportsConfig, daily_report_enabled: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-medium">Relatório Diário</span>
                <p className="text-sm text-gray-500">Enviado todos os dias</p>
              </div>
            </div>
            <input
              type="time"
              value={reportsConfig.daily_report_time}
              onChange={(e) => setReportsConfig({...reportsConfig, daily_report_time: e.target.value})}
              className="px-3 py-1 border border-gray-300 rounded-lg"
            />
          </div>
          
          {/* Relatório Semanal */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={reportsConfig.weekly_report_enabled}
                onChange={(e) => setReportsConfig({...reportsConfig, weekly_report_enabled: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-medium">Relatório Semanal</span>
                <p className="text-sm text-gray-500">Enviado uma vez por semana</p>
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={reportsConfig.weekly_report_day}
                onChange={(e) => setReportsConfig({...reportsConfig, weekly_report_day: parseInt(e.target.value)})}
                className="px-3 py-1 border border-gray-300 rounded-lg"
              >
                <option value={0}>Domingo</option>
                <option value={1}>Segunda</option>
                <option value={2}>Terça</option>
                <option value={3}>Quarta</option>
                <option value={4}>Quinta</option>
                <option value={5}>Sexta</option>
                <option value={6}>Sábado</option>
              </select>
              <input
                type="time"
                value={reportsConfig.weekly_report_time}
                onChange={(e) => setReportsConfig({...reportsConfig, weekly_report_time: e.target.value})}
                className="px-3 py-1 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSaveReportsConfig}
          disabled={loading}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Salvar Configuração de Relatórios
        </button>
      </div>

      {/* Seção Google Calendar */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <Calendar className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Google Calendar</h3>
            <p className="text-sm text-gray-500">Conecte sua agenda para agendamento automático de reuniões</p>
          </div>
        </div>
        
        {calendarStatus.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-green-700">Conectado</span>
              <span className="text-green-600 font-medium">{calendarStatus.email}</span>
            </div>
            
            <button
              onClick={handleDisconnectCalendar}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              Desconectar Google Calendar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-lg">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span className="text-yellow-700">Não conectado</span>
            </div>
            
            <button
              onClick={handleConnectCalendar}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <img src="https://www.gstatic.com/images/branding/product/2x/calendar_48dp.png" alt="Google Calendar" className="w-5 h-5" />
              Conectar Google Calendar
            </button>
          </div>
        )}
      </div>

      {/* Grid de CRMs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {CRM_OPTIONS.map((crm) => {
          const status = getIntegrationStatus(crm.id)
          
          return (
            <div 
              key={crm.id}
              className={`bg-white rounded-lg border-2 p-6 transition-all ${
                status?.is_active ? 'border-green-500' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${crm.color} rounded-lg flex items-center justify-center`}>
                    <Link2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{crm.name}</h3>
                    <p className="text-sm text-gray-500">{crm.description}</p>
                  </div>
                </div>
                {status?.is_active && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    Ativo
                  </span>
                )}
              </div>

              {status ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {status.has_api_key || status.has_api_token ? (
                      <><CheckCircle className="w-4 h-4 text-green-500" /> Credenciais configuradas</>
                    ) : (
                      <><XCircle className="w-4 h-4 text-red-500" /> Credenciais pendentes</>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleOpenModal(crm)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                    >
                      <Settings className="w-4 h-4 inline mr-1" />
                      Configurar
                    </button>
                    <button
                      onClick={() => handleTest(crm.id)}
                      disabled={testing === crm.id}
                      className="px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 disabled:opacity-50"
                    >
                      {testing === crm.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggle(crm.id)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        status.is_active 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(crm.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleOpenModal(crm)}
                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Conectar
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Logs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Sincronização</h2>
        
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma sincronização realizada ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">CRM</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Telefone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 capitalize">{log.crm_type}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.lead_phone}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        log.status === 'success' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status === 'success' ? 'Sucesso' : 'Erro'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Configuração */}
      {showModal && selectedCRM && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configurar {selectedCRM.name}
            </h3>
            
            <div className="space-y-4">
              {/* API Key */}
              {['rdstation', 'pipedrive', 'notion', 'moskit'].includes(selectedCRM.id) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key / Token
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Cole sua API Key aqui"
                  />
                </div>
              )}
              
              {/* API Token para Zoho */}
              {selectedCRM.id === 'zoho' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OAuth Token
                  </label>
                  <input
                    type="password"
                    value={formData.api_token}
                    onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Cole seu OAuth Token"
                  />
                </div>
              )}
              
              {/* Database ID para Notion */}
              {selectedCRM.id === 'notion' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Database ID
                  </label>
                  <input
                    type="text"
                    value={formData.database_id}
                    onChange={(e) => setFormData({ ...formData, database_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ID do database do Notion"
                  />
                </div>
              )}
              
              {/* Pipeline ID para Pipedrive/Moskit */}
              {['pipedrive', 'moskit'].includes(selectedCRM.id) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pipeline ID (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.pipeline_id}
                    onChange={(e) => setFormData({ ...formData, pipeline_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ID do pipeline"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
