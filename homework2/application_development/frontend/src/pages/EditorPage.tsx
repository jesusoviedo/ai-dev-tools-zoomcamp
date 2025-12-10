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
import { throttle, debounce } from '../utils/throttle'
import { calculateDiff, applyDiff, canApplyDiff, shouldSendFullCode, type CodeDiff } from '../utils/diffUtils'
import { resolveConflict, type ConflictInfo } from '../utils/conflictResolver'
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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending'>('synced')
  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number } | null>(null)
  const [conflictNotification, setConflictNotification] = useState<string | null>(null)
  const isLocalChangeRef = useRef(false)
  const pendingLocalDiffRef = useRef<CodeDiff | null>(null)
  const pendingLanguageChangeRef = useRef<SupportedLanguage | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedCodeRef = useRef<string>('')
  const pendingCodeChangeRef = useRef<string | null>(null)
  const codeChangeThrottleRef = useRef<ReturnType<typeof throttle> | null>(null)
  const cursorThrottleRef = useRef<ReturnType<typeof throttle> | null>(null)
  const previousCodeRef = useRef<string>('')

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'code_change') {
      // Only update if change came from another user
      if (!isLocalChangeRef.current) {
        // Check for conflicts with pending local changes
        const localDiff = pendingLocalDiffRef.current
        let remoteDiff: CodeDiff | null = null
        
        // Try to apply diff if available
        if (message.from_pos !== undefined && message.to_pos !== undefined && message.insert !== undefined) {
          remoteDiff = {
            from: message.from_pos,
            to: message.to_pos,
            insert: message.insert,
            deleteLength: message.delete_length
          }
          
          // Resolve conflicts if there's a pending local change
          if (localDiff) {
            const conflictInfo = resolveConflict(localDiff, remoteDiff)
            
            if (conflictInfo.hasConflict && !conflictInfo.canResolve) {
              // Show conflict notification
              setConflictNotification(conflictInfo.message || 'Conflicto detectado. Se aplicará el cambio remoto.')
              setTimeout(() => setConflictNotification(null), 5000)
              
              // Apply remote change (Last-Write-Wins)
              if (canApplyDiff(code, remoteDiff)) {
                try {
                  const newCode = applyDiff(code, remoteDiff)
                  setCode(newCode)
                  previousCodeRef.current = newCode
                  pendingLocalDiffRef.current = null
                } catch (error) {
                  console.error('Error applying diff:', error)
                  if (message.code) {
                    setCode(message.code)
                    previousCodeRef.current = message.code
                  }
                }
              } else if (message.code) {
                setCode(message.code)
                previousCodeRef.current = message.code
              }
              return
            } else if (conflictInfo.resolvedDiff) {
              // Conflict resolved, use transformed diff
              remoteDiff = conflictInfo.resolvedDiff
            }
          }
          
          // Apply diff
          if (canApplyDiff(code, remoteDiff)) {
            try {
              const newCode = applyDiff(code, remoteDiff)
              setCode(newCode)
              previousCodeRef.current = newCode
              pendingLocalDiffRef.current = null
            } catch (error) {
              console.error('Error applying diff, falling back to full code:', error)
              if (message.code) {
                setCode(message.code)
                previousCodeRef.current = message.code
              }
            }
          } else if (message.code) {
            setCode(message.code)
            previousCodeRef.current = message.code
          }
        } else if (message.code !== undefined) {
          // No diff available, use full code
          setCode(message.code)
          previousCodeRef.current = message.code
          pendingLocalDiffRef.current = null
        }
      }
      isLocalChangeRef.current = false
    } else if (message.type === 'cursor_change') {
      // Handle remote cursor changes (will be implemented in cursor visualization)
      // For now, just log it
      console.log('Remote cursor change:', message)
    } else if (message.type === 'user_joined') {
      setActiveUsers(prev => prev + 1)
    } else if (message.type === 'user_left') {
      setActiveUsers(prev => Math.max(1, prev - 1)) // Minimum 1 (current user)
    }
  }, [code])

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
          const initialCode = session.initial_code || ''
          setCode(initialCode)
          lastSavedCodeRef.current = initialCode
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

  // Send code changes to WebSocket with throttling and debouncing
  const handleCodeChange = (newCode: string) => {
    isLocalChangeRef.current = true
    setCode(newCode)
    
    // Calculate diff between previous and new code
    const previousCode = previousCodeRef.current || code
    const diff = calculateDiff(previousCode, newCode)
    
    // Store pending change
    pendingCodeChangeRef.current = newCode
    
    // Use debouncing for large changes (> 100 characters)
    const changeSize = Math.abs(newCode.length - (previousCode.length || 0))
    const isLargeChange = changeSize > 100
    
    if (currentSession?.room_id && isConnected && codeChangeThrottleRef.current) {
      setSyncStatus('pending')
      
      if (isLargeChange) {
        // Debounce large changes (like paste operations)
        // Clear existing timer
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current)
        }
        
        // Set debounced send
        autoSaveTimerRef.current = setTimeout(() => {
          if (pendingCodeChangeRef.current && codeChangeThrottleRef.current) {
            const finalDiff = calculateDiff(previousCodeRef.current || previousCode, pendingCodeChangeRef.current)
            codeChangeThrottleRef.current(pendingCodeChangeRef.current, finalDiff || undefined)
            previousCodeRef.current = pendingCodeChangeRef.current
            pendingCodeChangeRef.current = null
          }
        }, 300) // 300ms debounce for large changes
      } else {
        // Throttle small changes with diff
        if (diff) {
          pendingLocalDiffRef.current = diff
        }
        codeChangeThrottleRef.current(newCode, diff || undefined)
        previousCodeRef.current = newCode
      }
    } else {
      // Update previous code even if not connected
      previousCodeRef.current = newCode
    }
    
    // Reset auto-save timer on code change
    if (autoSaveTimerRef.current && !isLargeChange) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    // Set auto-save timer for 2 minutes of inactivity
    if (currentSession && !isLargeChange) {
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
    const initialCode = session.initial_code || ''
    setCode(initialCode)
    lastSavedCodeRef.current = initialCode
    if (session.language) {
      setLanguage(session.language as SupportedLanguage)
    }
  }

  const handleLeaveSession = () => {
    // Clear session state
    setCurrentSession(null)
    setIsSessionCreator(false)
    setCode('')
    setLanguage('')
    lastSavedCodeRef.current = ''
    // Remove session ID from localStorage
    localStorage.removeItem('createdSessionId')
    // Navigate to home page
    window.history.pushState({}, '', '/')
    // Reload to reset state completely
    window.location.reload()
  }

  // Initialize throttles when session is connected
  useEffect(() => {
    if (currentSession?.room_id && isConnected && sendMessage) {
      // Initialize code change throttle
      codeChangeThrottleRef.current = throttle((code: string, diff?: CodeDiff) => {
        if (diff) {
          sendMessage({
            type: 'code_change',
            code: code,
            from_pos: diff.from,
            to_pos: diff.to,
            insert: diff.insert,
            delete_length: diff.deleteLength
          })
        } else {
          sendMessage({
            type: 'code_change',
            code: code
          })
        }
        setSyncStatus('synced')
      }, 100) // Throttle to 100ms

      // Initialize cursor throttle
      cursorThrottleRef.current = throttle((line: number, column: number) => {
        sendMessage({
          type: 'cursor_change',
          line: line,
          column: column
        })
      }, 200) // Throttle to 200ms
    } else {
      // Clean up throttles when disconnected
      codeChangeThrottleRef.current = null
      cursorThrottleRef.current = null
    }
  }, [currentSession?.room_id, isConnected, sendMessage])

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
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Toggle sidebar clicked')
                setIsSidebarCollapsed(!isSidebarCollapsed)
              }}
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
          <CodeRunner 
            code={code} 
            language={language} 
            onExecutionSuccess={handleExecutionSuccess}
            onSave={currentSession ? saveCode : undefined}
            isSaving={isSaving}
            canSave={currentSession !== null && code !== lastSavedCodeRef.current && code !== ''}
          />
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
                      {currentSession.expires_at && (
                        <div className="info-item">
                          <span className="info-label">{t('session.expiresAt')}</span>
                          <span className="info-value">
                            {new Date(currentSession.expires_at).toLocaleString()}
                          </span>
                        </div>
                      )}
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
      
      {conflictNotification && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#ff6b6b',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          maxWidth: '300px',
          fontSize: '14px'
        }}>
          {conflictNotification}
        </div>
      )}
    </div>
  )
}

