
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
    red: 'bg-[#1A1A1A] border-white/10',
    yellow: 'bg-[#1A1A1A] border-white/10',
    green: 'bg-[#1A1A1A] border-white/10'
  };
  
  const textColors = {
    red: 'text-gray-300',
    yellow: 'text-gray-300',
    green: 'text-gray-300'
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
        <span className="text-xs font-medium text-gray-300">
          <span className="text-yellow-400">⚡</span> Tokens
        </span>
        <span className="text-xs font-bold text-gray-400">
          {usage.percentage_used.toFixed(0)}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full ${barColors[color]}`}
          style={{ width: `${Math.min(usage.percentage_used, 100)}%` }}
        />
      </div>
      {usage.is_over_limit && (
        <span className="text-xs text-gray-500 mt-1 block">⚠️ Limite excedido</span>
      )}
    </button>
  );
}
