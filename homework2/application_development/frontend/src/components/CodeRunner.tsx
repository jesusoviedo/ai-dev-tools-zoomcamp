import { useCodeRunner } from '../hooks/useCodeRunner'
import type { SupportedLanguage } from './CodeEditor'
import './CodeRunner.css'

interface CodeRunnerProps {
  code: string
  language: SupportedLanguage
}

export default function CodeRunner({ code, language }: CodeRunnerProps) {
  const { runCode, output, error, isLoading, isPyodideReady, clearOutput } = useCodeRunner()

  const handleRun = async () => {
    await runCode(code, language)
  }

  const isDisabled = isLoading || (language === 'python' && !isPyodideReady)

  return (
    <div className="code-runner-container">
      <div className="code-runner-controls">
        <button
          className="run-button"
          onClick={handleRun}
          disabled={isDisabled}
          title={isDisabled ? 'Esperando que el runtime esté listo...' : 'Ejecutar código'}
        >
          {isLoading ? 'Ejecutando...' : 'Ejecutar'}
        </button>
        {(output || error) && (
          <button className="clear-button" onClick={clearOutput}>
            Limpiar
          </button>
        )}
        {language === 'python' && !isPyodideReady && !isLoading && (
          <span className="loading-indicator">Cargando Runtime de Python...</span>
        )}
      </div>
      
      {(output || error) && (
        <div className="code-runner-output">
          {error && (
            <div className="output-error">
              <div className="output-header">Error:</div>
              <pre className="output-content">{error}</pre>
            </div>
          )}
          {output && !error && (
            <div className="output-success">
              <div className="output-header">Salida:</div>
              <pre className="output-content">{output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

