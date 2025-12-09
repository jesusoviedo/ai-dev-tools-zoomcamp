# Ejecución Segura de Código en el Navegador: WASM y Pyodide en Acción

## Cómo Ejecutar Python Directamente en el Navegador sin Comprometer la Seguridad del Servidor

Ejecutar código del usuario en el servidor es un riesgo de seguridad enorme. Un simple error de validación puede permitir que código malicioso acceda a tu base de datos, sistema de archivos o red interna. La solución moderna: ejecutar el código directamente en el navegador del usuario usando WebAssembly (WASM). Esto no solo mejora la seguridad, sino que también reduce la carga del servidor y permite ejecución instantánea sin latencia de red.

En este artículo, exploraremos cómo implementar ejecución segura de código Python en el navegador usando Pyodide, una distribución completa de Python compilada a WebAssembly. Basándonos en una aplicación real de plataforma de entrevistas de código, aprenderás cómo cargar Pyodide de forma asíncrona, capturar stdout y stderr, manejar errores de ejecución, y crear una experiencia de usuario fluida con indicadores de carga y resultados en tiempo real.

---

## Introducción

Imagina que estás construyendo una plataforma donde los usuarios pueden ejecutar código Python. La opción tradicional sería enviar el código al servidor, ejecutarlo allí, y devolver los resultados. Pero esto presenta riesgos de seguridad significativos: ¿qué pasa si el código intenta acceder a archivos del servidor? ¿O si hace llamadas de red maliciosas?

**WebAssembly (WASM)** cambia completamente este paradigma. Al ejecutar el código en el navegador del usuario, eliminas estos riesgos. Pyodide lleva esto un paso más allá: es Python completo compilado a WASM, permitiendo ejecutar código Python real con bibliotecas como NumPy y Pandas directamente en el navegador.

En este artículo, basado en una aplicación real en producción, aprenderás:

- Cómo cargar Pyodide de forma eficiente y asíncrona
- Técnicas para capturar stdout y stderr correctamente
- Manejo robusto de errores de Python
- Optimización de performance para mejorar tiempos de carga
- Soluciones a problemas comunes que encontrarás en producción

---

## Conceptos Fundamentales

### ¿Qué es WebAssembly?

WebAssembly (WASM) es un formato de código binario de bajo nivel diseñado para ejecutarse en navegadores web. A diferencia de JavaScript, WASM está diseñado para ser un objetivo de compilación para lenguajes como C, C++, Rust, y ahora Python (a través de Pyodide).

**Ventajas de WASM:**
- **Seguridad**: Ejecución en un sandbox del navegador, aislada del sistema operativo
- **Performance**: Código compilado que se ejecuta cerca de la velocidad nativa
- **Portabilidad**: El mismo código funciona en cualquier navegador moderno
- **Tamaño**: Binarios compactos que se cargan rápidamente

**Limitaciones:**
- No tiene acceso directo al sistema de archivos
- No puede hacer llamadas de red arbitrarias (solo a través de APIs del navegador)
- Limitaciones de memoria según el navegador
- Tiempo de carga inicial (Pyodide es ~10-15MB)

### Pyodide: Python en el Navegador

Pyodide es una distribución de Python científica compilada a WebAssembly. Incluye:

- **CPython completo**: El intérprete de Python estándar
- **Bibliotecas científicas**: NumPy, Pandas, Matplotlib, SciPy
- **Instalador de paquetes**: `micropip` para instalar paquetes adicionales
- **Interoperabilidad**: Llamadas bidireccionales entre Python y JavaScript

**Arquitectura:**
Pyodide compila CPython a WebAssembly usando Emscripten. Esto significa que puedes ejecutar código Python real, no una transpilación a JavaScript. Las bibliotecas científicas también están compiladas a WASM, manteniendo su performance.

### Comparación con Otras Tecnologías

- **Docker en servidor**: Requiere infraestructura, tiene riesgos de seguridad, latencia de red
- **Sandboxing en servidor**: Complejo de configurar, aún tiene riesgos
- **Transpilación a JavaScript** (Skulpt, Brython): No es Python real, limitaciones de librerías
- **Pyodide**: Python real, seguro (ejecuta en navegador), sin latencia de red

