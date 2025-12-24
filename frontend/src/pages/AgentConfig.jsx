import React, { useState, useEffect, useCallback } from 'react'
import { Save, Bot, Key, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Shield, MessageSquare, Smartphone, QrCode, Wifi, WifiOff, RefreshCw, XCircle, Lock, Copy } from 'lucide-react'
import api from '../services/api'
import authService from '../services/auth'

export default function AgentConfig({ agencyId }) {
  const [config, setConfig] = useState({
    nome: '',
    prompt_config: '',
    whatsapp_phone_id: '',
    whatsapp_token: '',
    gemini_api_key: '',
    instance_name: '',
    agent_name: '',
    personality: '',
    welcome_message: '',
    qualification_questions: [],
    qualification_criteria: '',
    closing_message: '',
    whatsapp_api_type: 'evolution',
    meta_phone_number_id: '',
    meta_business_account_id: '',
    meta_access_token: ''
  })

  const [originalConfig, setOriginalConfig] = useState({
    has_whatsapp_token: false,
    has_gemini_key: false,
    has_meta_token: false
  })

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const [showTokens, setShowTokens] = useState({
    whatsapp: false,
    gemini: false,
    meta: false
  })

  // Estados para conexão WhatsApp
  const [whatsappStatus, setWhatsappStatus] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [creatingInstance, setCreatingInstance] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [polling, setPolling] = useState(false)
  // ADICIONAR estado para timer
  const [qrTimer, setQrTimer] = useState(45)
  // Estado para token da instância
  const [instanceToken, setInstanceToken] = useState(null)
  // Estado para health check
  const [healthStatus, setHealthStatus] = useState(null)

  useEffect(() => {
    loadConfig()
    loadUser()
  }, [agencyId])

  // Carregar status do WhatsApp quando config carregar
  useEffect(() => {
    if (config.whatsapp_api_type === 'evolution' && !loading) {
      checkWhatsAppStatus()
    }
  }, [config.whatsapp_api_type, loading])

  // Polling para verificar conexão
  useEffect(() => {
    let interval
    if (polling && qrCode) {
      interval = setInterval(async () => {
        const result = await checkWhatsAppStatus()
        if (result?.connected) {
          clearInterval(interval)
          setPolling(false)
          setQrCode(null)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [polling, qrCode])

  // ADICIONAR useEffect para countdown quando qrCode existir
  useEffect(() => {
    if (!qrCode || qrTimer <= 0) return
    const timer = setTimeout(() => setQrTimer(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [qrCode, qrTimer])

  // Verificar health quando conectado
  useEffect(() => {
    if (whatsappStatus?.connected) {
      checkHealth()
    }
  }, [whatsappStatus?.connected])

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Erro ao carregar usuário:', error)
    }
  }

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/agencias/${agencyId}/config`)
      const data = response.data

      setConfig({
        nome: data.nome || '',
        prompt_config: data.prompt_config || '',
        whatsapp_phone_id: data.whatsapp_phone_id || '',
        whatsapp_token: '',
        gemini_api_key: '',
        instance_name: data.instance_name || '',
        agent_name: data.agent_name || 'Assistente',
        personality: data.personality || 'profissional e amigável',
        welcome_message: data.welcome_message || 'Olá! 👋 Sou o assistente virtual. Como posso ajudá-lo hoje?',
        qualification_questions: data.qualification_questions || ['Qual seu nome?', 'Qual seu email?', 'Qual seu interesse?', 'Qual seu orçamento aproximado?'],
        qualification_criteria: data.qualification_criteria || 'Lead qualificado quando: tem nome, email, demonstra interesse claro e menciona orçamento.',
        closing_message: data.closing_message || 'Obrigado pelo contato! Em breve nossa equipe entrará em contato com você. 🚀',
        whatsapp_api_type: data.whatsapp_api_type || 'evolution',
        meta_phone_number_id: data.meta_phone_number_id || '',
        meta_business_account_id: data.meta_business_account_id || '',
        meta_access_token: ''
      })

      setOriginalConfig({
        has_whatsapp_token: !!data.has_whatsapp_token,
        has_gemini_key: !!data.has_gemini_key,
        has_meta_token: !!data.has_meta_token
      })
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const checkHealth = async () => {
    try {
      const response = await api.get('/whatsapp/instance/health')
      setHealthStatus(response.data)
    } catch (err) {
      setHealthStatus({ healthy: false, reason: 'error' })
    }
  }

  const checkWhatsAppStatus = useCallback(async () => {
    try {
      const response = await api.get('/whatsapp/instance/status')
      setWhatsappStatus(response.data)
      if (response.data.connected) {
        setQrCode(null)
        setPolling(false)
      }
      // Buscar token da instância se disponível
      if (response.data.instance_name) {
        try {
          const tokenResponse = await api.get('/whatsapp/instance/token')
          if (tokenResponse.data?.token) {
            setInstanceToken(tokenResponse.data.token)
          }
        } catch (tokenErr) {
          console.error('Erro ao buscar token:', tokenErr)
        }
      }
      return response.data
    } catch (err) {
      console.error('Erro ao verificar status:', err)
      setWhatsappStatus({ status: 'not_configured', connected: false })
      return null
    }
  }, [])

  const handleCreateInstance = async () => {
    try {
      setCreatingInstance(true)
      // Resetar timer quando gerar novo QR
      setQrTimer(45)
      const response = await api.post('/whatsapp/instance/create', {
        instance_name: config.instance_name || undefined
      })
      if (response.data.success) {
        setQrCode(response.data.qrcode)
        setPolling(true)
        if (response.data.instance_name) {
          setConfig(prev => ({ ...prev, instance_name: response.data.instance_name }))
        }
        await checkWhatsAppStatus()
        // Buscar token da instância criada
        try {
          const tokenResponse = await api.get('/whatsapp/instance/token')
          if (tokenResponse.data?.token) {
            setInstanceToken(tokenResponse.data.token)
          }
        } catch (tokenErr) {
          console.error('Erro ao buscar token:', tokenErr)
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao criar instância' })
    } finally {
      setCreatingInstance(false)
    }
  }

  const handleGetQrCode = async () => {
    try {
      // Resetar timer quando gerar novo QR
      setQrTimer(45)
      const response = await api.get('/whatsapp/instance/qrcode')
      if (response.data.success && response.data.qrcode) {
        setQrCode(response.data.qrcode)
        setPolling(true)
      } else {
        setMessage({ type: 'error', text: 'QR Code não disponível' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao obter QR Code' })
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return
    try {
      setDisconnecting(true)
      await api.post('/whatsapp/instance/disconnect')
      await checkWhatsAppStatus()
      setQrCode(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao desconectar' })
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const payload = { nome: config.nome }

      if (config.instance_name) payload.instance_name = config.instance_name
      if (config.agent_name) payload.agent_name = config.agent_name
      if (config.personality) payload.personality = config.personality
      if (config.welcome_message) payload.welcome_message = config.welcome_message
      if (config.qualification_questions?.length > 0) payload.qualification_questions = config.qualification_questions
      if (config.qualification_criteria) payload.qualification_criteria = config.qualification_criteria
      if (config.closing_message) payload.closing_message = config.closing_message
      if (config.prompt_config) payload.prompt_config = config.prompt_config
      if (config.whatsapp_phone_id) payload.whatsapp_phone_id = config.whatsapp_phone_id
      if (config.whatsapp_token) payload.whatsapp_token = config.whatsapp_token
      if (config.gemini_api_key) payload.gemini_api_key = config.gemini_api_key

      if (user?.role === 'super_admin') {
        payload.whatsapp_api_type = config.whatsapp_api_type
        if (config.meta_phone_number_id) payload.meta_phone_number_id = config.meta_phone_number_id
        if (config.meta_business_account_id) payload.meta_business_account_id = config.meta_business_account_id
        if (config.meta_access_token) payload.meta_access_token = config.meta_access_token
      }

      await api.post(`/agencias/${agencyId}/config`, payload)
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
      setConfig(prev => ({ ...prev, whatsapp_token: '', gemini_api_key: '', meta_access_token: '' }))
      await loadConfig()
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao salvar configurações' })
    } finally {
      setSaving(false)
    }
  }

  const toggleTokenVisibility = (field) => {
    setShowTokens(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ type: 'success', text: 'Token copiado para a área de transferência!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao copiar token' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  const isConnected = whatsappStatus?.connected
  const isConfigured = whatsappStatus?.status !== 'not_configured' && whatsappStatus?.status !== 'not_found'

  // Criar função para determinar cor do LED
  const getStatusColor = () => {
    if (whatsappStatus?.connected) return 'bg-green-500' // Conectado
    if (whatsappStatus?.status === 'close' || isConfigured) return 'bg-yellow-500' // Desconectado
    return 'bg-red-500' // Não existe
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Agente</h1>
        <p className="mt-2 text-gray-600">Configure a personalidade e integrações do seu agente SDR</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Seção: Seleção de API WhatsApp (apenas Super Admin) */}
        {user?.role === 'super_admin' && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">API do WhatsApp</h2>
                <p className="text-sm text-gray-600">Selecione qual API usar para esta agência</p>
              </div>
            </div>

            <div className="flex gap-4">
              <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all ${config.whatsapp_api_type === 'evolution' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="radio" name="whatsapp_api_type" value="evolution" checked={config.whatsapp_api_type === 'evolution'} onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_api_type: e.target.value }))} className="sr-only" />
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${config.whatsapp_api_type === 'evolution' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                    {config.whatsapp_api_type === 'evolution' && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full"></div></div>}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Evolution API</p>
                    <p className="text-sm text-gray-500">API não-oficial, mais flexível</p>
                  </div>
                </div>
              </label>

              <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all ${config.whatsapp_api_type === 'meta' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="radio" name="whatsapp_api_type" value="meta" checked={config.whatsapp_api_type === 'meta'} onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_api_type: e.target.value }))} className="sr-only" />
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${config.whatsapp_api_type === 'meta' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                    {config.whatsapp_api_type === 'meta' && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full"></div></div>}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Meta Official API</p>
                    <p className="text-sm text-gray-500">API oficial do WhatsApp Business</p>
                  </div>
                </div>
              </label>
            </div>

            {config.whatsapp_api_type === 'meta' && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number ID</label>
                  <input type="text" value={config.meta_phone_number_id} onChange={(e) => setConfig(prev => ({ ...prev, meta_phone_number_id: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 123456789012345" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Account ID</label>
                  <input type="text" value={config.meta_business_account_id} onChange={(e) => setConfig(prev => ({ ...prev, meta_business_account_id: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 123456789012345" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
                  <div className="relative">
                    <input type={showTokens.meta ? 'text' : 'password'} value={config.meta_access_token} onChange={(e) => setConfig(prev => ({ ...prev, meta_access_token: e.target.value }))} className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder={originalConfig.has_meta_token ? '••••••••••••••••' : 'Cole seu Access Token'} />
                    <button type="button" onClick={() => toggleTokenVisibility('meta')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showTokens.meta ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {originalConfig.has_meta_token && !config.meta_access_token && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded"><CheckCircle className="w-3 h-3" />Token configurado</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Seção: Informações Básicas */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Informações Básicas</h2>
              <p className="text-sm text-gray-600">Nome e identificação da agência</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Agência</label>
            <input type="text" value={config.nome} onChange={(e) => setConfig(prev => ({ ...prev, nome: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Agência Digital XYZ" />
          </div>
        </div>

        {/* Seção: Personalidade do Agente */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Personalidade do Agente</h2>
              <p className="text-sm text-gray-600">Configure como o agente se comporta</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Agente</label>
              <input type="text" value={config.agent_name} onChange={(e) => setConfig(prev => ({ ...prev, agent_name: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Sofia" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Personalidade</label>
              <input type="text" value={config.personality} onChange={(e) => setConfig(prev => ({ ...prev, personality: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: profissional e amigável" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem de Boas-vindas</label>
            <textarea value={config.welcome_message} onChange={(e) => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Ex: Olá! 👋 Sou o assistente virtual..." />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Perguntas de Qualificação</label>
            {config.qualification_questions.map((question, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input type="text" value={question} onChange={(e) => { const newQ = [...config.qualification_questions]; newQ[index] = e.target.value; setConfig(prev => ({ ...prev, qualification_questions: newQ })); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                <button type="button" onClick={() => setConfig(prev => ({ ...prev, qualification_questions: prev.qualification_questions.filter((_, i) => i !== index) }))} className="px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">Remover</button>
              </div>
            ))}
            <button type="button" onClick={() => setConfig(prev => ({ ...prev, qualification_questions: [...prev.qualification_questions, ''] }))} className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200">+ Adicionar Pergunta</button>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Critérios de Qualificação</label>
            <textarea value={config.qualification_criteria} onChange={(e) => setConfig(prev => ({ ...prev, qualification_criteria: e.target.value }))} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem de Encerramento</label>
            <textarea value={config.closing_message} onChange={(e) => setConfig(prev => ({ ...prev, closing_message: e.target.value }))} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>
        </div>

        {/* Seção: Prompt Avançado */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Prompt Avançado</h2>
              <p className="text-sm text-gray-600">Configuração detalhada do comportamento</p>
            </div>
          </div>
          <textarea value={config.prompt_config} onChange={(e) => setConfig(prev => ({ ...prev, prompt_config: e.target.value }))} rows={10} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm" placeholder="Prompt personalizado..." />
        </div>

        {/* Seção: Chaves de Integração */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Chaves de Integração</h2>
              <p className="text-sm text-gray-600">APIs do WhatsApp e Gemini</p>
            </div>
          </div>

          <div className="space-y-6">
            {config.whatsapp_api_type === 'evolution' && (
              <>
                {/* Conexão WhatsApp */}
                <div className="pb-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor()}`}>
                        <Smartphone className={`w-4 h-4 ${isConnected ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Conexão WhatsApp</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isConnected ? (
                            <><Wifi className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">Conectado</span></>
                          ) : (
                            <><WifiOff className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs text-gray-500">Desconectado</span></>
                          )}
                        </div>
                        {whatsappStatus?.connected && (
                          <div className="flex items-center gap-2 mt-1">
                            {healthStatus?.healthy ? (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Conexão verificada
                              </span>
                            ) : healthStatus?.healthy === false ? (
                              <span className="text-xs text-yellow-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                Conexão instável - verifique no celular
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={checkWhatsAppStatus} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Atualizar status">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info de conexão */}
                  {isConnected && whatsappStatus?.phone_number && (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200 flex items-center gap-4">
                      {whatsappStatus.profile_picture && (
                        <img src={whatsappStatus.profile_picture} alt="Profile" className="w-12 h-12 rounded-full" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-green-900">
                          {whatsappStatus.profile_name || (whatsappStatus.phone_number ? 'WhatsApp Conectado' : 'Verificando conexão...')}
                        </p>
                        <p className="text-green-700">+{whatsappStatus.phone_number}</p>
                        {/* MOSTRAR instance_name configurada após criar */}
                        {whatsappStatus?.instance_name && (
                          <p className="text-xs text-gray-500">Instância: {whatsappStatus.instance_name}</p>
                        )}
                        {!whatsappStatus.profile_name && whatsappStatus.connected && (
                          <p className="text-xs text-yellow-600">⚠️ Conexão pode estar instável. Verifique no celular.</p>
                        )}
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  )}

                  {/* QR Code */}
                  {qrCode && !isConnected && (
                    <div className="mb-4 text-center p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <QrCode className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-700 font-medium mb-4">Escaneie o QR Code com seu WhatsApp</p>
                      <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                        <img
                          src={qrCode.replace(/^(data:image\/png;base64,)+/, 'data:image/png;base64,')}
                          alt="QR Code"
                          className="w-56 h-56"
                        />
                      </div>
                      {qrTimer > 0 ? (
                        <p className="text-sm text-gray-500 mt-3">Expira em {qrTimer}s</p>
                      ) : (
                        <p className="text-sm text-red-500 mt-3">QR Code expirado. Gere um novo.</p>
                      )}
                      {polling && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" /><span>Aguardando conexão...</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-4">WhatsApp → Menu → Dispositivos conectados → Conectar</p>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!isConfigured && (
                      <button onClick={handleCreateInstance} disabled={creatingInstance} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                        {creatingInstance ? <><Loader2 className="w-4 h-4 animate-spin" />Criando...</> : <><Smartphone className="w-4 h-4" />Conectar WhatsApp</>}
                      </button>
                    )}
                    {isConfigured && !isConnected && (
                      <>
                        <button onClick={handleGetQrCode} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          <QrCode className="w-4 h-4" />Gerar QR Code
                        </button>
                        <button onClick={handleCreateInstance} disabled={creatingInstance} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                          <RefreshCw className="w-4 h-4" />Nova Conexão
                        </button>
                      </>
                    )}
                    {isConnected && (
                      <button onClick={handleDisconnect} disabled={disconnecting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm">
                        {disconnecting ? <><Loader2 className="w-4 h-4 animate-spin" />Desconectando...</> : <><XCircle className="w-4 h-4" />Desconectar WhatsApp</>}
                      </button>
                    )}
                  </div>

                  {/* Instruções */}
                  {!isConnected && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-800"><strong>Como conectar:</strong> Clique em "Conectar WhatsApp", abra o WhatsApp no celular → Configurações → Dispositivos conectados → Escaneie o QR Code</p>
                    </div>
                  )}
                </div>

                {/* Instance Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instance Name (Evolution API)</label>
                  <input type="text" value={config.instance_name} onChange={(e) => setConfig(prev => ({ ...prev, instance_name: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: agencia-xyz" />
                </div>

                {/* WhatsApp Phone ID - SEMPRE READONLY */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    WhatsApp Phone ID
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                  </label>
                  <input 
                    type="text" 
                    value={whatsappStatus?.phone_number || config.whatsapp_phone_id || 'Será preenchido ao conectar'} 
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Preenchido automaticamente ao conectar WhatsApp</p>
                </div>

                {/* WhatsApp Token */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    WhatsApp Token (Evolution API)
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                  </label>
                  <div className="relative">
                    <input 
                      type={showTokens.whatsapp ? 'text' : 'password'} 
                      value={instanceToken || ''} 
                      readOnly
                      className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed outline-none" 
                      placeholder="Token gerado automaticamente" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {instanceToken && (
                        <button 
                          type="button" 
                          onClick={() => copyToClipboard(instanceToken)} 
                          className="text-gray-400 hover:text-gray-600"
                          title="Copiar token"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        type="button" 
                        onClick={() => toggleTokenVisibility('whatsapp')} 
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showTokens.whatsapp ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  {instanceToken ? (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      <CheckCircle className="w-3 h-3" />Token da instância configurado
                    </span>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Token será gerado ao criar a instância</p>
                  )}
                </div>
              </>
            )}

            {/* Gemini API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
              <div className="relative">
                <input type={showTokens.gemini ? 'text' : 'password'} value={config.gemini_api_key} onChange={(e) => setConfig(prev => ({ ...prev, gemini_api_key: e.target.value }))} className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder={originalConfig.has_gemini_key ? '••••••••••••••••' : 'Cole sua API key aqui'} />
                <button type="button" onClick={() => toggleTokenVisibility('gemini')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showTokens.gemini ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {originalConfig.has_gemini_key && !config.gemini_api_key && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded"><CheckCircle className="w-3 h-3" />Token configurado</span>
              )}
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <><Loader2 className="w-5 h-5 animate-spin" />Salvando...</> : <><Save className="w-5 h-5" />Salvar Configurações</>}
          </button>
        </div>
      </div>
    </div>
  )
}