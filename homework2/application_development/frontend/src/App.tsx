import { useState } from 'react'
import './App.css'

function App() {
  const [code, setCode] = useState('')

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="editor-section">
          <h1>Editor de Código</h1>
          <textarea
            className="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Escribe tu código aquí..."
          />
        </div>
        <div className="sidebar">
          <h2>Panel Lateral</h2>
          <div className="sidebar-content">
            <p>Información de la sesión aparecerá aquí</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

