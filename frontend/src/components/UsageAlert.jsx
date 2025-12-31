
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function UsageAlert() {
  const [usage, setUsage] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await api.get('/billing/usage');
      setUsage(response.data);
      
      const dismissedKey = `usage_alert_dismissed_${response.data.percentage_used >= 100 ? '100' : '80'}`;
      if (sessionStorage.getItem(dismissedKey)) {
        setDismissed(true);
      }
    } catch (error) {
      console.error('Erro ao buscar uso:', error);
    }
  };

  const handleDismiss = () => {
    const dismissedKey = `usage_alert_dismissed_${usage.percentage_used >= 100 ? '100' : '80'}`;
    sessionStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
  };

  if (!usage || dismissed || usage.percentage_used < 80) {
    return null;
  }

  const isOverLimit = usage.percentage_used >= 100;

  return (
    <div className={`mb-4 p-4 rounded-xl border ${isOverLimit ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${isOverLimit ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <span className="text-xl">{isOverLimit ? '⚠️' : '📊'}</span>
        </div>
        
        <div className="flex-1">
          <h4 className={`font-semibold ${isOverLimit ? 'text-red-800' : 'text-yellow-800'}`}>
            {isOverLimit 
              ? 'Limite de tokens excedido!' 
              : `Você usou ${usage.percentage_used.toFixed(0)}% dos seus tokens`
            }
          </h4>
          <p className={`text-sm mt-1 ${isOverLimit ? 'text-red-600' : 'text-yellow-700'}`}>
            {isOverLimit 
              ? 'Tokens excedentes serão cobrados. Considere fazer upgrade ou comprar um pack.'
              : 'Seu limite mensal está acabando. Garanta que não fique sem tokens!'
            }
          </p>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => navigate('/billing')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium ${isOverLimit ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
            >
              {isOverLimit ? 'Resolver agora' : 'Ver opções'}
            </button>
            <button
              onClick={handleDismiss}
              className={`px-4 py-1.5 rounded-lg text-sm ${isOverLimit ? 'text-red-600 hover:bg-red-100' : 'text-yellow-700 hover:bg-yellow-100'}`}
            >
              Lembrar depois
            </button>
          </div>
        </div>
        
        <button 
          onClick={handleDismiss}
          className={`p-1 rounded hover:bg-white/50 ${isOverLimit ? 'text-red-400' : 'text-yellow-500'}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
