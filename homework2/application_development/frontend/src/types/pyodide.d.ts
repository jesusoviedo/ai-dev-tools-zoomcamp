// TypeScript declarations for Pyodide when loaded from CDN
declare global {
  interface Window {
    loadPyodide: (options?: PyodideLoadOptions) => Promise<PyodideInterface>
  }
}

export interface PyodideLoadOptions {
  indexURL?: string
  fullStdLib?: boolean
  stdin?: () => string | null
  stdout?: (text: string) => void
  stderr?: (text: string) => void
}

export interface PyodideInterface {
  runPythonAsync(code: string): Promise<any>
  runPython(code: string): any
  setStdout(options: { batched: (text: string) => void }): void
  setStderr(options: { batched: (text: string) => void }): void
  globals: any
}

export {}