---

## Implementación Práctica

### Carga Asíncrona de Pyodide

El primer desafío es cargar Pyodide eficientemente. Pyodide es grande (~10-15MB), así que necesitamos cargarlo de forma lazy (solo cuando se necesita) y mostrar indicadores de progreso.

Aquí está la implementación completa del hook `useCodeRunner`:

```typescript
import { useState, useCallback, useRef, useEffect } from 'react'

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
          
          // Cargar Pyodide con configuración
          const pyodide = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
          })

          if (!isMounted) return

          // Configurar captura de stdout con buffer
          pyodide.setStdout({
            batched: (text: string) => {
              if (isMounted) {
                stdoutBufferRef.current.push(text)
              }
            },
          })

          // Configurar captura de stderr para errores
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
```

**Puntos clave de esta implementación:**

1. **Lazy Loading**: Pyodide solo se carga cuando el componente se monta, no al cargar la página
2. **Verificación de montaje**: Usamos `isMounted` para evitar actualizar estado después de desmontar
3. **Manejo de errores**: Capturamos errores de carga del script y de inicialización
4. **Buffer de stdout**: Usamos un array para acumular múltiples prints

### Configuración de Captura de Output

La captura de stdout y stderr es crítica. Pyodide permite configurar callbacks para ambos:

```typescript
// Configurar stdout con buffer
pyodide.setStdout({
  batched: (text: string) => {
    stdoutBufferRef.current.push(text)
  },
})

// Configurar stderr para errores
pyodide.setStderr({
  batched: (text: string) => {
    setError((prev) => (prev ? prev + text : text))
  },
})
```

**¿Por qué usar `batched`?** Pyodide puede llamar estos callbacks múltiples veces para un solo `print()`. El modo `batched` agrupa estas llamadas, pero aún necesitamos un buffer para acumularlas.

### Ejecución de Código Python

Ahora implementamos la función que ejecuta el código:

```typescript
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
      // Verificar que Pyodide esté listo
      if (!pyodideRef.current) {
        setError('Pyodide aún no está listo. Por favor espera...')
        return
      }

      setIsLoading(true)
      
      try {
        // Ejecutar código Python de forma asíncrona
        const result = await pyodideRef.current.runPythonAsync(code)
        
        // Capturar stdout acumulado
        const stdoutText = stdoutBufferRef.current.join('')
        
        // Decidir qué mostrar: resultado, stdout, o mensaje de éxito
        if (result !== undefined && result !== null && !stdoutText) {
          // Si hay resultado y no hay stdout, mostrar el resultado
          setOutput(String(result))
        } else if (stdoutText) {
          // Si hay stdout, priorizar stdout
          setOutput(stdoutText)
        } else {
          // Código ejecutado sin output
          setOutput('Código ejecutado correctamente.')
        }
      } catch (pyError) {
        // Capturar y mostrar errores de Python
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
        // Usar new Function() en lugar de eval() (más seguro)
        const func = new Function(code)
        const result = func()

        // Manejar promesas
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
```

**Puntos importantes:**

1. **`runPythonAsync` vs `runPython`**: Siempre usa `runPythonAsync` para código que puede ser asíncrono o que usa librerías asíncronas
2. **Manejo de resultados**: Priorizamos stdout sobre valores de retorno
3. **Limpieza de buffer**: Reseteamos el buffer antes de cada ejecución
4. **JavaScript seguro**: Usamos `new Function()` en lugar de `eval()` para mayor seguridad

### Componente React para la UI

Aquí está el componente completo que usa el hook:

