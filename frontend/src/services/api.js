
import axios from 'axios';

// URL base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Criar instância do axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor de response para logar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Erro na resposta da API:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url,
      });
    } else if (error.request) {
      console.error('Erro na requisição (sem resposta):', error.request);
    } else {
      console.error('Erro ao configurar requisição:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
