import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useCodeRunnerContext } from '../contexts/CodeRunnerContext'
import type { SupportedLanguage } from './CodeEditor'
import './CodeRunner.css'

interface CodeRunnerActionsProps {
  code: string
  language: SupportedLanguage
  onSave?: () => void
  isSaving?: boolean
  canSave?: boolean
  onExecutionSuccess?: () => void
  onRunClick?: () => void
}

export default function CodeRunnerActions({ 
  code, 
  language, 
  onSave, 
  isSaving = false, 
  canSave = false,
  onExecutionSuccess
}: CodeRunnerActionsProps) {
  const { t } = useTranslation()
  const { runCode, output, error, isLoading, isPyodideReady, clearOutput } = useCodeRunnerContext()
  const prevOutputRef = useRef<string>('')
  const prevErrorRef = useRef<string | null>(null)

  // Detect successful execution (output changed and no error)
  useEffect(() => {
    if (output !== prevOutputRef.current && !error && output.trim() !== '' && !isLoading) {
      // Execution was successful
      if (onExecutionSuccess) {
        onExecutionSuccess()
      }
    }
    prevOutputRef.current = output
    prevErrorRef.current = error
  }, [output, error, isLoading, onExecutionSuccess])

  const handleRun = async () => {
    // Validar que haya un lenguaje seleccionado
    if (!language || language === '') {
      return
    }

    // Validar que haya código
    if (!code || !code.trim()) {
      return
    }

    await runCode(code, language)
  }

  const isDisabled = isLoading || !language || language === '' || (language === 'python' && !isPyodideReady)

  return (
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
      {onSave && (
        <button
          className="save-button"
          onClick={onSave}
          disabled={isSaving || !canSave}
          title={!canSave ? t('session.saved') : t('session.save')}
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
      )}
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
  )
}