```typescript
import { useState } from 'react'
import { useCodeRunner } from '../hooks/useCodeRunner'
import type { SupportedLanguage } from './CodeEditor'

interface CodeRunnerProps {
  code: string
  language: SupportedLanguage
}

export default function CodeRunner({ code, language }: CodeRunnerProps) {
  const { runCode, output, error, isLoading, isPyodideReady, clearOutput } = useCodeRunner()
  const [isOutputExpanded, setIsOutputExpanded] = useState(true)

  const handleRun = async () => {
    // Validaciones
    if (!language || language === '') {
      alert('Por favor selecciona un lenguaje')
      return
    }

    if (!code || !code.trim()) {
      alert('Por favor escribe algún código')
      return
    }

    await runCode(code, language)
    setIsOutputExpanded(true)
  }

  const isDisabled = isLoading || !language || language === '' || (language === 'python' && !isPyodideReady)

  return (
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
              <span className="spinner"></span>
              Ejecutando...
            </>
          ) : (
            <>
              ▶ Ejecutar
            </>
          )}
        </button>
        
        {(output || error) && (
          <button className="clear-button" onClick={clearOutput}>
            ✕ Limpiar
          </button>
        )}
        
        {language === 'python' && !isPyodideReady && !isLoading && (
          <span className="loading-indicator">
            <span className="spinner"></span>
            Cargando runtime de Python...
          </span>
        )}
      </div>
      
      {error && (
        <div className="error-panel">
          <h3>Error</h3>
          <pre className="error-content">{error}</pre>
        </div>
      )}
      
      {output && !error && (
        <div className="output-panel">
          <h3>Output</h3>
          <pre className="output-content">{output}</pre>
        </div>
      )}
    </div>
  )
}
```

---

## Problemas Comunes y Soluciones

### Problema 1: Pyodide No Carga (CDN Caído o Bloqueado)

**Síntoma:** El indicador de carga permanece indefinidamente o aparece un error de red.

**Causa:** El CDN está caído, hay problemas de red, o un firewall bloquea la conexión.

**Solución:** Implementar fallback a CDN alternativo y manejo de errores robusto:

```typescript
const PYODIDE_CDNS = [
  'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js',
  'https://unpkg.com/pyodide@0.24.1/pyodide.js', // Fallback
]

const loadPyodideScript = (cdnIndex: number = 0): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (cdnIndex >= PYODIDE_CDNS.length) {
      reject(new Error('Todos los CDNs fallaron'))
      return
    }

    const script = document.createElement('script')
    script.src = PYODIDE_CDNS[cdnIndex]
    script.async = true
    
    script.onload = () => resolve()
    script.onerror = () => {
      console.warn(`CDN ${cdnIndex} falló, intentando siguiente...`)
      loadPyodideScript(cdnIndex + 1)
        .then(resolve)
        .catch(reject)
    }
    
    document.head.appendChild(script)
  })
}
```

### Problema 2: Stdout No Se Captura Correctamente

**Síntoma:** Los `print()` statements no aparecen en el output.

**Causa:** El buffer no se está limpiando o se está usando `runPython` en lugar de `runPythonAsync`.

**Solución:** Usar buffer y `runPythonAsync`:

```typescript
// ANTES de ejecutar código, limpiar el buffer
stdoutBufferRef.current = []

// Ejecutar con runPythonAsync
const result = await pyodideRef.current.runPythonAsync(code)

// Después de ejecutar, leer el buffer
const stdoutText = stdoutBufferRef.current.join('')

// Mostrar stdout si existe, sino mostrar resultado
if (stdoutText) {
  setOutput(stdoutText)
} else if (result !== undefined && result !== null) {
  setOutput(String(result))
}
```

### Problema 3: Errores de Python No Se Muestran Bien

**Síntoma:** Los errores aparecen como objetos genéricos sin información útil.

**Causa:** Los errores de Python necesitan ser parseados correctamente.

**Solución:** Mejorar el manejo de errores:

```typescript
try {
  const result = await pyodideRef.current.runPythonAsync(code)
  // ... manejo de resultado ...
} catch (pyError) {
  let errorMessage = ''
  
  if (pyError instanceof Error) {
    errorMessage = pyError.message
    
    // Intentar extraer información útil del traceback
    if (pyError.stack) {
      const stackLines = pyError.stack.split('\n')
      // Buscar líneas que contengan "File" para mostrar ubicación
      const fileLines = stackLines.filter(line => line.includes('File'))
      if (fileLines.length > 0) {
        errorMessage += '\n\n' + fileLines.slice(0, 3).join('\n')
      }
    }
  } else {
    errorMessage = String(pyError)
  }
  
  setError(`Error de Python:\n${errorMessage}`)
}
```

