
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/auth';
import api from './services/api';

// Pages
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import ConversationDetail from './pages/ConversationDetail';
import AgentConfig from './pages/AgentConfig';
import Integrations from './pages/Integrations';
import Notifications from './pages/Notifications';
import Agencias from './pages/admin/Agencias';
import Usuarios from './pages/admin/Usuarios';
import Knowledge from './pages/Knowledge';
import Templates from './pages/admin/Templates';
import ABTests from './pages/admin/ABTests';
import WhatsAppConnection from './pages/WhatsAppConnection';

// Configurar token imediatamente ao carregar o módulo
authService.setupAxiosInterceptors();

// Componente de rota protegida
function ProtectedRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Componente de rota pública (redireciona se já logado)
function PublicRoute({ children }) {
  if (authService.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Componente que gerencia o estado de agência (só para usuários logados)
function AuthenticatedApp() {
  const [user, setUser] = useState(() => authService.getUser());
  const isSuperAdmin = user?.role === 'super_admin';
  
  const [selectedAgencyId, setSelectedAgencyId] = useState(() => {
    const saved = localStorage.getItem('selectedAgencyId');
    if (saved && isSuperAdmin) return saved;
    return user?.agencia_id || null;
  });
  
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(isSuperAdmin);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAgencies();
    }
  }, [isSuperAdmin]);

  const loadAgencies = async () => {
    try {
      const response = await api.get('/admin/agencias');
      const agenciasList = response.data || [];
      setAgencies(agenciasList);
      
      if (agenciasList.length > 0) {
        const savedId = localStorage.getItem('selectedAgencyId');
        const savedExists = agenciasList.some(a => a.id === savedId);
        
        if (!savedId || !savedExists) {
          setSelectedAgencyId(agenciasList[0].id);
          localStorage.setItem('selectedAgencyId', agenciasList[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar agências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgencyChange = (agencyId) => {
    setSelectedAgencyId(agencyId);
    localStorage.setItem('selectedAgencyId', agencyId);
  };

  const handlePasswordChanged = () => {
    // Recarregar usuário do localStorage
    const updatedUser = authService.getUser();
    setUser(updatedUser);
  };

  const agencyId = isSuperAdmin ? selectedAgencyId : user?.agencia_id;

  // Verificar se precisa alterar senha
  if (user?.deve_alterar_senha) {
    return <ChangePassword onPasswordChanged={handlePasswordChanged} />;
  }

  // Loading para super admin
  if (isSuperAdmin && (loading || !agencyId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando agências...</p>
        </div>
      </div>
    );
  }

  // Usuário comum sem agência
  if (!isSuperAdmin && !agencyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Usuário não vinculado a nenhuma agência.</p>
          <button 
            onClick={() => authService.logout()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Fazer logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      key={agencyId}
      agencyId={agencyId} 
      agencies={agencies}
      selectedAgencyId={selectedAgencyId}
      onAgencyChange={handleAgencyChange}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

function App() {
  return (
    <Routes>
      {/* Rota pública - Login */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      
      {/* Rotas protegidas */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AuthenticatedApp />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardWrapper />} />
        <Route path="conversas" element={<ConversationsWrapper />} />
        <Route path="conversas/:conversationId" element={<ConversationDetailWrapper />} />
        <Route path="config" element={<AgentConfigWrapper />} />
        <Route path="integracoes" element={<IntegrationsWrapper />} />
        <Route path="notificacoes" element={<NotificationsWrapper />} />
        <Route path="admin/agencias" element={<Agencias />} />
        <Route path="admin/usuarios" element={<Usuarios />} />
        <Route path="admin/templates" element={<TemplatesWrapper />} />
        <Route path="admin/ab-tests" element={<ABTests />} />
        <Route path="conhecimento" element={<KnowledgeWrapper />} />
        <Route path="whatsapp" element={<WhatsAppConnectionWrapper />} />
      </Route>

      {/* Redirecionar rotas não encontradas */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Wrapper components para passar agencyId via contexto do Outlet
function DashboardWrapper() {
  const agencyId = useAgencyId();
  return <Dashboard agencyId={agencyId} />;
}

function ConversationsWrapper() {
  const agencyId = useAgencyId();
  return <Conversations agencyId={agencyId} />;
}

function ConversationDetailWrapper() {
  const agencyId = useAgencyId();
  return <ConversationDetail agencyId={agencyId} />;
}

function AgentConfigWrapper() {
  const agencyId = useAgencyId();
  return <AgentConfig agencyId={agencyId} />;
}

function IntegrationsWrapper() {
  const agencyId = useAgencyId();
  return <Integrations agencyId={agencyId} />;
}

function NotificationsWrapper() {
  const agencyId = useAgencyId();
  return <Notifications agencyId={agencyId} />;
}

function KnowledgeWrapper() {
  const agencyId = useAgencyId();
  return <Knowledge agencyId={agencyId} />;
}

function TemplatesWrapper() {
  const agencyId = useAgencyId();
  return <Templates agencyId={agencyId} />;
}

function WhatsAppConnectionWrapper() {
  const agencyId = useAgencyId();
  return <WhatsAppConnection agencyId={agencyId} />;
}

// Hook para pegar agencyId do localStorage ou do usuário
function useAgencyId() {
  const user = authService.getUser();
  const isSuperAdmin = user?.role === 'super_admin';
  
  if (isSuperAdmin) {
    return localStorage.getItem('selectedAgencyId');
  }
  return user?.agencia_id;
}

export default App;
