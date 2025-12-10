import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './SaveNotification.css'

interface SaveNotificationProps {
  show: boolean
  onHide: () => void
}

export default function SaveNotification({ show, onHide }: SaveNotificationProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
        // Wait for animation to complete before calling onHide
        setTimeout(() => {
          onHide()
        }, 300)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [show, onHide])

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
      </div>
    </div>
  )
}

