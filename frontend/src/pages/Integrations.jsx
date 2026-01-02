import React, { useState, useEffect } from 'react'
import {
  Smartphone,
  Calendar,
  FileSpreadsheet,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Settings,
  ExternalLink,
  QrCode,
  RefreshCw
} from 'lucide-react'
import api from '../services/api'

export default function Integrations({ agencyId }) {
  const [whatsappStatus, setWhatsappStatus] = useState({
    connected: false,
    loading: false,
    qrCode: null,
    phoneNumber: null
  })

  const [calendarStatus, setCalendarStatus] = useState({
    connected: false,
    loading: false,
    calendarId: null
  })

  const [sheetsStatus, setSheetsStatus] = useState({
    connected: false,
    loading: false,
    spreadsheetId: null
  })

  const [crmConfig, setCrmConfig] = useState({
    type: null,
    connected: false,
    loading: false
  })

  useEffect(() => {
    loadIntegrations()
  }, [agencyId])

  const loadIntegrations = async () => {
    try {
      // Carregar status do WhatsApp
      const whatsappRes = await api.get(`/agencias/${agencyId}/whatsapp/status`)
      setWhatsappStatus(prev => ({
        ...prev,
        connected: whatsappRes.data.connected,
        phoneNumber: whatsappRes.data.phoneNumber
      }))

      // Carregar status do Google Calendar
      const calendarRes = await api.get(`/agencias/${agencyId}/google-calendar/status`)
      setCalendarStatus(prev => ({
        ...prev,
        connected: calendarRes.data.connected,
        calendarId: calendarRes.data.calendarId
      }))

      // Carregar status do Google Sheets
      const sheetsRes = await api.get(`/agencias/${agencyId}/google-sheets/status`)
      setSheetsStatus(prev => ({
        ...prev,
        connected: sheetsRes.data.connected,
        spreadsheetId: sheetsRes.data.spreadsheetId
      }))

      // Carregar configuração de CRM
      const crmRes = await api.get(`/agencias/${agencyId}/integrations/crm`)
      setCrmConfig(prev => ({
        ...prev,
        type: crmRes.data.type,
        connected: crmRes.data.connected
      }))
    } catch (error) {
      console.error('Erro ao carregar integrações:', error)
    }
  }

  const connectWhatsApp = async () => {
    try {
      setWhatsappStatus(prev => ({ ...prev, loading: true }))
      const response = await api.post(`/agencias/${agencyId}/whatsapp/connect`)

      if (response.data.qrCode) {
        setWhatsappStatus(prev => ({
          ...prev,
          qrCode: response.data.qrCode,
          loading: false
        }))
      } else {
        setWhatsappStatus(prev => ({
          ...prev,
          connected: true,
          loading: false
        }))
      }
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error)
      setWhatsappStatus(prev => ({ ...prev, loading: false }))
      alert('Erro ao conectar WhatsApp')
    }
  }

  const disconnectWhatsApp = async () => {
    if (!confirm('Deseja realmente desconectar o WhatsApp?')) return

    try {
      setWhatsappStatus(prev => ({ ...prev, loading: true }))
      await api.post(`/agencias/${agencyId}/whatsapp/disconnect`)
      setWhatsappStatus({
        connected: false,
        loading: false,
        qrCode: null,
        phoneNumber: null
      })
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error)
      setWhatsappStatus(prev => ({ ...prev, loading: false }))
      alert('Erro ao desconectar WhatsApp')
    }
  }

  const connectGoogleCalendar = async () => {
    try {
      setCalendarStatus(prev => ({ ...prev, loading: true }))
      const response = await api.post(`/agencias/${agencyId}/google-calendar/connect`)

      if (response.data.authUrl) {
        window.open(response.data.authUrl, '_blank')
      }

      setCalendarStatus(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Erro ao conectar Google Calendar:', error)
      setCalendarStatus(prev => ({ ...prev, loading: false }))
      alert('Erro ao conectar Google Calendar')
    }
  }

  const disconnectGoogleCalendar = async () => {
    if (!confirm('Deseja realmente desconectar o Google Calendar?')) return

    try {
      setCalendarStatus(prev => ({ ...prev, loading: true }))
      await api.post(`/agencias/${agencyId}/google-calendar/disconnect`)
      setCalendarStatus({
        connected: false,
        loading: false,
        calendarId: null
      })
    } catch (error) {
      console.error('Erro ao desconectar Google Calendar:', error)
      setCalendarStatus(prev => ({ ...prev, loading: false }))
      alert('Erro ao desconectar Google Calendar')
    }
  }

  const connectGoogleSheets = async () => {
    try {
      setSheetsStatus(prev => ({ ...prev, loading: true }))
      const response = await api.post(`/agencias/${agencyId}/google-sheets/connect`)

      if (response.data.authUrl) {
        window.open(response.data.authUrl, '_blank')
      }

      setSheetsStatus(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Erro ao conectar Google Sheets:', error)
      setSheetsStatus(prev => ({ ...prev, loading: false }))
      alert('Erro ao conectar Google Sheets')
    }
  }

  const disconnectGoogleSheets = async () => {
    if (!confirm('Deseja realmente desconectar o Google Sheets?')) return

    try {
      setSheetsStatus(prev => ({ ...prev, loading: true }))
      await api.post(`/agencias/${agencyId}/google-sheets/disconnect`)
      setSheetsStatus({
        connected: false,
        loading: false,
        spreadsheetId: null
      })
    } catch (error) {
      console.error('Erro ao desconectar Google Sheets:', error)
      setSheetsStatus(prev => ({ ...prev, loading: false }))
      alert('Erro ao desconectar Google Sheets')
    }
  }

  const getStatusBadge = (connected, loading) => {
    if (loading) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Conectando...
        </span>
      )
    }

    if (connected) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
          <CheckCircle className="w-3 h-3" />
          Conectado
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
        <XCircle className="w-3 h-3" />
        Desconectado
      </span>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-[#1A1A1A] min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Integrações</h1>
        <p className="mt-1 text-sm text-gray-400">
          Conecte suas ferramentas e automatize seu fluxo de trabalho
        </p>
      </div>

      {/* WhatsApp Integration */}
      <div className="bg-[#2D2D2D] border border-white/10 rounded-lg shadow-sm hover:shadow-lg hover:border-cyan-500/30 transition-all">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">WhatsApp Business</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Conecte sua conta do WhatsApp para enviar e receber mensagens
                </p>
                {whatsappStatus.phoneNumber && (
                  <p className="mt-2 text-sm text-gray-400">
                    📱 {whatsappStatus.phoneNumber}
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge(whatsappStatus.connected, whatsappStatus.loading)}
          </div>

          {whatsappStatus.qrCode && (
            <div className="mt-6 p-4 bg-[#1A1A1A] border border-white/10 rounded-lg">
              <p className="text-sm text-gray-400 mb-4">
                Escaneie o QR Code com seu WhatsApp:
              </p>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={whatsappStatus.qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {whatsappStatus.connected ? (
              <>
                <button
                  onClick={disconnectWhatsApp}
                  disabled={whatsappStatus.loading}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Desconectar
                </button>
                <button
                  onClick={loadIntegrations}
                  className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Atualizar Status
                </button>
              </>
            ) : (
              <button
                onClick={connectWhatsApp}
                disabled={whatsappStatus.loading}
                className="px-4 py-2 bg-cyan-500 text-black rounded-lg text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {whatsappStatus.loading ? 'Conectando...' : 'Conectar WhatsApp'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Google Calendar Integration */}
      <div className="bg-[#2D2D2D] border border-white/10 rounded-lg shadow-sm hover:shadow-lg hover:border-cyan-500/30 transition-all">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Google Calendar</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Agende reuniões automaticamente com seus leads qualificados
                </p>
                {calendarStatus.calendarId && (
                  <p className="mt-2 text-sm text-gray-400">
                    📅 {calendarStatus.calendarId}
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge(calendarStatus.connected, calendarStatus.loading)}
          </div>

          <div className="mt-6 flex gap-3">
            {calendarStatus.connected ? (
              <>
                <button
                  onClick={disconnectGoogleCalendar}
                  disabled={calendarStatus.loading}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Desconectar
                </button>
                <button
                  onClick={loadIntegrations}
                  className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  <Settings className="w-4 h-4 inline mr-2" />
                  Configurar
                </button>
              </>
            ) : (
              <button
                onClick={connectGoogleCalendar}
                disabled={calendarStatus.loading}
                className="px-4 py-2 bg-cyan-500 text-black rounded-lg text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {calendarStatus.loading ? 'Conectando...' : 'Conectar Google Calendar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Google Sheets Integration */}
      <div className="bg-[#2D2D2D] border border-white/10 rounded-lg shadow-sm hover:shadow-lg hover:border-cyan-500/30 transition-all">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Google Sheets</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Exporte automaticamente seus leads para uma planilha do Google
                </p>
                {sheetsStatus.spreadsheetId && (
                  <p className="mt-2 text-sm text-gray-400">
                    📊 {sheetsStatus.spreadsheetId}
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge(sheetsStatus.connected, sheetsStatus.loading)}
          </div>

          <div className="mt-6 flex gap-3">
            {sheetsStatus.connected ? (
              <>
                <button
                  onClick={disconnectGoogleSheets}
                  disabled={sheetsStatus.loading}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Desconectar
                </button>
                <button
                  onClick={loadIntegrations}
                  className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 inline mr-2" />
                  Abrir Planilha
                </button>
              </>
            ) : (
              <button
                onClick={connectGoogleSheets}
                disabled={sheetsStatus.loading}
                className="px-4 py-2 bg-cyan-500 text-black rounded-lg text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sheetsStatus.loading ? 'Conectando...' : 'Conectar Google Sheets'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CRM Integration */}
      <div className="bg-[#2D2D2D] border border-white/10 rounded-lg shadow-sm hover:shadow-lg hover:border-cyan-500/30 transition-all">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">CRM</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Integre com seu CRM favorito (HubSpot, Pipedrive, RD Station)
                </p>
                {crmConfig.type && (
                  <p className="mt-2 text-sm text-gray-400">
                    🔗 {crmConfig.type}
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge(crmConfig.connected, crmConfig.loading)}
          </div>

          <div className="mt-6">
            <div className="bg-blue-500/20 text-blue-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Em breve</p>
                  <p className="text-sm mt-1 opacity-90">
                    A integração com CRMs estará disponível em breve
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}