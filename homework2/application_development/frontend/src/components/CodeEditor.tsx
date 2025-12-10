import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import type { ViewUpdate } from '@codemirror/view'
import './CodeEditor.css'

export type SupportedLanguage = 'javascript' | 'python' | ''

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  onUpdate?: (update: ViewUpdate) => void
  onCursorChange?: (line: number, column: number) => void
  language?: SupportedLanguage
  onLanguageChange?: (language: SupportedLanguage) => void
  isLanguageLocked?: boolean
  onLanguageChangeAttempt?: () => void
  hideLanguageSelector?: boolean
  headerActions?: React.ReactNode
}

export default function CodeEditor({ 
  value, 
  onChange,
  onUpdate,
  onCursorChange,
  language: initialLanguage = '',
  onLanguageChange,
  isLanguageLocked = false,
  onLanguageChangeAttempt,
  hideLanguageSelector = false,
  headerActions
}: CodeEditorProps) {
  const { t } = useTranslation()
  // La opción vacía es la predeterminada
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(initialLanguage || '')
  
  // Sincronizar con prop language si cambia externamente
  useEffect(() => {
    setSelectedLanguage(initialLanguage || '')
  }, [initialLanguage])

  // Handle update from CodeMirror
  const handleUpdate = (update: ViewUpdate) => {
    // Call onUpdate if provided
    if (onUpdate) {
      onUpdate(update)
    }
    
    // Handle cursor position changes
    if (onCursorChange && update.selectionSet) {
      try {
        const mainSelection = update.state.selection.main
        const line = update.state.doc.lineAt(mainSelection.head)
        const column = mainSelection.head - line.from
        onCursorChange(line.number, column)
      } catch (error) {
        // Ignore errors in cursor calculation
        console.debug('Error calculating cursor position:', error)
      }
    }
    
    // Call onChange if content changed
    if (update.docChanged) {
      onChange(update.state.doc.toString())
    }
  }

  const extensions = useMemo(() => {
    const baseExtensions = []
    
    // Add language-specific extensions
    switch (selectedLanguage) {
      case 'javascript':
        baseExtensions.push(javascript({ jsx: false }))
        break
      case 'python':
        baseExtensions.push(python())
        break
      default:
        break
    }
    
    return baseExtensions
  }, [selectedLanguage])

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isLanguageLocked) {
      e.preventDefault()
      // Reset select to current language
      e.target.value = selectedLanguage
      if (onLanguageChangeAttempt) {
        onLanguageChangeAttempt()
      }
      return
    }

    const newLanguage = e.target.value as SupportedLanguage
    setSelectedLanguage(newLanguage)
    onLanguageChange?.(newLanguage)
  }

  const languageOptions: { 
    value: SupportedLanguage
    label: string
  }[] = [
    { 
      value: '', 
      label: t('language.select')
    },
    { 
      value: 'javascript', 
      label: t('language.javascript')
    },
    { 
      value: 'python', 
      label: t('language.python')
    },
  ]

  return (
    <div className="code-editor-container">
      <div className="code-editor-header">
        {!hideLanguageSelector && (
          <>
            <label htmlFor="language-selector" className="language-label">
              {t('language.label')}
            </label>
            <div className="language-selector-wrapper">
              <select
                id="language-selector"
                className={`language-selector ${isLanguageLocked ? 'locked' : ''}`}
                value={selectedLanguage}
                onChange={handleLanguageChange}
                disabled={isLanguageLocked}
                required
                title={isLanguageLocked ? t('language.lockedTooltip') : ''}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {isLanguageLocked && (
                <span className="language-locked-icon" title={t('language.lockedTooltip')}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
              )}
            </div>
          </>
        )}
        {headerActions && (
          <div className="code-editor-header-actions">
            {headerActions}
          </div>
        )}
      </div>
      {isLanguageLocked && selectedLanguage && (
        <div className="language-locked-notice">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{t('language.lockedNotice', { language: languageOptions.find(opt => opt.value === selectedLanguage)?.label })}</span>
        </div>
      )}
      <CodeMirror
        value={value}
        onChange={onChange}
        onUpdate={handleUpdate}
        theme={oneDark}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: true,
        }}
        placeholder={t('codeEditor.placeholder')}
        className="code-mirror-editor"
      />
    </div>
  )
}

