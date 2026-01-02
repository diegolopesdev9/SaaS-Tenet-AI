
import React, { useState, useEffect } from 'react'
import { Smartphone, QrCode, RefreshCw, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import api from '../services/api'

export default function WhatsAppConnection({ agencyId }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [instanceInfo, setInstanceInfo] = useState(null)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    checkConnectionStatus()
    loadLogs()
  }, [agencyId])

  const checkConnectionStatus = async () => {
    try {
      const response = await api.get(`/whatsapp/${agencyId}/status`)
      setConnectionStatus(response.data.status)
      setInstanceInfo(response.data.instance)
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      setConnectionStatus('disconnected')
    }
  }

  const loadLogs = async () => {
    try {
      const response = await api.get(`/whatsapp/${agencyId}/logs?limit=10`)
      setLogs(response.data)
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    }
  }

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    setConnectionStatus('connecting')
    
    try {
      const response = await api.post(`/whatsapp/${agencyId}/connect`)
      
      if (response.data.qr_code) {
        setQrCode(response.data.qr_code)
        pollConnectionStatus()
      } else if (response.data.status === 'connected') {
        setConnectionStatus('connected')
        setInstanceInfo(response.data.instance)
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Erro ao conectar')
      setConnectionStatus('disconnected')
    } finally {
      setLoading(false)
    }
  }

  const pollConnectionStatus = () => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/whatsapp/${agencyId}/status`)
        
        if (response.data.status === 'connected') {
          setConnectionStatus('connected')
          setQrCode(null)
          setInstanceInfo(response.data.instance)
          clearInterval(interval)
          loadLogs()
        } else if (response.data.status === 'disconnected') {
          clearInterval(interval)
        }
      } catch (error) {
        clearInterval(interval)
      }
    }, 3000)

    setTimeout(() => clearInterval(interval), 120000)
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return
    
    setLoading(true)
    try {
      await api.post(`/whatsapp/${agencyId}/disconnect`)
      setConnectionStatus('disconnected')
      setQrCode(null)
      setInstanceInfo(null)
      loadLogs()
    } catch (error) {
      setError(error.response?.data?.detail || 'Erro ao desconectar')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshQR = async () => {
    setLoading(true)
    try {
      const response = await api.post(`/whatsapp/${agencyId}/refresh-qr`)
      setQrCode(response.data.qr_code)
    } catch (error) {
      setError(error.response?.data?.detail || 'Erro ao atualizar QR Code')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Conectado
          </div>
        )
      case 'connecting':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Conectando...
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Desconectado
          </div>
        )
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Conexão WhatsApp</h1>
        <p className="mt-2 text-gray-400">
          Configure e gerencie a conexão do seu Tenet com o WhatsApp
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-lg">×</button>
        </div>
      )}

      {/* Card Principal */}
      <div className="bg-[#2D2D2D] rounded-lg border border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Status da Conexão</h2>
              <p className="text-sm text-gray-400">Evolution API</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Informações da Instância */}
        {instanceInfo && (
          <div className="mb-6 p-4 bg-[#1A1A1A] rounded-lg border border-white/10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Nome da Instância</p>
                <p className="text-white font-medium">{instanceInfo.instanceName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Número</p>
                <p className="text-white font-medium">{instanceInfo.number || 'Não disponível'}</p>
              </div>
            </div>
          </div>
        )}

        {/* QR Code */}
        {connectionStatus === 'connecting' && qrCode && (
          <div className="mb-6">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-8">
              <div className="flex flex-col items-center">
                <QrCode className="w-12 h-12 text-cyan-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Escaneie o QR Code</h3>
                <p className="text-sm text-gray-400 text-center mb-6">
                  Use o WhatsApp no seu celular para escanear este código
                </p>
                
                <div className="bg-white p-4 rounded-lg mb-6">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>

                <button
                  onClick={handleRefreshQR}
                  disabled={loading}
                  className="px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-600 flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar QR Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instruções */}
        {connectionStatus === 'disconnected' && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-white font-semibold mb-3">Como conectar:</h3>
            <ol className="space-y-2">
              <li className="flex items-start gap-3 text-gray-400">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500 text-black rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span>Clique no botão "Conectar WhatsApp" abaixo</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500 text-black rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span>Aguarde o QR Code ser gerado</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500 text-black rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <span>Abra o WhatsApp no seu celular e vá em Dispositivos Conectados</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500 text-black rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <span>Escaneie o QR Code exibido na tela</span>
              </li>
            </ol>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-3">
          {connectionStatus === 'disconnected' && (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              Conectar WhatsApp
            </button>
          )}
          
          {connectionStatus === 'connected' && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Desconectar
            </button>
          )}
          
          {connectionStatus === 'connecting' && (
            <button
              onClick={() => {
                setConnectionStatus('disconnected')
                setQrCode(null)
              }}
              className="px-6 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Histórico de Logs */}
      <div className="bg-[#2D2D2D] rounded-lg border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Histórico de Conexões</h3>
        
        {logs.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nenhum log disponível</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="p-3 bg-[#1A1A1A] rounded-lg border border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      log.type === 'success' ? 'text-green-400' : 
                      log.type === 'error' ? 'text-red-400' : 
                      'text-gray-400'
                    }`}>
                      {log.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {log.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
                  {log.type === 'error' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
