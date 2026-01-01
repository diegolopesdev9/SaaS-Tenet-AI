
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function TokenUsage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await api.get('/billing/usage');
      setUsage(response.data);
    } catch (error) {
      console.error('Erro ao buscar uso:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#2D2D2D] rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-white/10 rounded w-full"></div>
      </div>
    );
  }

  if (!usage || usage.error) {
    return null;
  }

  const getColor = () => {
    if (usage.percentage_used >= 100) return 'red';
    if (usage.percentage_used >= 80) return 'yellow';
    return 'green';
  };

  const color = getColor();
  const colorClasses = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500'
  };
  const textColorClasses = {
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600'
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toString();
  };

  return (
    <div className="bg-[#2D2D2D] rounded-xl p-6 shadow-sm border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Uso de Tokens
        </h3>
        <span className="text-sm text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded">
          {usage.plan_name}
        </span>
      </div>
      
      {/* Barra de progresso */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-300 font-medium">
            {formatNumber(usage.tokens_used)} usados
          </span>
          <span className="text-gray-500">
            {formatNumber(usage.tokens_limit)} limite
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${colorClasses[color]}`}
            style={{ width: `${Math.min(usage.percentage_used, 100)}%` }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${textColorClasses[color]}`}>
          {usage.percentage_used.toFixed(1)}% utilizado
        </span>
        
        {usage.is_over_limit && (
          <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
            ⚠️ Limite excedido
          </span>
        )}
      </div>

      {/* Conversas */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between text-sm text-gray-400">
          <span>💬 Conversas</span>
          <span className="text-white">{usage.conversations_used}/{usage.conversations_limit} conversas</span>
        </div>
      </div>

      {/* Tokens restantes */}
      <div className="mt-3 text-sm text-gray-400">
        {usage.tokens_remaining > 0 
          ? `📈 ${formatNumber(usage.tokens_remaining)} tokens restantes`
          : '⚠️ Usando tokens excedentes'
        }
      </div>
    </div>
  );
}
