import './ErrorDisplay.css'

interface ErrorDisplayProps {
  error: string
  language: 'javascript' | 'python'
}

export default function ErrorDisplay({ error, language }: ErrorDisplayProps) {
  // Extraer información del error para mejor visualización
  const parseError = (errorText: string, lang: 'javascript' | 'python') => {
    if (lang === 'python') {
      // Formato típico: "Error de Python: SyntaxError: invalid syntax (main.py, line 1)"
      const match = errorText.match(/(SyntaxError|NameError|TypeError|ValueError|IndentationError|AttributeError|KeyError|IndexError|ImportError|RuntimeError|ZeroDivisionError|FileNotFoundError|ModuleNotFoundError|Exception|Error):\s*(.+)/i)
      if (match) {
        return {
          type: match[1],
          message: match[2],
          fullError: errorText
        }
      }
    } else {
      // JavaScript: "Error de JavaScript: SyntaxError: Unexpected token..."
      const match = errorText.match(/(SyntaxError|ReferenceError|TypeError|RangeError|EvalError|URIError|Error):\s*(.+)/i)
      if (match) {
        return {
          type: match[1],
          message: match[2],
          fullError: errorText
        }
      }
    }
    
    return {
      type: 'Error',
      message: errorText,
      fullError: errorText
    }
  }

  const errorInfo = parseError(error, language)

  return (
    <div className="error-display">
      <div className="error-header">
        <svg className="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <div className="error-title">
          <span className="error-type">{errorInfo.type}</span>
          <span className="error-language">{language.toUpperCase()}</span>
        </div>
      </div>
      <div className="error-message">
        {errorInfo.message}
      </div>
      {errorInfo.fullError !== errorInfo.message && (
        <details className="error-details">
          <summary className="error-details-summary">Detalles técnicos</summary>
          <pre className="error-details-content">{errorInfo.fullError}</pre>
        </details>
      )}
    </div>
  )
}


