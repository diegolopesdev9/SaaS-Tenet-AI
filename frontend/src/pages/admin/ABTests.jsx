
import React, { useState, useEffect } from 'react'
import { FlaskConical, Plus, Play, Pause, Trophy, BarChart3, AlertCircle } from 'lucide-react'
import api from '../../services/api'

export default function ABTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTest, setSelectedTest] = useState(null)
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    try {
      setLoading(true)
      const response = await api.get('/ab-tests')
      setTests(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar testes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async (testId) => {
    try {
      const response = await api.get(`/ab-tests/${testId}/metrics`)
      setMetrics(response.data)
      setSelectedTest(testId)
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    }
  }

  const handleStartTest = async (testId) => {
    try {
      await api.post(`/ab-tests/${testId}/start`)
      loadTests()
    } catch (error) {
      console.error('Erro ao iniciar teste:', error)
    }
  }

  const handleStopTest = async (testId) => {
    try {
      await api.post(`/ab-tests/${testId}/stop`)
      loadTests()
    } catch (error) {
      console.error('Erro ao parar teste:', error)
    }
  }

  const getStatusBadge = (status) => {
    const configs = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Rascunho' },
      running: { color: 'bg-green-100 text-green-800', label: 'Executando' },
      paused: { color: 'bg-yellow-100 text-yellow-800', label: 'Pausado' },
      completed: { color: 'bg-blue-100 text-blue-800', label: 'Concluído' }
    }
    const config = configs[status] || configs.draft
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testes A/B</h1>
          <p className="mt-1 text-sm text-gray-500">
            Otimize seus prompts com testes A/B
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Teste
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Como funciona?</h3>
            <p className="text-sm text-blue-700 mt-1">
              Crie duas variantes de prompt (A e B) e o sistema distribuirá automaticamente 
              as conversas entre elas. Após coletar dados suficientes, você poderá ver qual 
              variante tem melhor taxa de conversão.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Testes */}
      <div className="grid gap-4">
        {tests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FlaskConical className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum teste A/B criado</p>
            <p className="text-sm text-gray-400 mt-1">Crie seu primeiro teste para otimizar seus prompts</p>
          </div>
        ) : (
          tests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{test.nome}</h3>
                    {getStatusBadge(test.status)}
                    {test.vencedor && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        <Trophy className="w-3 h-3" />
                        Variante {test.vencedor.toUpperCase()} venceu
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Distribuição: {100 - (test.percentual_b || 50)}% A / {test.percentual_b || 50}% B
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {test.status === 'running' ? (
                    <button
                      onClick={() => handleStopTest(test.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      Pausar
                    </button>
                  ) : test.status !== 'completed' && (
                    <button
                      onClick={() => handleStartTest(test.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Iniciar
                    </button>
                  )}
                  <button
                    onClick={() => loadMetrics(test.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Métricas
                  </button>
                </div>
              </div>

              {/* Variantes */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">Variante A</span>
                    {test.vencedor === 'a' && (
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {test.variante_a_prompt}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">Variante B</span>
                    {test.vencedor === 'b' && (
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {test.variante_b_prompt}
                  </p>
                </div>
              </div>

              {/* Métricas inline */}
              {selectedTest === test.id && metrics && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Resultados</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">
                        {metrics.variante_a?.total_conversas || 0}
                      </p>
                      <p className="text-xs text-blue-600">Conversas A</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">
                        {metrics.variante_a?.taxa_conversao?.toFixed(1) || 0}%
                      </p>
                      <p className="text-xs text-blue-600">Conversão A</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-700">
                        {metrics.variante_b?.total_conversas || 0}
                      </p>
                      <p className="text-xs text-purple-600">Conversas B</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-700">
                        {metrics.variante_b?.taxa_conversao?.toFixed(1) || 0}%
                      </p>
                      <p className="text-xs text-purple-600">Conversão B</p>
                    </div>
                  </div>
                  {metrics.sugestao_vencedor && (
                    <p className="mt-3 text-sm text-gray-600">
                      💡 {metrics.sugestao_vencedor}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
