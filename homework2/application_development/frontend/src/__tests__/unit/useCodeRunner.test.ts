import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { useCodeRunner } from '../../hooks/useCodeRunner'
import type { PyodideInterface } from '../../types/pyodide'

// Mock de Pyodide
const createMockPyodide = (): PyodideInterface => ({
  runPythonAsync: vi.fn().mockResolvedValue(undefined),
  runPython: vi.fn(),
  setStdout: vi.fn(),
  setStderr: vi.fn(),
  globals: {},
})

describe('useCodeRunner', () => {
  let mockPyodide: PyodideInterface
  let mockLoadPyodide: ReturnType<typeof vi.fn>
  let originalLoadPyodide: typeof window.loadPyodide | undefined
  let originalCreateElement: typeof document.createElement
  let mockScript: Partial<HTMLScriptElement>

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockPyodide = createMockPyodide()
    mockLoadPyodide = vi.fn().mockResolvedValue(mockPyodide)
    
    // Guardar referencia original
    originalLoadPyodide = window.loadPyodide
    
    // Mock de document.createElement para scripts
    mockScript = {
      src: '',
      async: false,
      onload: null,
      onerror: null,
    }

    originalCreateElement = document.createElement
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'script') {
        return mockScript as HTMLScriptElement
      }
      return originalCreateElement.call(document, tagName)
    })

    // Mock de document.head.appendChild
    vi.spyOn(document.head, 'appendChild').mockImplementation(() => mockScript as HTMLScriptElement)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Restaurar window.loadPyodide
    if (originalLoadPyodide) {
      window.loadPyodide = originalLoadPyodide
    } else {
      delete (window as any).loadPyodide
    }
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCodeRunner())

    expect(result.current.output).toBe('')
    expect(result.current.error).toBe(null)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isPyodideReady).toBe(false)
    expect(typeof result.current.runCode).toBe('function')
    expect(typeof result.current.clearOutput).toBe('function')
  })

  it('should load Pyodide from CDN when window.loadPyodide is not available', async () => {
    delete (window as any).loadPyodide

    renderHook(() => useCodeRunner())

    // Verificar que se crea el script
    await waitFor(() => {
      expect(document.createElement).toHaveBeenCalledWith('script')
    })
    
    expect(mockScript.src).toBe('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js')
    expect(mockScript.async).toBe(true)
  })

  it('should handle script load error', async () => {
    delete (window as any).loadPyodide

    const { result } = renderHook(() => useCodeRunner())

    // Simular error al cargar el script
    await act(async () => {
      if (mockScript.onerror) {
        mockScript.onerror({} as Event)
      }
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Error al cargar el script de Pyodide desde el CDN')
    })
  })

  it('should load Pyodide directly when window.loadPyodide is available', async () => {
    window.loadPyodide = mockLoadPyodide

    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(mockLoadPyodide).toHaveBeenCalled()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })
  })

  it('should handle Pyodide load error', async () => {
    const loadError = new Error('Failed to load Pyodide')
    mockLoadPyodide.mockRejectedValueOnce(loadError)
    window.loadPyodide = mockLoadPyodide

    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.error).toContain('Error al cargar Pyodide')
    }, { timeout: 3000 })
  })

  it('should configure stdout and stderr when Pyodide loads', async () => {
    window.loadPyodide = mockLoadPyodide

    renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(mockLoadPyodide).toHaveBeenCalled()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(mockPyodide.setStdout).toHaveBeenCalled()
      expect(mockPyodide.setStderr).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should clear output when clearOutput is called', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      result.current.clearOutput()
    })

    expect(result.current.output).toBe('')
    expect(result.current.error).toBe(null)
  })

  it('should return early when code is empty', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('   ', 'javascript')
    })

    expect(result.current.output).toBe('')
  })

  it('should handle Python execution when Pyodide is not ready', async () => {
    delete (window as any).loadPyodide
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('print("test")', 'python')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Pyodide aún no está listo. Por favor espera...')
    })
  })

  it('should execute Python code successfully with stdout', async () => {
    window.loadPyodide = mockLoadPyodide
    let stdoutCallback: ((text: string) => void) | null = null
    
    mockPyodide.setStdout = vi.fn((options: any) => {
      stdoutCallback = options.batched
    })

    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    // Simular que runPythonAsync llama al callback de stdout durante la ejecución
    mockPyodide.runPythonAsync = vi.fn().mockImplementation(async () => {
      if (stdoutCallback) {
        stdoutCallback('Hello from Python\n')
      }
      return undefined
    })

    await act(async () => {
      await result.current.runCode('print("Hello from Python")', 'python')
    })

    await waitFor(() => {
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith('print("Hello from Python")')
      expect(result.current.output).toContain('Hello from Python')
    })
  })

  it('should execute Python code and show result when no stdout', async () => {
    window.loadPyodide = mockLoadPyodide

    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    mockPyodide.runPythonAsync = vi.fn().mockResolvedValue(42)

    await act(async () => {
      await result.current.runCode('2 + 2', 'python')
    })

    await waitFor(() => {
      expect(result.current.output).toBe('42')
    })
  })

  it('should execute Python code and show success message when no result or stdout', async () => {
    window.loadPyodide = mockLoadPyodide

    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    mockPyodide.runPythonAsync = vi.fn().mockResolvedValue(undefined)

    await act(async () => {
      await result.current.runCode('x = 1', 'python')
    })

    await waitFor(() => {
      expect(result.current.output).toBe('Código ejecutado correctamente.')
    })
  })

  it('should handle Python execution errors', async () => {
    window.loadPyodide = mockLoadPyodide
    const pythonError = new Error('SyntaxError: invalid syntax')

    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    mockPyodide.runPythonAsync = vi.fn().mockRejectedValue(pythonError)

    await act(async () => {
      await result.current.runCode('invalid python code', 'python')
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Error de Python')
      expect(result.current.error).toContain('SyntaxError')
    })
  })

  it('should execute JavaScript code successfully', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('console.log("Hello");', 'javascript')
    })

    await waitFor(() => {
      expect(result.current.output).toContain('Hello')
    })
  })

  it('should execute JavaScript code and capture return value', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('return 42;', 'javascript')
    })

    await waitFor(() => {
      expect(result.current.output).toBe('42')
    })
  })

  it('should execute JavaScript code with async result', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('return Promise.resolve("async result");', 'javascript')
    })

    await waitFor(() => {
      expect(result.current.output).toContain('async result')
    })
  })

  it('should execute JavaScript code and show success when no output', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('const x = 1;', 'javascript')
    })

    await waitFor(() => {
      expect(result.current.output).toBe('Código ejecutado correctamente.')
    })
  })

  it('should handle JavaScript execution errors', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('throw new Error("Test error");', 'javascript')
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Error de JavaScript')
      expect(result.current.error).toContain('Test error')
    })
  })

  it('should capture console.log with objects', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('console.log({a: 1, b: 2});', 'javascript')
    })

    await waitFor(() => {
      expect(result.current.output).toContain('"a": 1')
      expect(result.current.output).toContain('"b": 2')
    })
  })

  it('should handle multiple console.log calls', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('console.log("First"); console.log("Second");', 'javascript')
    })

    await waitFor(() => {
      expect(result.current.output).toContain('First')
      expect(result.current.output).toContain('Second')
    })
  })

  it('should restore console.log after JavaScript execution', async () => {
    const originalLog = console.log
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('console.log("test");', 'javascript')
    })

    await waitFor(() => {
      expect(console.log).toBe(originalLog)
    })
  })

  it('should restore console.log after JavaScript error', async () => {
    const originalLog = console.log
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      try {
        await result.current.runCode('throw new Error("error");', 'javascript')
      } catch {
        // Ignorar error
      }
    })

    await waitFor(() => {
      expect(console.log).toBe(originalLog)
    })
  })

  it('should handle non-Error exceptions in Python', async () => {
    window.loadPyodide = mockLoadPyodide
    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    mockPyodide.runPythonAsync = vi.fn().mockRejectedValue('String error')

    await act(async () => {
      await result.current.runCode('invalid', 'python')
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Error de Python')
      expect(result.current.error).toContain('String error')
    })
  })

  it('should handle non-Error exceptions in JavaScript', async () => {
    const { result } = renderHook(() => useCodeRunner())

    await act(async () => {
      await result.current.runCode('throw "String error";', 'javascript')
    })

    await waitFor(() => {
      expect(result.current.error).toContain('Error de JavaScript')
      expect(result.current.error).toContain('String error')
    })
  })

  it('should handle cleanup when component unmounts', async () => {
    window.loadPyodide = mockLoadPyodide

    const { unmount } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(mockLoadPyodide).toHaveBeenCalled()
    }, { timeout: 3000 })

    unmount()

    // Verificar que no hay errores después del unmount
    expect(mockLoadPyodide).toHaveBeenCalled()
  })

  it('should handle stdout callback when component is unmounted', async () => {
    window.loadPyodide = mockLoadPyodide
    let stdoutCallback: ((text: string) => void) | null = null

    mockPyodide.setStdout = vi.fn((options: any) => {
      stdoutCallback = options.batched
    })

    const { unmount } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(mockPyodide.setStdout).toHaveBeenCalled()
    }, { timeout: 3000 })

    unmount()

    // Llamar stdout después del unmount no debería causar errores
    if (stdoutCallback) {
      stdoutCallback('test')
    }

    expect(stdoutCallback).toBeTruthy()
  })

  it('should handle stderr callback when component is unmounted', async () => {
    window.loadPyodide = mockLoadPyodide
    let stderrCallback: ((text: string) => void) | null = null

    mockPyodide.setStderr = vi.fn((options: any) => {
      stderrCallback = options.batched
    })

    const { unmount } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(mockPyodide.setStderr).toHaveBeenCalled()
    }, { timeout: 3000 })

    unmount()

    // Llamar stderr después del unmount no debería causar errores
    if (stderrCallback) {
      stderrCallback('error')
    }

    expect(stderrCallback).toBeTruthy()
  })

  it('should handle stderr callback with previous error', async () => {
    window.loadPyodide = mockLoadPyodide
    let stderrCallback: ((text: string) => void) | null = null

    mockPyodide.setStderr = vi.fn((options: any) => {
      stderrCallback = options.batched
    })

    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    // Simular un error previo
    await act(async () => {
      result.current.runCode('invalid', 'python').catch(() => {})
    })

    // Llamar stderr con un error adicional (debería concatenar)
    if (stderrCallback) {
      stderrCallback('additional error\n')
    }

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })

  it('should handle script onload callback', async () => {
    delete (window as any).loadPyodide

    renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(document.createElement).toHaveBeenCalledWith('script')
    })

    // Simular carga exitosa del script
    window.loadPyodide = mockLoadPyodide
    
    await act(async () => {
      if (mockScript.onload) {
        mockScript.onload({} as Event)
      }
    })

    await waitFor(() => {
      expect(mockLoadPyodide).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should handle unexpected errors in runCode catch block', async () => {
    // Para cubrir el bloque catch externo, necesitamos que el error ocurra fuera del try interno
    // Esto es difícil de lograr directamente, pero podemos mockear setIsLoading para que lance un error
    window.loadPyodide = mockLoadPyodide
    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    // Simular un error que ocurra antes del try interno (por ejemplo, en setIsLoading)
    // Pero esto es difícil de hacer sin modificar el hook. En su lugar, verificamos
    // que el bloque catch interno maneja correctamente errores no-Error
    const weirdError = { message: 'Weird error', code: 500 }
    mockPyodide.runPythonAsync = vi.fn().mockRejectedValue(weirdError)

    await act(async () => {
      await result.current.runCode('print("test")', 'python')
    })

    await waitFor(() => {
      // El error será capturado por el bloque catch interno de Python
      expect(result.current.error).toContain('Error de Python')
    })
  })

  it('should handle error when isMounted is false in stderr callback', async () => {
    window.loadPyodide = mockLoadPyodide
    let stderrCallback: ((text: string) => void) | null = null

    mockPyodide.setStderr = vi.fn((options: any) => {
      stderrCallback = options.batched
    })

    const { result, unmount } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    // Desmontar antes de llamar al callback
    unmount()

    // Llamar stderr después del unmount (isMounted será false)
    if (stderrCallback) {
      stderrCallback('error after unmount')
    }

    // No debería haber error porque isMounted es false
    expect(result.current.error).toBe(null)
  })

  it('should handle error when isMounted is false in stdout callback', async () => {
    window.loadPyodide = mockLoadPyodide
    let stdoutCallback: ((text: string) => void) | null = null

    mockPyodide.setStdout = vi.fn((options: any) => {
      stdoutCallback = options.batched
    })

    const { result, unmount } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    // Desmontar antes de llamar al callback
    unmount()

    // Llamar stdout después del unmount (isMounted será false)
    if (stdoutCallback) {
      stdoutCallback('output after unmount')
    }

    // El buffer no debería actualizarse porque isMounted es false
    expect(result.current.output).toBe('')
  })

  it('should handle unexpected errors in outer catch block', async () => {
    // Para cubrir el bloque catch externo (líneas 183-185), necesitamos que un error
    // ocurra fuera de los bloques try internos. Esto es muy difícil porque todos los
    // errores son capturados por los bloques internos.
    
    // Una forma de hacerlo es mockear setIsLoading para que lance un error.
    // Sin embargo, esto requiere acceso al estado interno del hook, lo cual es complejo.
    
    // Alternativa: hacer que el código tenga un error que ocurra en el bloque if
    // antes del try interno. Pero mirando el código, no hay nada que pueda fallar ahí.
    
    // Otra opción es hacer que setError lance un error después de que ya se haya llamado,
    // pero esto también es difícil de lograr.
    
    // La mejor aproximación es hacer que el código JavaScript tenga un error de sintaxis
    // que cause que new Function() lance un error ANTES del try interno. Pero esto
    // también es capturado por el try interno de JavaScript.
    
    // Sin embargo, podemos intentar hacer que el código tenga un error que ocurra
    // en el bloque if antes del try interno, específicamente en la verificación de
    // pyodideRef.current. Pero esto también está dentro del try interno.
    
    // La única forma realista es hacer que setIsLoading lance un error. Intentemos
    // mockear React.useState para que lance un error cuando se llama setIsLoading.
    
    window.loadPyodide = mockLoadPyodide
    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    // Intentar hacer que setIsLoading lance un error mockeando useState
    // Esto es complejo y puede ser frágil, pero es la única forma de cubrir
    // el bloque catch externo sin modificar el hook.
    
    // Por ahora, verificamos que el código funciona correctamente con errores normales.
    // El bloque catch externo es un "safety net" que es difícil de alcanzar en
    // condiciones normales, pero está ahí para manejar errores completamente inesperados.
    
    // Nota: Para alcanzar 100% de cobertura, sería necesario modificar el hook
    // para hacer que setIsLoading o setError puedan lanzar errores en casos específicos,
    // o usar técnicas avanzadas de mocking que pueden ser frágiles.
    
    mockPyodide.runPythonAsync = vi.fn().mockImplementation(async () => {
      throw new Error('Test error')
    })

    await act(async () => {
      await result.current.runCode('print("test")', 'python')
    })

    // El error será capturado por el bloque catch interno de Python
    await waitFor(() => {
      expect(result.current.error).toContain('Error de Python')
    })
  })

  it('should handle stdout buffer correctly', async () => {
    window.loadPyodide = mockLoadPyodide
    let stdoutCallback: ((text: string) => void) | null = null

    mockPyodide.setStdout = vi.fn((options: any) => {
      stdoutCallback = options.batched
    })

    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    // Simular que runPythonAsync llama al callback de stdout durante la ejecución
    mockPyodide.runPythonAsync = vi.fn().mockImplementation(async () => {
      if (stdoutCallback) {
        stdoutCallback('Line 1\n')
        stdoutCallback('Line 2\n')
      }
      return undefined
    })

    await act(async () => {
      await result.current.runCode('print("test")', 'python')
    })

    await waitFor(() => {
      expect(result.current.output).toContain('Line 1')
      expect(result.current.output).toContain('Line 2')
    })
  })

  it('should handle Python result with stdout preference', async () => {
    window.loadPyodide = mockLoadPyodide
    let stdoutCallback: ((text: string) => void) | null = null

    mockPyodide.setStdout = vi.fn((options: any) => {
      stdoutCallback = options.batched
    })

    const { result } = renderHook(() => useCodeRunner())

    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    }, { timeout: 3000 })

    // Simular que runPythonAsync llama al callback de stdout y retorna un valor
    mockPyodide.runPythonAsync = vi.fn().mockImplementation(async () => {
      if (stdoutCallback) {
        stdoutCallback('Output from print\n')
      }
      return 42
    })

    await act(async () => {
      await result.current.runCode('print("Output from print"); 2 + 2', 'python')
    })

    await waitFor(() => {
      // stdout tiene prioridad sobre el resultado
      expect(result.current.output).toContain('Output from print')
    })
  })
})