### Problema 4: Código que Tarda Mucho en Ejecutar

**Síntoma:** La UI se congela mientras se ejecuta código pesado.

**Causa:** El código se ejecuta en el hilo principal, bloqueando la UI.

**Solución:** Usar Web Workers (avanzado) o al menos mostrar indicadores claros:

```typescript
// Mostrar indicador de carga
setIsLoading(true)

try {
  // Ejecutar código
  const result = await pyodideRef.current.runPythonAsync(code)
  // ... manejo de resultado ...
} finally {
  // Siempre ocultar indicador
  setIsLoading(false)
}
```

Para código realmente pesado, considera mover Pyodide a un Web Worker (requiere configuración adicional).

### Problema 5: Memoria que Se Acumula

**Síntoma:** Después de múltiples ejecuciones, el navegador se vuelve lento.

**Causa:** Los objetos de Python no se están liberando correctamente.

**Solución:** Limpiar referencias y forzar garbage collection:

```typescript
const runCode = useCallback(async (code: string, language: SupportedLanguage) => {
  // ... código de ejecución ...
  
  // Después de ejecutar, limpiar referencias
  if (pyodideRef.current) {
    // Limpiar variables globales si es necesario
    try {
      pyodideRef.current.runPython(`
        import gc
        gc.collect()
      `)
    } catch (e) {
      // Ignorar errores de limpieza
    }
  }
  
  // Limpiar buffer
  stdoutBufferRef.current = []
}, [])
```

### Problema 6: Librerías de Python No Disponibles

**Síntoma:** `ImportError` al intentar importar librerías.

**Causa:** No todas las librerías de Python están disponibles en Pyodide.

**Solución:** Usar `micropip` para instalar paquetes compatibles:

```typescript
// Instalar paquete antes de ejecutar código
const installPackage = async (packageName: string) => {
  if (!pyodideRef.current) {
    throw new Error('Pyodide no está listo')
  }
  
  await pyodideRef.current.loadPackage('micropip')
  await pyodideRef.current.runPythonAsync(`
    import micropip
    await micropip.install('${packageName}')
  `)
}

// Usar antes de ejecutar código que requiere el paquete
await installPackage('numpy')
await runCode(code, 'python')
```

---

## Mejores Prácticas

### 1. Optimización de Carga Inicial

**Preload Pyodide:** Si sabes que el usuario va a ejecutar código Python, puedes precargar Pyodide:

```typescript
// Preload cuando el usuario entra a la página
useEffect(() => {
  // Cargar script de Pyodide inmediatamente
  if (!window.loadPyodide) {
    const script = document.createElement('script')
    script.src = PYODIDE_CDN_URL
    script.async = true
    document.head.appendChild(script)
  }
}, [])
```

**Service Workers para Cache:** Usa service workers para cachear Pyodide después de la primera carga:

```javascript
// service-worker.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('pyodide')) {
    event.respondWith(
      caches.open('pyodide-cache').then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((response) => {
            cache.put(event.request, response.clone())
            return response
          })
        })
      })
    )
  }
})
```

### 2. Manejo de Errores Robusto

Siempre valida el código antes de ejecutarlo:

```typescript
const validateCode = (code: string, language: SupportedLanguage): string | null => {
  if (!code.trim()) {
    return 'El código no puede estar vacío'
  }
  
  if (code.length > 100000) {
    return 'El código es demasiado largo (máximo 100,000 caracteres)'
  }
  
  // Validaciones específicas por lenguaje
  if (language === 'python') {
    // Verificar imports peligrosos (si es necesario)
    const dangerousImports = ['os', 'subprocess', 'sys']
    for (const imp of dangerousImports) {
      if (code.includes(`import ${imp}`) || code.includes(`from ${imp}`)) {
        return `Importación de '${imp}' no permitida por seguridad`
      }
    }
  }
  
  return null
}

// Usar antes de ejecutar
const validationError = validateCode(code, language)
if (validationError) {
  setError(validationError)
  return
}
```

