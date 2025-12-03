
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<div className="p-8">SDR Agent Admin - Em desenvolvimento</div>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
