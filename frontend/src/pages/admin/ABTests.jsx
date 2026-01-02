import React, { useState, useEffect } from 'react'
import { FlaskConical, Plus, Play, Pause, Trophy, BarChart3, AlertCircle } from 'lucide-react'
import api from '../../services/api'

export default function ABTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTest, setSelectedTest] = useState(null)
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    try {
      setLoading(true)
      setError(null)

      // Se for super admin, busca todos os testes
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const isSuperAdmin = user?.role === 'super_admin';

      let response;
      if (isSuperAdmin) {
        // Super admin vê todos os testes ou lista vazia se não houver tenet selecionado
        const selectedTenetId = localStorage.getItem('selectedAgencyId');
        if (selectedTenetId && selectedTenetId !== 'geral') {
          response = await api.get(`/ab-tests?tenet_id=${selectedTenetId}`);
        } else {
          // Sem tenet selecionado, mostrar lista vazia com mensagem
          setTests([]);
          setLoading(false);
          return;
        }
      } else {
        response = await api.get('/ab-tests');
      }

      // Garantir que é array
      const data = response.data
      if (Array.isArray(data)) {
        setTests(data)
      } else if (data && Array.isArray(data.tests)) {
        setTests(data.tests)
      } else {
        setTests([])
      }
    } catch (err) {
      console.error('Erro ao carregar testes:', err)
      // Não mostrar erro se for 400 para super admin sem tenet
      if (err.response?.status !== 400) {
        setError('Erro ao carregar testes A/B')
      }
      setTests([])
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
      draft: { color: 'bg-gray-500/20 text-gray-400', label: 'Rascunho' },
      running: { color: 'bg-green-500/20 text-green-400', label: 'Executando' },
      paused: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pausado' },
      completed: { color: 'bg-cyan-500/20 text-cyan-400', label: 'Concluído' }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Testes A/B</h1>
          <p className="mt-1 text-sm text-gray-400">
            Otimize seus prompts com testes A/B
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-600 transition-colors font-medium">
          <Plus className="w-4 h-4" />
          Novo Teste
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-white">Como funciona?</h3>
            <p className="text-sm text-cyan-300 mt-1">
              Crie duas variantes de prompt (A e B) e o sistema distribuirá automaticamente
              as conversas entre elas. Após coletar dados suficientes, você poderá ver qual
              variante tem melhor taxa de conversão.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Testes */}
      <div className="grid gap-4">
        {!tests || tests.length === 0 ? (
          <div className="text-center py-12 bg-[#2D2D2D] rounded-lg border border-white/10">
            <FlaskConical className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum teste A/B criado</p>
            <p className="text-sm text-gray-400 mt-1">Crie seu primeiro teste para otimizar seus prompts</p>
          </div>
        ) : (
          tests.map((test) => (
            <div
              key={test.id}
              className="bg-[#2D2D2D] rounded-lg border border-white/10 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{test.nome}</h3>
                    {getStatusBadge(test.status)}
                    {test.vencedor && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                        <Trophy className="w-3 h-3" />
                        Variante {test.vencedor.toUpperCase()} venceu
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Distribuição: {100 - (test.percentual_b || 50)}% A / {test.percentual_b || 50}% B
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {test.status === 'running' ? (
                    <button
                      onClick={() => handleStopTest(test.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-black bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors font-medium"
                    >
                      <Pause className="w-4 h-4" />
                      Pausar
                    </button>
                  ) : test.status !== 'completed' && (
                    <button
                      onClick={() => handleStartTest(test.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors font-medium"
                    >
                      <Play className="w-4 h-4" />
                      Iniciar
                    </button>
                  )}
                  <button
                    onClick={() => loadMetrics(test.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-black bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors font-medium"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Métricas
                  </button>
                </div>
              </div>

              {/* Variantes */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-400">Variante A</span>
                    {test.vencedor === 'a' && (
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-3">
                    {test.variante_a_prompt}
                  </p>
                </div>
                <div className="p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-purple-400">Variante B</span>
                    {test.vencedor === 'b' && (
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-3">
                    {test.variante_b_prompt}
                  </p>
                </div>
              </div>

              {/* Métricas inline */}
              {selectedTest === test.id && metrics && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="font-medium text-white mb-3">Resultados</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <p className="text-2xl font-bold text-white">
                        {metrics.variante_a?.total_conversas || 0}
                      </p>
                      <p className="text-xs text-gray-400">Conversas A</p>
                    </div>
                    <div className="text-center p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <p className="text-2xl font-bold text-white">
                        {metrics.variante_a?.taxa_conversao?.toFixed(1) || 0}%
                      </p>
                      <p className="text-xs text-gray-400">Conversão A</p>
                    </div>
                    <div className="text-center p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
                      <p className="text-2xl font-bold text-white">
                        {metrics.variante_b?.total_conversas || 0}
                      </p>
                      <p className="text-xs text-gray-400">Conversas B</p>
                    </div>
                    <div className="text-center p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
                      <p className="text-2xl font-bold text-white">
                        {metrics.variante_b?.taxa_conversao?.toFixed(1) || 0}%
                      </p>
                      <p className="text-xs text-gray-400">Conversão B</p>
                    </div>
                  </div>
                  {metrics.sugestao_vencedor && (
                    <p className="mt-3 text-sm text-gray-400">
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