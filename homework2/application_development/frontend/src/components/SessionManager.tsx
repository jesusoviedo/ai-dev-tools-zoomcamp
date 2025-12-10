import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { sessionService, type SessionData } from '../services/sessionService'
import './SessionManager.css'

interface SessionManagerProps {
  onSessionCreated: (session: SessionData) => void
  onSessionLoaded: (session: SessionData) => void
  currentSessionId: string | null
  currentLanguage?: string
  isSessionCreator?: boolean
  showInSidebar?: boolean
}

export default function SessionManager({ 
  onSessionCreated, 
  onSessionLoaded,
  currentSessionId,
  currentLanguage = '',
  isSessionCreator = false,
  showInSidebar = false,
  onShareClick
}: SessionManagerProps) {
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)

  const handleCreateSession = async () => {
    if (!currentLanguage || currentLanguage === '') {
      // Show alert that language must be selected first
      alert(t('session.selectLanguageFirst'))
      return
    }

    setIsCreating(true)
    try {
      const session = await sessionService.createSession({
        language: currentLanguage,
        initial_code: '',
        title: null
      })
      setCurrentSession(session)
      onSessionCreated(session)
      // Share dialog is now handled by parent component
    } catch (error) {
      console.error('Error creating session:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleShare = () => {
    if (onShareClick) {
      onShareClick()
    }
  }

  useEffect(() => {
    if (currentSessionId && !currentSession) {
      sessionService.getSession(currentSessionId)
        .then(session => {
          setCurrentSession(session)
          onSessionLoaded(session)
        })
        .catch(error => {
          console.error('Error loading session:', error)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, currentSession])

  return (
    <>
      <div className={`session-manager ${showInSidebar ? 'sidebar-mode' : ''}`}>
        {!currentSession ? (
          <>
            <button
              className="create-session-button"
              onClick={handleCreateSession}
              disabled={isCreating || !currentLanguage || currentLanguage === ''}
            >
              {isCreating ? (
                <>
                  <svg className="button-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416" strokeLinecap="round">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                  </circle>
                </svg>
                {t('session.loading')}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {t('session.create')}
              </>
            )}
          </button>
          {!currentLanguage || currentLanguage === '' ? (
            <p className="session-warning">{t('session.selectLanguageFirst')}</p>
          ) : (
            <p className="session-info-text">{t('session.languageWillBeLocked', { language: currentLanguage === 'javascript' ? t('language.javascript') : t('language.python') })}</p>
          )}
        </>
        ) : (
          <>
            <button
              className="share-session-button"
              onClick={handleShare}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('session.share')}
            </button>
            {!showInSidebar && isSessionCreator && (
              <p className="session-warning">{t('session.languageChangeWarning')}</p>
            )}
          </>
        )}
      </div>
    </>
  )
}

