import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import CodeEditor, { SupportedLanguage } from '../components/CodeEditor'
import CodeRunner from '../components/CodeRunner'
import CollapsiblePanel from '../components/CollapsiblePanel'
import SessionManager from '../components/SessionManager'
import AlertDialog from '../components/AlertDialog'
import { sessionService, type SessionData } from '../services/sessionService'
import { useWebSocket, type WebSocketMessage } from '../hooks/useWebSocket'
import '../App.css'

interface EditorPageProps {
  sessionId?: string | null
}

export default function EditorPage({ sessionId }: EditorPageProps) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<SupportedLanguage>('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [activeUsers, setActiveUsers] = useState(1) // Start with 1 (current user)
  const [isSessionCreator, setIsSessionCreator] = useState(false)
  const [showLanguageChangeWarning, setShowLanguageChangeWarning] = useState(false)
  const isLocalChangeRef = useRef(false)
  const pendingLanguageChangeRef = useRef<SupportedLanguage | null>(null)

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'code_change') {
      // Only update if change came from another user
      if (!isLocalChangeRef.current && message.code !== undefined) {
        setCode(message.code)
      }
      isLocalChangeRef.current = false
    } else if (message.type === 'user_joined') {
      setActiveUsers(prev => prev + 1)
    } else if (message.type === 'user_left') {
      setActiveUsers(prev => Math.max(1, prev - 1)) // Minimum 1 (current user)
    }
  }, [])

  // Reset active users when session changes
  useEffect(() => {
    if (currentSession) {
      setActiveUsers(1) // Reset to 1 when new session is loaded
    }
  }, [currentSession?.session_id])

  // Connect WebSocket when session is available
  const { isConnected, sendMessage, error: wsError } = useWebSocket(
    currentSession?.room_id || null,
    handleWebSocketMessage
  )

  useEffect(() => {
    if (sessionId) {
      setIsLoadingSession(true)
      // Check if this user created the session (stored in localStorage)
      const createdSessionId = localStorage.getItem('createdSessionId')
      setIsSessionCreator(createdSessionId === sessionId)
      
      sessionService.getSession(sessionId)
        .then(session => {
          setCurrentSession(session)
          setCode(session.initial_code || '')
          setLanguage((session.language as SupportedLanguage) || '')
        })
        .catch(error => {
          console.error('Error loading session:', error)
        })
        .finally(() => {
          setIsLoadingSession(false)
        })
    } else {
      setIsSessionCreator(false)
    }
  }, [sessionId])

  // Send code changes to WebSocket
  const handleCodeChange = (newCode: string) => {
    isLocalChangeRef.current = true
    setCode(newCode)
    
    if (currentSession?.room_id && isConnected) {
      sendMessage({
        type: 'code_change',
        code: newCode,
        cursor_position: 0
      })
    }
  }

  // Handle language change attempt
  const handleLanguageChangeAttempt = () => {
    if (isSessionCreator && currentSession) {
      setShowLanguageChangeWarning(true)
    }
  }

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    if (currentSession && isSessionCreator) {
      // Store the pending language change
      pendingLanguageChangeRef.current = newLanguage
      // Show warning dialog before allowing change
      setShowLanguageChangeWarning(true)
      // Don't change language yet - wait for user confirmation
      return
    } else if (!currentSession || !isSessionCreator) {
      // Allow change if no session or not the creator
      setLanguage(newLanguage)
    }
  }

  const handleConfirmLanguageChange = () => {
    // User confirmed - apply the language change
    if (pendingLanguageChangeRef.current) {
      setLanguage(pendingLanguageChangeRef.current)
      pendingLanguageChangeRef.current = null
    }
    
    // Remove session from localStorage so it's no longer considered "created"
    if (currentSession) {
      localStorage.removeItem('createdSessionId')
      setIsSessionCreator(false)
      // Clear the session so it's treated as a new session
      setCurrentSession(null)
      // Update URL to remove session ID
      window.history.pushState({}, '', '/')
    }
    setShowLanguageChangeWarning(false)
  }

  const handleCancelLanguageChange = () => {
    // Cancel the pending language change
    pendingLanguageChangeRef.current = null
    setShowLanguageChangeWarning(false)
  }

  const handleSessionCreated = (session: SessionData) => {
    setCurrentSession(session)
    setIsSessionCreator(true)
    // Store session ID in localStorage to identify creator
    localStorage.setItem('createdSessionId', session.session_id)
    if (session.initial_code) {
      setCode(session.initial_code)
    }
    if (session.language) {
      setLanguage(session.language as SupportedLanguage)
    }
    // Update URL without reload
    window.history.pushState({}, '', `/session/${session.session_id}`)
  }

  const handleSessionLoaded = (session: SessionData) => {
    setCurrentSession(session)
    if (session.initial_code) {
      setCode(session.initial_code)
    }
    if (session.language) {
      setLanguage(session.language as SupportedLanguage)
    }
  }

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

  if (isLoadingSession) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{t('session.loading')}</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="main-content">
        <div className={`editor-section ${isSidebarCollapsed ? 'expanded' : ''}`}>
          <div className="editor-header">
            <h1>{t('header.title')}</h1>
            <button 
              className="sidebar-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={t('common.toggle')}
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
          {!currentSession && (
            <SessionManager
              onSessionCreated={handleSessionCreated}
              onSessionLoaded={handleSessionLoaded}
              currentSessionId={currentSession?.session_id || null}
              currentLanguage={language}
              isSessionCreator={isSessionCreator}
            />
          )}
          <CodeEditor 
            value={code} 
            onChange={handleCodeChange}
            language={language}
            onLanguageChange={handleLanguageChange}
            isLanguageLocked={currentSession !== null && !isSessionCreator}
            onLanguageChangeAttempt={handleLanguageChangeAttempt}
          />
          <CodeRunner code={code} language={language} />
        </div>
        {!isSidebarCollapsed && (
          <div className="sidebar">
            <div className="sidebar-header">
              <h2>{t('sidebar.title')}</h2>
              <button 
                className="sidebar-close"
                onClick={() => setIsSidebarCollapsed(true)}
                title={t('common.hide')}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="sidebar-content">
              <CollapsiblePanel title={t('sidebar.sessionInfo.title')} icon={InfoIcon}>
                <div className="session-info">
                  <p>{t('sidebar.sessionInfo.description')}</p>
                  {currentSession && (
                    <>
                      <div className="info-item">
                        <span className="info-label">{t('session.status')}</span>
                        <span className={`info-value ${isConnected ? 'connected' : 'disconnected'}`}>
                          {isConnected ? t('session.connected') : t('session.disconnected')}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('session.activeUsers')}</span>
                        <span className="info-value">{activeUsers}</span>
                      </div>
                    </>
                  )}
                  <div className="info-item">
                    <span className="info-label">{t('sidebar.sessionInfo.language')}</span>
                    <span className="info-value">
                      {language === 'javascript' ? t('language.javascript') : 
                       language === 'python' ? t('language.python') : 
                       t('language.notSelected')}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">{t('sidebar.sessionInfo.codeLines')}</span>
                    <span className="info-value">{code.split('\n').length}</span>
                  </div>
                </div>
              </CollapsiblePanel>
              <CollapsiblePanel title={t('sidebar.settings.title')} icon={SettingsIcon} defaultCollapsed={true}>
                <div className="settings-content">
                  <p>{t('sidebar.settings.description')}</p>
                </div>
              </CollapsiblePanel>
              {currentSession && (
                <CollapsiblePanel title={t('session.share')} icon={
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }>
                  <SessionManager
                    onSessionCreated={handleSessionCreated}
                    onSessionLoaded={handleSessionLoaded}
                    currentSessionId={currentSession?.session_id || null}
                    currentLanguage={language}
                    isSessionCreator={isSessionCreator}
                    showInSidebar={true}
                  />
                </CollapsiblePanel>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        isOpen={showLanguageChangeWarning}
        onClose={handleCancelLanguageChange}
        onConfirm={handleConfirmLanguageChange}
        title={t('language.changeWarning.title')}
        message={t('language.changeWarning.message')}
        type="warning"
        showCancel={true}
        confirmText={t('common.confirm')}
        icon={
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
            <path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
      />
    </div>
  )
}

