import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './AlertDialog.css'

interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  message: string
  type?: 'info' | 'warning' | 'error'
  icon?: React.ReactNode
  confirmText?: string
  showCancel?: boolean
}

export default function AlertDialog({ 
  isOpen, 
  onClose,
  onConfirm,
  title, 
  message, 
  type = 'info',
  icon,
  confirmText,
  showCancel = false
}: AlertDialogProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const defaultIcon = icon || (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  return (
    <div className="alert-dialog-overlay" onClick={onClose}>
      <div 
        className={`alert-dialog ${type}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="alert-dialog-header">
          <div className="alert-dialog-icon">
            {defaultIcon}
          </div>
          <h3 className="alert-dialog-title">{title}</h3>
          <button 
            className="alert-dialog-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="alert-dialog-body">
          <p>{message}</p>
        </div>
        <div className="alert-dialog-footer">
          {showCancel && (
            <button className="alert-dialog-button cancel" onClick={onClose}>
              {t('common.cancel')}
            </button>
          )}
          {onConfirm ? (
            <button className="alert-dialog-button confirm" onClick={onConfirm}>
              {confirmText || t('common.confirm')}
            </button>
          ) : (
            <button className="alert-dialog-button" onClick={onClose}>
              {t('common.understood')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

