

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Importar componentes (serão criados depois)
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AgentConfig from './pages/AgentConfig'
import Conversations from './pages/Conversations'
import ConversationDetail from './pages/ConversationDetail'

function App() {
  // Pegar agencyId do ambiente ou usar UUID temporário
  const agencyId = import.meta.env.VITE_AGENCY_ID || 'd6f20d80-9212-472d-873e-d5f610edbb54'

  return (
    <Routes>
      <Route path="/" element={<Layout agencyId={agencyId} />}>
        <Route index element={<Dashboard agencyId={agencyId} />} />
        <Route path="config" element={<AgentConfig agencyId={agencyId} />} />
        <Route path="conversas" element={<Conversations agencyId={agencyId} />} />
        <Route path="conversas/:conversationId" element={<ConversationDetail agencyId={agencyId} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App

