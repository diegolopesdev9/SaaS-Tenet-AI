
import React from 'react'
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<div className="p-8">SDR Agent Admin - Em desenvolvimento</div>} />
      </Routes>
    </div>
  )
}

export default App
