import { useState } from 'react'
import CodeEditor, { SupportedLanguage } from './components/CodeEditor'
import CodeRunner from './components/CodeRunner'
import CollapsiblePanel from './components/CollapsiblePanel'
import './App.css'

function App() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<SupportedLanguage>('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const InfoIcon = (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  const SettingsIcon = (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  return (
    <div className="app-container">
      <div className="main-content">
        <div className={`editor-section ${isSidebarCollapsed ? 'expanded' : ''}`}>
          <div className="editor-header">
            <h1>Editor de Código</h1>
            <button 
              className="sidebar-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? 'Mostrar panel lateral' : 'Ocultar panel lateral'}
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={isSidebarCollapsed ? 'flipped' : ''}
              >
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <CodeEditor 
            value={code} 
            onChange={setCode}
            language={language}
            onLanguageChange={setLanguage}
          />
          <CodeRunner code={code} language={language} />
        </div>
        {!isSidebarCollapsed && (
          <div className="sidebar">
            <div className="sidebar-header">
              <h2>Panel Lateral</h2>
              <button 
                className="sidebar-close"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Ocultar panel lateral"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="sidebar-content">
              <CollapsiblePanel title="Información de Sesión" icon={InfoIcon}>
                <div className="session-info">
                  <p>Información de la sesión aparecerá aquí</p>
                  <div className="info-item">
                    <span className="info-label">Lenguaje:</span>
                    <span className="info-value">
                      {language === 'javascript' ? 'JavaScript' : 
                       language === 'python' ? 'Python' : 
                       'No seleccionado'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Líneas de código:</span>
                    <span className="info-value">{code.split('\n').length}</span>
                  </div>
                </div>
              </CollapsiblePanel>
              <CollapsiblePanel title="Configuración" icon={SettingsIcon} defaultCollapsed={true}>
                <div className="settings-content">
                  <p>Opciones de configuración aparecerán aquí</p>
                </div>
              </CollapsiblePanel>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