### 3. Timeouts para Prevenir Código Infinito

Implementa timeouts para prevenir que código infinito bloquee el navegador:

```typescript
const runCodeWithTimeout = async (code: string, timeoutMs: number = 10000) => {
  return Promise.race([
    pyodideRef.current!.runPythonAsync(code),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: El código tardó demasiado en ejecutarse')), timeoutMs)
    )
  ])
}

// Usar en runCode
try {
  const result = await runCodeWithTimeout(code, 10000) // 10 segundos máximo
  // ... manejo de resultado ...
} catch (error) {
  if (error.message.includes('Timeout')) {
    setError('El código tardó demasiado en ejecutarse. Por favor optimiza tu código.')
  } else {
    setError(`Error: ${error.message}`)
  }
}
```

### 4. Indicadores de Progreso Claros

Muestra claramente el estado de carga:

```typescript
{language === 'python' && !isPyodideReady && (
  <div className="loading-state">
    <div className="spinner"></div>
    <p>Cargando runtime de Python...</p>
    <p className="loading-hint">Esto puede tardar unos segundos la primera vez</p>
  </div>
)}
```

### 5. Testing de Ejecución de Código

Mockea Pyodide en tus tests:

```typescript
// useCodeRunner.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useCodeRunner } from './useCodeRunner'

// Mock de Pyodide
const mockPyodide = {
  runPythonAsync: jest.fn(),
  setStdout: jest.fn(),
  setStderr: jest.fn(),
}

global.window.loadPyodide = jest.fn().mockResolvedValue(mockPyodide)

describe('useCodeRunner', () => {
  it('should load Pyodide on mount', async () => {
    renderHook(() => useCodeRunner())
    
    await waitFor(() => {
      expect(window.loadPyodide).toHaveBeenCalled()
    })
  })
  
  it('should execute Python code', async () => {
    mockPyodide.runPythonAsync.mockResolvedValue('Hello')
    
    const { result } = renderHook(() => useCodeRunner())
    
    await waitFor(() => {
      expect(result.current.isPyodideReady).toBe(true)
    })
    
    await result.current.runCode('print("Hello")', 'python')
    
    expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith('print("Hello")')
  })
})
```

---

## Conclusión

Ejecutar código Python en el navegador con Pyodide abre posibilidades increíbles para aplicaciones web interactivas. La implementación que hemos visto está basada en una aplicación real en producción y maneja los desafíos comunes que encontrarás.

**Takeaways principales:**

1. **Seguridad**: Ejecutar código en el navegador es mucho más seguro que en el servidor
2. **Lazy Loading**: Carga Pyodide solo cuando se necesita para mejorar tiempos de carga inicial
3. **Captura de Output**: Usa buffers para capturar stdout correctamente
4. **Manejo de Errores**: Parsea y muestra errores de Python de forma amigable
5. **Optimización**: Implementa timeouts, validación y limpieza de memoria
6. **UX**: Muestra indicadores claros de carga y estado

Pyodide es una tecnología poderosa que está madurando rápidamente. Con las técnicas y soluciones presentadas aquí, puedes construir aplicaciones robustas que ejecutan código Python de forma segura y eficiente directamente en el navegador.

---

## Referencias

- [Pyodide Official Documentation](https://pyodide.org/) - Documentación oficial de Pyodide
- [WebAssembly Official Site](https://webassembly.org/) - Información sobre WebAssembly
- [Pyodide GitHub Repository](https://github.com/pyodide/pyodide) - Código fuente y ejemplos
- [MDN WebAssembly Documentation](https://developer.mozilla.org/en-US/docs/WebAssembly) - Guía de WebAssembly en MDN
- [Pyodide - Run Python in Browser](https://pyodide.com/) - Sitio oficial con ejemplos
- [Testing Pyodide Applications](https://pyodide.org/en/latest/development/testing.html) - Guía de testing
- [Pyodide Performance Optimization](https://pyodide.org/en/latest/usage/performance-optimization.html) - Optimización de performance
- [WebAssembly Security Model](https://webassembly.org/docs/security/) - Modelo de seguridad de WASM


