
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, User, Mail, Phone, Lock, Eye, EyeOff, 
  Check, AlertCircle, Loader2, ArrowLeft, Sparkles,
  MessageSquare, Zap, Users, Headphones, Briefcase, ShoppingCart
} from 'lucide-react';
import api from '../services/api';

const TIPOS_TENET = [
  { 
    id: 'sdr', 
    nome: 'SDR', 
    descricao: 'Qualificação de leads',
    icon: Zap,
    cor: 'cyan'
  },
  { 
    id: 'suporte', 
    nome: 'Suporte', 
    descricao: 'Atendimento técnico',
    icon: Headphones,
    cor: 'green'
  },
  { 
    id: 'rh', 
    nome: 'RH', 
    descricao: 'Recursos humanos',
    icon: Users,
    cor: 'purple'
  },
  { 
    id: 'vendas', 
    nome: 'Vendas', 
    descricao: 'Atendimento comercial',
    icon: ShoppingCart,
    cor: 'orange'
  }
];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Dados, 2: Plano, 3: Tipo
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [plans, setPlans] = useState([]);
  
  const [form, setForm] = useState({
    nome_empresa: '',
    email_empresa: '',
    telefone: '',
    nome_admin: '',
    email_admin: '',
    senha: '',
    confirmar_senha: '',
    plano: '',
    tipo_tenet: '',
    aceita_termos: false
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await api.get('/register/plans');
      setPlans(response.data);
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const validateStep1 = () => {
    if (!form.nome_empresa || !form.email_empresa || !form.nome_admin || !form.email_admin) {
      setError('Preencha todos os campos obrigatórios');
      return false;
    }
    if (!form.senha || form.senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return false;
    }
    if (form.senha !== form.confirmar_senha) {
      setError('As senhas não coincidem');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.plano) {
      setError('Selecione um plano');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!form.tipo_tenet) {
      setError('Selecione o tipo de agente');
      return false;
    }
    if (!form.aceita_termos) {
      setError('Você deve aceitar os termos de uso');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError('');
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError('');
    if (!validateStep3()) return;

    setLoading(true);
    try {
      await api.post('/register/', form);
      navigate('/login', { 
        state: { message: 'Conta criada com sucesso! Faça login para continuar.' }
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (price === 0) return 'Grátis';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">
            <span className="text-white">Tenet</span>
            <span className="text-cyan-400">AI</span>
          </h1>
          <p className="text-gray-400 mt-2">Crie sua conta e comece a automatizar</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step >= s 
                  ? 'bg-cyan-500 text-black' 
                  : 'bg-[#2D2D2D] text-gray-500'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 rounded transition-all ${
                  step > s ? 'bg-cyan-500' : 'bg-[#2D2D2D]'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#2D2D2D] rounded-2xl p-8 border border-white/10">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Dados */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Dados da Conta</h2>
                <p className="text-gray-400 text-sm">Informações da empresa e do administrador</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Empresa */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nome da Empresa *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={form.nome_empresa}
                      onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })}
                      placeholder="Sua Empresa Ltda"
                      className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email da Empresa *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={form.email_empresa}
                      onChange={(e) => setForm({ ...form, email_empresa: e.target.value })}
                      placeholder="contato@empresa.com"
                      className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="tel"
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Admin */}
                <div className="md:col-span-2 pt-4 border-t border-white/10">
                  <h3 className="text-sm font-semibold text-cyan-400 mb-3">Dados do Administrador</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={form.nome_admin}
                      onChange={(e) => setForm({ ...form, nome_admin: e.target.value })}
                      placeholder="Seu nome"
                      className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email de Acesso *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={form.email_admin}
                      onChange={(e) => setForm({ ...form, email_admin: e.target.value })}
                      placeholder="seu@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Senha *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.senha}
                      onChange={(e) => setForm({ ...form, senha: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-12 py-3 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirmar_senha}
                      onChange={(e) => setForm({ ...form, confirmar_senha: e.target.value })}
                      placeholder="Repita a senha"
                      className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={nextStep}
                className="w-full py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Step 2: Plano */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Escolha seu Plano</h2>
                <p className="text-gray-400 text-sm">Selecione o plano ideal para sua empresa</p>
              </div>

              {loadingPlans ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setForm({ ...form, plano: plan.id })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        form.plano === plan.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-white/10 hover:border-white/30 bg-[#1A1A1A]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-white">{plan.nome}</h3>
                          <p className="text-2xl font-bold text-cyan-400">
                            {plan.preco === 0 ? 'Grátis' : plan.preco_formatado}
                            {plan.preco > 0 && <span className="text-sm text-gray-400">/mês</span>}
                          </p>
                        </div>
                        {form.plano === plan.id && (
                          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-black" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <MessageSquare className="w-4 h-4" />
                          <span>{plan.conversas} conversas/mês</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Zap className="w-4 h-4" />
                          <span>{formatNumber(plan.tokens)} tokens</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>{plan.agentes} agente{plan.agentes > 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {plan.id === 'trial' && (
                        <div className="mt-3 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full inline-block">
                          14 dias grátis
                        </div>
                      )}
                      {plan.id === 'professional' && (
                        <div className="mt-3 px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full inline-block">
                          Mais popular
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={prevStep}
                  className="flex-1 py-3 bg-white/10 text-gray-300 font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Voltar
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Tipo de Agente */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Tipo de Agente</h2>
                <p className="text-gray-400 text-sm">Selecione o tipo de automação para seu negócio</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {TIPOS_TENET.map((tipo) => {
                  const Icon = tipo.icon;
                  return (
                    <div
                      key={tipo.id}
                      onClick={() => setForm({ ...form, tipo_tenet: tipo.id })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        form.tipo_tenet === tipo.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-white/10 hover:border-white/30 bg-[#1A1A1A]'
                      }`}
                    >
                      <Icon className={`w-8 h-8 mb-2 ${
                        form.tipo_tenet === tipo.id ? 'text-cyan-400' : 'text-gray-500'
                      }`} />
                      <h3 className="font-bold text-white">{tipo.nome}</h3>
                      <p className="text-sm text-gray-400">{tipo.descricao}</p>
                    </div>
                  );
                })}
              </div>

              {/* Custom - Entre em contato */}
              <div className="p-4 rounded-xl border border-dashed border-white/20 bg-[#1A1A1A]/50">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-8 h-8 text-gray-500" />
                  <div>
                    <h3 className="font-bold text-gray-400">Customizado</h3>
                    <p className="text-sm text-gray-500">
                      Precisa de algo específico?{' '}
                      <a href="mailto:contato@tenetai.com.br" className="text-cyan-400 hover:underline">
                        Entre em contato
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Termos */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="termos"
                  checked={form.aceita_termos}
                  onChange={(e) => setForm({ ...form, aceita_termos: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-white/30 bg-[#1A1A1A] text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="termos" className="text-sm text-gray-400">
                  Li e aceito os{' '}
                  <a href="/termos" className="text-cyan-400 hover:underline">
                    Termos de Uso
                  </a>{' '}
                  e{' '}
                  <a href="/privacidade" className="text-cyan-400 hover:underline">
                    Política de Privacidade
                  </a>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={prevStep}
                  className="flex-1 py-3 bg-white/10 text-gray-300 font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Link para login */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
