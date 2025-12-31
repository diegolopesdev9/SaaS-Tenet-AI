
import { useState, useEffect } from 'react';
import api from '../services/api';
import TokenUsage from '../components/TokenUsage';

export default function Billing() {
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, histRes, plansRes] = await Promise.all([
        api.get('/billing/subscription'),
        api.get('/billing/usage/history?days=30'),
        api.get('/billing/plans')
      ]);
      setSubscription(subRes.data.subscription);
      setHistory(histRes.data);
      setPlans(plansRes.data.plans || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num?.toString() || '0';
  };

  const formatPrice = (cents) => {
    return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const maxDailyUsage = history?.daily_usage?.length > 0
    ? Math.max(...history.daily_usage.map(d => d.tokens_total))
    : 1;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plans;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Faturamento</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <TokenUsage />
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">💳 Sua Assinatura</h3>
          
          {subscription ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Plano</span>
                <span className="font-medium">{currentPlan?.display_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium ${subscription.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {subscription.status === 'active' ? '✅ Ativo' : '⚠️ ' + subscription.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Período</span>
                <span className="text-sm">
                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor</span>
                <span className="font-medium">{formatPrice(currentPlan?.price_cents || 0)}/mês</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-3">Você está no modo Trial</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Escolher um plano
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h3 className="font-semibold text-gray-800 mb-4">📈 Histórico de Uso (últimos 30 dias)</h3>
        
        {history?.daily_usage?.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Total de Tokens</p>
                <p className="text-2xl font-bold text-gray-800">{formatNumber(history.total_tokens)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Total de Conversas</p>
                <p className="text-2xl font-bold text-gray-800">{history.total_conversations}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">Uso diário de tokens</p>
              <div className="flex items-end gap-1 h-32">
                {history.daily_usage.slice(0, 30).reverse().map((day, i) => {
                  const height = (day.tokens_total / maxDailyUsage) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-t transition-colors cursor-pointer"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${formatNumber(day.tokens_total)} tokens`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>30 dias atrás</span>
                <span>Hoje</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">Nenhum uso registrado ainda</p>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">⚡ Planos Disponíveis</h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan?.name === plan.name;
            return (
              <div 
                key={plan.id}
                className={`border rounded-xl p-4 ${isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{plan.display_name}</h4>
                  {isCurrentPlan && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Atual</span>
                  )}
                </div>
                <p className="text-2xl font-bold mb-3">
                  {formatPrice(plan.price_cents)}
                  <span className="text-sm font-normal text-gray-500">/mês</span>
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>⚡ {formatNumber(plan.monthly_tokens)} tokens</li>
                  <li>💬 {plan.monthly_conversations} conversas</li>
                  <li>🤖 {plan.max_agents} agente(s)</li>
                </ul>
                {!isCurrentPlan && (
                  <button className="w-full py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium">
                    Selecionar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
