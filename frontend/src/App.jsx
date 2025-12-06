
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/auth';

// Pages
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import ConversationDetail from './pages/ConversationDetail';
import AgentConfig from './pages/AgentConfig';

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

function App() {
  // Obter agencyId do usuário logado ou fallback
  const user = authService.getUser();
  const agencyId = user?.agencia_id || 'd6f20d80-9212-472d-873e-d5f610edbb54';

  useEffect(() => {
    // Configurar interceptors do axios na inicialização
    authService.setupAxiosInterceptors();
  }, []);

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
            <Layout agencyId={agencyId} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard agencyId={agencyId} />} />
        <Route path="conversas" element={<Conversations agencyId={agencyId} />} />
        <Route path="conversas/:conversationId" element={<ConversationDetail agencyId={agencyId} />} />
        <Route path="config" element={<AgentConfig agencyId={agencyId} />} />
      </Route>

      {/* Redirecionar rotas não encontradas */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
