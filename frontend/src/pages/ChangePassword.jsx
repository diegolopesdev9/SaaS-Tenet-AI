
import React, { useState } from 'react'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react'
import api from '../services/api'
import authService from '../services/auth'

export default function ChangePassword({ onPasswordChanged }) {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const user = authService.getUser()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Validações
    if (novaSenha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/change-password', { nova_senha: novaSenha })
      
      // Atualizar usuário no localStorage
      const currentUser = authService.getUser()
      if (currentUser) {
        currentUser.deve_alterar_senha = false
        localStorage.setItem('user', JSON.stringify(currentUser))
      }

      // Chamar callback para atualizar o App
      if (onPasswordChanged) {
        onPasswordChanged()
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Alterar Senha</h1>
            <p className="text-gray-600 mt-2">
              Olá, <span className="font-medium">{user?.nome}</span>!
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Por segurança, você precisa criar uma nova senha para acessar o sistema.
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Repita a nova senha"
                  required
                  minLength={6}
                />
              </div>
              {confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="mt-1 text-sm text-red-500">As senhas não coincidem</p>
              )}
              {confirmarSenha && novaSenha === confirmarSenha && novaSenha.length >= 6 && (
                <p className="mt-1 text-sm text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Senhas coincidem
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || novaSenha.length < 6 || novaSenha !== confirmarSenha}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Alterar Senha e Continuar
                </>
              )}
            </button>
          </form>

          {/* Dicas */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium mb-2">Dicas para uma senha segura:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Use no mínimo 6 caracteres</li>
              <li>• Combine letras, números e símbolos</li>
              <li>• Evite informações pessoais</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
