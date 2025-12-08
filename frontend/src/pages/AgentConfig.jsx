import React, { useState, useEffect } from 'react'
import { Save, Bot, Key, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import api from '../services/api'

export default function AgentConfig({ agencyId }) {
  const [config, setConfig] = useState({
    nome: '',
    prompt_config: '',
    whatsapp_phone_id: '',
    whatsapp_token: '',
    gemini_api_key: '',
    instance_name: '' // Added instance_name to initial state
  })

  const [originalConfig, setOriginalConfig] = useState({
    has_whatsapp_token: false,
    has_gemini_key: false
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const [showTokens, setShowTokens] = useState({
    whatsapp: false,
    gemini: false
  })

  useEffect(() => {
    loadConfig()
  }, [agencyId])

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
        instance_name: data.instance_name || '' // Load instance_name from response
      })

      setOriginalConfig({
        has_whatsapp_token: !!data.whatsapp_token,
        has_gemini_key: !!data.gemini_api_key
      })

    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      // Preparar payload apenas com campos preenchidos
      const payload = {
        nome: config.nome
      }

      if (config.instance_name) { // Added instance_name to payload
        payload.instance_name = config.instance_name
      }

      if (config.prompt_config) {
        payload.prompt_config = config.prompt_config
      }

      if (config.whatsapp_phone_id) {
        payload.whatsapp_phone_id = config.whatsapp_phone_id
      }

      if (config.whatsapp_token) {
        payload.whatsapp_token = config.whatsapp_token
      }

      if (config.gemini_api_key) {
        payload.gemini_api_key = config.gemini_api_key
      }

      await api.post(`/agencias/${agencyId}/config`, payload)

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })

      // Limpar campos de token
      setConfig(prev => ({
        ...prev,
        whatsapp_token: '',
        gemini_api_key: ''
      }))

      // Recarregar config
      await loadConfig()

    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao salvar configurações'
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleTokenVisibility = (field) => {
    setShowTokens(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
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

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Agente</h1>
        <p className="mt-2 text-gray-600">
          Configure a personalidade e integrações do seu agente SDR
        </p>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="space-y-6">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Agência
            </label>
            <input
              type="text"
              value={config.nome}
              onChange={(e) => setConfig(prev => ({ ...prev, nome: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Ex: Agência Digital XYZ"
            />
          </div>

          <div className="mt-4"> {/* Added input for instance_name */}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Instância (Evolution API)
            </label>
            <input
              type="text"
              value={config.instance_name}
              onChange={(e) => setConfig(prev => ({ ...prev, instance_name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Ex: agencia-teste"
            />
            <p className="mt-2 text-xs text-gray-500">
              Nome da instância configurada na Evolution API. Usado para identificar automaticamente a agência.
            </p>
          </div>
        </div>

        {/* Seção: Personalidade do Agente */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Personalidade do Agente</h2>
              <p className="text-sm text-gray-600">Defina como o agente deve se comportar</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt de Configuração
            </label>
            <textarea
              value={config.prompt_config}
              onChange={(e) => setConfig(prev => ({ ...prev, prompt_config: e.target.value }))}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none font-mono text-sm"
              placeholder="Ex: Você é um SDR profissional e amigável. Seu objetivo é qualificar leads através de conversas naturais no WhatsApp..."
            />
            <p className="mt-2 text-xs text-gray-500">
              Este prompt define a personalidade e objetivos do agente nas conversas
            </p>
          </div>
        </div>

        {/* Seção: Chaves de Integração */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Chaves de Integração</h2>
              <p className="text-sm text-gray-600">Configure as APIs do WhatsApp e Gemini</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* WhatsApp Phone ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Phone ID
              </label>
              <input
                type="text"
                value={config.whatsapp_phone_id}
                onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_phone_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Ex: 5511999999999"
              />
            </div>

            {/* WhatsApp Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Token (Evolution API)
              </label>
              <div className="relative">
                <input
                  type={showTokens.whatsapp ? 'text' : 'password'}
                  value={config.whatsapp_token}
                  onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_token: e.target.value }))}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder={originalConfig.has_whatsapp_token ? '••••••••••••••••' : 'Cole seu token aqui'}
                />
                <button
                  type="button"
                  onClick={() => toggleTokenVisibility('whatsapp')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showTokens.whatsapp ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {originalConfig.has_whatsapp_token && !config.whatsapp_token && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    <CheckCircle className="w-3 h-3" />
                    Token configurado
                  </span>
                  <span className="text-xs text-gray-500">Deixe em branco para manter o atual</span>
                </div>
              )}
            </div>

            {/* Gemini API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gemini API Key
              </label>
              <div className="relative">
                <input
                  type={showTokens.gemini ? 'text' : 'password'}
                  value={config.gemini_api_key}
                  onChange={(e) => setConfig(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder={originalConfig.has_gemini_key ? '••••••••••••••••' : 'Cole sua API key aqui'}
                />
                <button
                  type="button"
                  onClick={() => toggleTokenVisibility('gemini')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showTokens.gemini ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {originalConfig.has_gemini_key && !config.gemini_api_key && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    <CheckCircle className="w-3 h-3" />
                    Token configurado
                  </span>
                  <span className="text-xs text-gray-500">Deixe em branco para manter a atual</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}