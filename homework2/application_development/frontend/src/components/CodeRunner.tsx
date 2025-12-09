import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCodeRunner } from '../hooks/useCodeRunner'
import type { SupportedLanguage } from './CodeEditor'
import ErrorDisplay from './ErrorDisplay'
import CollapsiblePanel from './CollapsiblePanel'
import AlertDialog from './AlertDialog'
import './CodeRunner.css'

interface CodeRunnerProps {
  code: string
  language: SupportedLanguage
}

export default function CodeRunner({ code, language }: CodeRunnerProps) {
  const { t } = useTranslation()
  const { runCode, output, error, isLoading, isPyodideReady, clearOutput } = useCodeRunner()
  const [isOutputExpanded, setIsOutputExpanded] = useState(true)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '' })

  const handleRun = async () => {
    // Validar que haya un lenguaje seleccionado
    if (!language || language === '') {
      setAlertMessage({
        title: t('alerts.noLanguage.title'),
        message: t('alerts.noLanguage.message')
      })
      setShowAlert(true)
      return
    }

    // Validar que haya código
    if (!code || !code.trim()) {
      setAlertMessage({
        title: t('alerts.emptyCode.title'),
        message: t('alerts.emptyCode.message')
      })
      setShowAlert(true)
      return
    }

    await runCode(code, language)
    setIsOutputExpanded(true)
  }

  const isDisabled = isLoading || !language || language === '' || (language === 'python' && !isPyodideReady)

  const OutputIcon = (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  const ErrorIcon = (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  const WarningIcon = (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  return (
    <>
      <div className="code-runner-container">
        <div className="code-runner-controls">
          <button
            className="run-button"
            onClick={handleRun}
            disabled={isDisabled}
            title={isDisabled ? 'Esperando que el runtime esté listo...' : 'Ejecutar código'}
          >
            {isLoading ? (
              <>
                <svg className="button-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416" strokeLinecap="round">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                  </circle>
                </svg>
                {t('codeRunner.running')}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                  <path d="M8 5v14l11-7z" fill="currentColor"/>
                </svg>
                {t('codeRunner.run')}
              </>
            )}
          </button>
          {(output || error) && (
            <button className="clear-button" onClick={clearOutput}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {t('codeRunner.clear')}
            </button>
          )}
          {language === 'python' && !isPyodideReady && !isLoading && (
            <span className="loading-indicator">
              <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416" strokeLinecap="round">
                  <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                </circle>
              </svg>
              {t('codeRunner.loadingRuntime')}
            </span>
          )}
        </div>
        
        {error && (
          <CollapsiblePanel 
            title={t('codeRunner.error')} 
            defaultCollapsed={false}
            icon={ErrorIcon}
          >
            <ErrorDisplay error={error} language={language} />
          </CollapsiblePanel>
        )}
        
        {output && !error && (
          <CollapsiblePanel 
            title={t('codeRunner.output')} 
            defaultCollapsed={!isOutputExpanded}
            icon={OutputIcon}
          >
            <div className="output-success-content">
              <pre className="output-content">{output}</pre>
            </div>
          </CollapsiblePanel>
        )}
      </div>

      <AlertDialog
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertMessage.title}
        message={alertMessage.message}
        type="warning"
        icon={WarningIcon}
      />
    </>
  )
}

