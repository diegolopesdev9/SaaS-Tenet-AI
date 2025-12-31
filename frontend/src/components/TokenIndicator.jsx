
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function TokenIndicator() {
  const [usage, setUsage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await api.get('/billing/usage');
      setUsage(response.data);
    } catch (error) {
      console.error('Erro ao buscar uso:', error);
    }
  };

  if (!usage) return null;

  const getColor = () => {
    if (usage.percentage_used >= 100) return 'red';
    if (usage.percentage_used >= 80) return 'yellow';
    return 'green';
  };

  const color = getColor();
  
  const bgColors = {
    red: 'bg-red-100 border-red-300',
    yellow: 'bg-yellow-100 border-yellow-300',
    green: 'bg-green-100 border-green-300'
  };
  
  const textColors = {
    red: 'text-red-700',
    yellow: 'text-yellow-700',
    green: 'text-green-700'
  };
  
  const barColors = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500'
  };

  return (
    <button
      onClick={() => navigate('/billing')}
      className={`w-full p-3 rounded-lg border ${bgColors[color]} hover:opacity-80 transition-opacity text-left`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${textColors[color]}`}>
          ⚡ Tokens
        </span>
        <span className={`text-xs font-bold ${textColors[color]}`}>
          {usage.percentage_used.toFixed(0)}%
        </span>
      </div>
      <div className="w-full bg-white/50 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full ${barColors[color]}`}
          style={{ width: `${Math.min(usage.percentage_used, 100)}%` }}
        />
      </div>
      {usage.is_over_limit && (
        <span className="text-xs text-red-600 mt-1 block">⚠️ Limite excedido</span>
      )}
    </button>
  );
}
