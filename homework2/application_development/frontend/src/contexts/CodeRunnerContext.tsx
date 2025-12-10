import { createContext, useContext, ReactNode } from 'react'
import { useCodeRunner } from '../hooks/useCodeRunner'
import type { SupportedLanguage } from '../components/CodeEditor'

interface CodeRunnerContextType {
  runCode: (code: string, language: SupportedLanguage) => Promise<void>
  output: string
  error: string | null
  isLoading: boolean
  isPyodideReady: boolean
  clearOutput: () => void
}

const CodeRunnerContext = createContext<CodeRunnerContextType | undefined>(undefined)

export function CodeRunnerProvider({ children }: { children: ReactNode }) {
  const codeRunner = useCodeRunner()
  
  return (
    <CodeRunnerContext.Provider value={codeRunner}>
      {children}
    </CodeRunnerContext.Provider>
  )
}

export function useCodeRunnerContext() {
  const context = useContext(CodeRunnerContext)
  if (context === undefined) {
    throw new Error('useCodeRunnerContext must be used within a CodeRunnerProvider')
  }
  return context
}

