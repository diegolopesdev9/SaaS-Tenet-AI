import api from './api';

const TOKEN_KEY = 'sdr_token';
const USER_KEY = 'sdr_user';

const authService = {
  login: async function(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user } = response.data;

    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    return user;
  },

  logout: function() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  },

  getToken: function() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser: function() {
    const user = localStorage.getItem(USER_KEY);
    try {
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated: function() {
    return !!this.getToken();
  },

  setupAxiosInterceptors: function() {
    const token = this.getToken();
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }
};

export default authService;