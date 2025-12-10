import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './SaveNotification.css'

interface SaveNotificationProps {
  show: boolean
  onHide: () => void
}

export default function SaveNotification({ show, onHide }: SaveNotificationProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleClose = () => {
    setIsVisible(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    // Wait for animation to complete before calling onHide
    setTimeout(() => {
      onHide()
    }, 300)
  }

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      // Auto-hide after 3 seconds
      timerRef.current = setTimeout(() => {
        handleClose()
      }, 3000)

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    } else {
      setIsVisible(false)
    }
  }, [show])

  if (!show) return null

  return (
    <div className={`save-notification ${isVisible ? 'visible' : ''}`}>
      <div className="save-notification-content">
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20"
          className="save-notification-icon"
        >
          <path 
            d="M20 6L9 17l-5-5" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        <span>{t('session.saved')}</span>
        <button
          className="save-notification-close"
          onClick={handleClose}
          aria-label={t('common.close')}
        >
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16"
          >
            <path 
              d="M18 6L6 18M6 6l12 12" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

