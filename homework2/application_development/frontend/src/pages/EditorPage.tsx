import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import CodeEditor, { SupportedLanguage } from '../components/CodeEditor'
import CodeRunner from '../components/CodeRunner'
import CollapsiblePanel from '../components/CollapsiblePanel'
import SessionManager from '../components/SessionManager'
import AlertDialog from '../components/AlertDialog'
import SaveNotification from '../components/SaveNotification'
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
  const [showSaveNotification, setShowSaveNotification] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isLocalChangeRef = useRef(false)
  const pendingLanguageChangeRef = useRef<SupportedLanguage | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedCodeRef = useRef<string>('')

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
  const { isConnected, sendMessage } = useWebSocket(
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

  // Save code function
  const saveCode = useCallback(async () => {
    if (!currentSession || isSaving) return
    
    // Don't save if code hasn't changed
    if (code === lastSavedCodeRef.current) return
    
    setIsSaving(true)
    try {
      await sessionService.saveCode(currentSession.session_id, code)
      lastSavedCodeRef.current = code
      setShowSaveNotification(true)
    } catch (error) {
      console.error('Error saving code:', error)
      // Could show error notification here
    } finally {
      setIsSaving(false)
    }
  }, [currentSession, code, isSaving])

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
    
    // Reset auto-save timer on code change
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    // Set auto-save timer for 2 minutes of inactivity
    if (currentSession) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveCode()
      }, 2 * 60 * 1000) // 2 minutes
    }
  }

  // Handle successful code execution (called from CodeRunner)
  const handleExecutionSuccess = useCallback(() => {
    if (currentSession) {
      saveCode()
    }
  }, [currentSession, saveCode])

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
      lastSavedCodeRef.current = session.initial_code
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
      lastSavedCodeRef.current = session.initial_code
    }
    if (session.language) {
      setLanguage(session.language as SupportedLanguage)
    }
  }

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // Reset last saved code when session changes
  useEffect(() => {
    if (currentSession && code) {
      lastSavedCodeRef.current = code
    }
  }, [currentSession?.session_id])

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
            <h2>{t('header.description')}</h2>
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
          <CodeEditor 
            value={code} 
            onChange={handleCodeChange}
            language={language}
            onLanguageChange={handleLanguageChange}
            isLanguageLocked={currentSession !== null && !isSessionCreator}
            onLanguageChangeAttempt={handleLanguageChangeAttempt}
          />
          <CodeRunner code={code} language={language} onExecutionSuccess={handleExecutionSuccess} />
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
              {!currentSession ? (
                <CollapsiblePanel title={t('session.create')} icon={
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                }>
                  <SessionManager
                    onSessionCreated={handleSessionCreated}
                    onSessionLoaded={handleSessionLoaded}
                    currentSessionId={null}
                    currentLanguage={language}
                    isSessionCreator={isSessionCreator}
                    showInSidebar={true}
                  />
                </CollapsiblePanel>
              ) : (
                <>
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
                  <CollapsiblePanel title={t('session.save')} icon={
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  }>
                    <div style={{ padding: '12px' }}>
                      <button
                        onClick={saveCode}
                        disabled={isSaving || code === lastSavedCodeRef.current}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          backgroundColor: isSaving || code === lastSavedCodeRef.current ? '#3e3e3e' : '#007acc',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: isSaving || code === lastSavedCodeRef.current ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSaving && code !== lastSavedCodeRef.current) {
                            e.currentTarget.style.backgroundColor = '#005a9e'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSaving && code !== lastSavedCodeRef.current) {
                            e.currentTarget.style.backgroundColor = '#007acc'
                          }
                        }}
                      >
                        {isSaving ? (
                          <>
                            <svg className="button-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416" strokeLinecap="round">
                                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                              </circle>
                            </svg>
                            {t('session.saving')}
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {t('session.save')}
                          </>
                        )}
                      </button>
                      {code === lastSavedCodeRef.current && code !== '' && (
                        <p style={{ marginTop: '8px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
                          {t('session.saved')}
                        </p>
                      )}
                    </div>
                  </CollapsiblePanel>
                </>
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
      
      <SaveNotification 
        show={showSaveNotification}
        onHide={() => setShowSaveNotification(false)}
      />
    </div>
  )
}

