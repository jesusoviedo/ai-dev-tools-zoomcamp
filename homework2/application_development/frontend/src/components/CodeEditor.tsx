import { useState, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import './CodeEditor.css'

export type SupportedLanguage = 'javascript' | 'python'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: SupportedLanguage
}

const languageOptions: { value: SupportedLanguage; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
]

export default function CodeEditor({ value, onChange, language: initialLanguage = 'javascript' }: CodeEditorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(initialLanguage)

  const extensions = useMemo(() => {
    switch (selectedLanguage) {
      case 'javascript':
        return [javascript({ jsx: false })]
      case 'python':
        return [python()]
      default:
        return []
    }
  }, [selectedLanguage])

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as SupportedLanguage
    setSelectedLanguage(newLanguage)
  }

  return (
    <div className="code-editor-container">
      <div className="code-editor-header">
        <label htmlFor="language-selector" className="language-label">
          Lenguaje:
        </label>
        <select
          id="language-selector"
          className="language-selector"
          value={selectedLanguage}
          onChange={handleLanguageChange}
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <CodeMirror
        value={value}
        onChange={onChange}
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
        placeholder="Escribe tu código aquí..."
        className="code-mirror-editor"
      />
    </div>
  )
}

