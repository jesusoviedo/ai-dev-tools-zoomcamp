import { useState, useCallback, useRef, useEffect } from 'react'
import type { SupportedLanguage } from '../components/CodeEditor'
import type { PyodideInterface } from '../types/pyodide'

interface UseCodeRunnerReturn {
  runCode: (code: string, language: SupportedLanguage) => Promise<void>
  output: string
  error: string | null
  isLoading: boolean
  isPyodideReady: boolean
  clearOutput: () => void
}

const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js'

export function useCodeRunner(): UseCodeRunnerReturn {
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPyodideReady, setIsPyodideReady] = useState(false)
  
  const pyodideRef = useRef<PyodideInterface | null>(null)
  const stdoutBufferRef = useRef<string[]>([])

  // Cargar Pyodide de forma lazy
  useEffect(() => {
    let isMounted = true

    const loadPyodide = async () => {
      try {
        // Verificar si Pyodide ya está cargado
        if (window.loadPyodide && !pyodideRef.current) {
          setIsLoading(true)
          
          const pyodide = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
          })

          if (!isMounted) return

          // Configurar captura de stdout
          pyodide.setStdout({
            batched: (text: string) => {
              if (isMounted) {
                stdoutBufferRef.current.push(text)
              }
            },
          })

          // Configurar captura de stderr
          pyodide.setStderr({
            batched: (text: string) => {
              if (isMounted) {
                setError((prev) => (prev ? prev + text : text))
              }
            },
          })

          pyodideRef.current = pyodide
          setIsPyodideReady(true)
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(`Error al cargar Pyodide: ${err instanceof Error ? err.message : 'Error desconocido'}`)
          setIsLoading(false)
        }
      }
    }

    // Cargar script de Pyodide si no está cargado
    if (!window.loadPyodide) {
      const script = document.createElement('script')
      script.src = PYODIDE_CDN_URL
      script.async = true
      script.onload = () => {
        loadPyodide()
      }
      script.onerror = () => {
        if (isMounted) {
          setError('Error al cargar el script de Pyodide desde el CDN')
          setIsLoading(false)
        }
      }
      document.head.appendChild(script)
    } else {
      loadPyodide()
    }

    return () => {
      isMounted = false
    }
  }, [])

  const runCode = useCallback(async (code: string, language: SupportedLanguage) => {
    setError(null)
    setOutput('')
    stdoutBufferRef.current = []

    if (!code.trim()) {
      setOutput('')
      return
    }

    try {
      if (language === 'python') {
        // Ejecutar código Python con Pyodide
        if (!pyodideRef.current) {
          setError('Pyodide aún no está listo. Por favor espera...')
          return
        }

        setIsLoading(true)
        
        try {
          const result = await pyodideRef.current.runPythonAsync(code)
          
          // Capturar stdout acumulado
          const stdoutText = stdoutBufferRef.current.join('')
          
          // Si hay resultado y no hay stdout, mostrar el resultado
          if (result !== undefined && result !== null && !stdoutText) {
            setOutput(String(result))
          } else if (stdoutText) {
            setOutput(stdoutText)
          } else {
            setOutput('Código ejecutado correctamente.')
          }
        } catch (pyError) {
          const errorMessage = pyError instanceof Error ? pyError.message : String(pyError)
          setError(`Error de Python: ${errorMessage}`)
        } finally {
          setIsLoading(false)
        }
      } else if (language === 'javascript') {
        // Ejecutar código JavaScript de forma segura
        setIsLoading(true)
        
        // Capturar console.log
        const originalLog = console.log
        const logs: string[] = []
        
        console.log = (...args: any[]) => {
          logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '))
        }

        try {
          // Ejecutar código con new Function() (más seguro que eval)
          const func = new Function(code)
          const result = func()

          // Si es una promesa, esperarla
          if (result instanceof Promise) {
            const asyncResult = await result
            if (asyncResult !== undefined) {
              logs.push(String(asyncResult))
            }
          } else if (result !== undefined) {
            logs.push(String(result))
          }

          // Restaurar console.log
          console.log = originalLog

          if (logs.length > 0) {
            setOutput(logs.join('\n'))
          } else {
            setOutput('Código ejecutado correctamente.')
          }
        } catch (jsError) {
          // Restaurar console.log en caso de error
          console.log = originalLog
          
          const errorMessage = jsError instanceof Error ? jsError.message : String(jsError)
          setError(`Error de JavaScript: ${errorMessage}`)
        } finally {
          setIsLoading(false)
        }
      }
    } catch (err) {
      setError(`Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`)
      setIsLoading(false)
    }
  }, [])

  const clearOutput = useCallback(() => {
    setOutput('')
    setError(null)
    stdoutBufferRef.current = []
  }, [])

  return {
    runCode,
    output,
    error,
    isLoading,
    isPyodideReady,
    clearOutput,
  }
}

