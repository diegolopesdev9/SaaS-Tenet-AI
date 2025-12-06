
import api from './api';

const TOKEN_KEY = 'sdr_token';
const USER_KEY = 'sdr_user';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user } = response.data;
    
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    // Configurar token no axios
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    return user;
  },
  
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  },
  
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  
  isAuthenticated() {
    return !!this.getToken();
  },
  
  setupAxiosInterceptors() {
    const token = this.getToken();
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    // Interceptor para tratar 401
    api.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }
};

export default authService;
