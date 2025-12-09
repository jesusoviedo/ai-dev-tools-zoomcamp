import { useState } from 'react'
import CodeEditor, { SupportedLanguage } from './components/CodeEditor'
import CodeRunner from './components/CodeRunner'
import './App.css'

function App() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<SupportedLanguage>('javascript')

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="editor-section">
          <h1>Editor de Código</h1>
          <CodeEditor 
            value={code} 
            onChange={setCode}
            language={language}
            onLanguageChange={setLanguage}
          />
          <CodeRunner code={code} language={language} />
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

