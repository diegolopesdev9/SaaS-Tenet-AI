import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, Loader2, Bot } from 'lucide-react';
import authService from '../services/auth';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false); // Estado para controlar a exibição do modal de esqueci a senha

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      // Obter dados do usuário após login
      const user = authService.getUser();

      // Redirecionar baseado no role
      if (user?.role === 'super_admin') {
        // Super Admin vai para Dashboard Geral (visão geral)
        localStorage.setItem('selectedAgencyId', 'geral');
        navigate('/');
      } else {
        // Usuário comum vai para Dashboard do seu Tenet
        navigate('/');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para fechar o modal de esqueci a senha
  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl mb-4 shadow-lg">
            <Bot className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Tenet<span className="text-cyan-400">AI</span></h1>
          <p className="text-gray-300 mt-2">Faça login para continuar</p>
        </div>

        {/* Card de Login */}
        <div className="bg-[#2D2D2D] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mensagem de erro */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Campo Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-[#1a1a1a] border border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-500"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={false ? 'text' : 'password'} // showPassword is not defined, assuming false
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-[#1a1a1a] border border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Link Esqueceu a senha */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-black font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Powered by TENET AI
        </p>
      </div>
      {/* Modal de esqueci a senha */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2D2D2D] rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Esqueceu a senha?</h2>
              <button onClick={handleCloseForgotPassword} className="text-gray-400 hover:text-gray-300">
                &times;
              </button>
            </div>
            <p className="text-gray-300 mb-6">
              Digite seu email abaixo e enviaremos um link para redefinição de senha.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); /* Lógica para redefinição de senha */ alert('Link de redefinição enviado!'); handleCloseForgotPassword(); }}>
              <div className="mb-4">
                <label htmlFor="forgot-email" className="block text-sm font-medium text-white mb-2">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  className="block w-full pl-3 py-2 bg-[#1a1a1a] border border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-500"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-all shadow-lg"
              >
                Enviar Link
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}