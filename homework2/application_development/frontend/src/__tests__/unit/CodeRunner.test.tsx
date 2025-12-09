import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodeRunner from '../../components/CodeRunner'

// Mock del hook useCodeRunner
vi.mock('../../hooks/useCodeRunner', () => ({
  useCodeRunner: vi.fn(),
}))

import { useCodeRunner } from '../../hooks/useCodeRunner'

describe('CodeRunner', () => {
  const mockUseCodeRunner = vi.mocked(useCodeRunner)
  const defaultMockReturn = {
    runCode: vi.fn().mockResolvedValue(undefined),
    output: '',
    error: null,
    isLoading: false,
    isPyodideReady: true,
    clearOutput: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCodeRunner.mockReturnValue({ ...defaultMockReturn })
  })

  it('should render run button', () => {
    render(<CodeRunner code="console.log('test')" language="javascript" />)
    
    const runButton = screen.getByRole('button', { name: /ejecutar/i })
    expect(runButton).toBeInTheDocument()
  })

  it('should render run button with correct text', () => {
    render(<CodeRunner code="print('test')" language="python" />)
    
    const runButton = screen.getByRole('button', { name: /ejecutar/i })
    expect(runButton).toHaveTextContent('Ejecutar')
  })

  it('should show loading state when executing', () => {
    mockUseCodeRunner.mockReturnValue({
      ...defaultMockReturn,
      isLoading: true,
    })

    render(<CodeRunner code="console.log('test')" language="javascript" />)
    
    const runButton = screen.getByRole('button')
    expect(runButton).toHaveTextContent('Ejecutando...')
    expect(runButton).toBeDisabled()
  })

  it('should show output when code execution succeeds', () => {
    mockUseCodeRunner.mockReturnValue({
      ...defaultMockReturn,
      output: 'Hello, World!',
    })

    render(<CodeRunner code="print('Hello, World!')" language="python" />)
    
    expect(screen.getByText('Salida')).toBeInTheDocument()
    expect(screen.getByText('Hello, World!')).toBeInTheDocument()
  })

  it('should show error when code execution fails', () => {
    mockUseCodeRunner.mockReturnValue({
      ...defaultMockReturn,
      error: 'SyntaxError: invalid syntax',
    })

    render(<CodeRunner code="invalid python code" language="python" />)
    
    expect(screen.getByText('Error de Ejecución')).toBeInTheDocument()
    // Ahora hay múltiples elementos con SyntaxError (tipo y mensaje), verificamos que existe
    expect(screen.getAllByText(/SyntaxError/i).length).toBeGreaterThan(0)
  })

  it('should show clear button when there is output', () => {
    mockUseCodeRunner.mockReturnValue({
      ...defaultMockReturn,
      output: 'test output',
    })

    render(<CodeRunner code="console.log('test')" language="javascript" />)
    
    const clearButton = screen.getByText('Limpiar')
    expect(clearButton).toBeInTheDocument()
  })

  it('should show clear button when there is error', () => {
    mockUseCodeRunner.mockReturnValue({
      ...defaultMockReturn,
      error: 'Some error',
    })

    render(<CodeRunner code="invalid code" language="javascript" />)
    
    const clearButton = screen.getByText('Limpiar')
    expect(clearButton).toBeInTheDocument()
  })

  it('should not show clear button when there is no output or error', () => {
    render(<CodeRunner code="" language="javascript" />)
    
    const clearButton = screen.queryByText('Limpiar')
    expect(clearButton).not.toBeInTheDocument()
  })

  it('should show loading indicator for Python when Pyodide is not ready', () => {
    mockUseCodeRunner.mockReturnValue({
      ...defaultMockReturn,
      isPyodideReady: false,
    })

    render(<CodeRunner code="print('test')" language="python" />)
    
    expect(screen.getByText(/cargando runtime de python/i)).toBeInTheDocument()
  })

  it('should disable run button when Pyodide is not ready for Python', () => {
    mockUseCodeRunner.mockReturnValue({
      ...defaultMockReturn,
      isPyodideReady: false,
    })

    render(<CodeRunner code="print('test')" language="python" />)
    
    const runButton = screen.getByRole('button', { name: /ejecutar/i })
    expect(runButton).toBeDisabled()
  })

  it('should call runCode when run button is clicked', async () => {
    const mockRunCode = vi.fn().mockResolvedValue(undefined)
    mockUseCodeRunner.mockReturnValue({
      ...defaultMockReturn,
      runCode: mockRunCode,
    })

    const user = userEvent.setup()
    render(<CodeRunner code="console.log('test')" language="javascript" />)
    
    const runButton = screen.getByRole('button', { name: /ejecutar/i })
    await user.click(runButton)
    
    expect(mockRunCode).toHaveBeenCalledWith("console.log('test')", 'javascript')
  })

  it('should call clearOutput when clear button is clicked', async () => {
    const mockClearOutput = vi.fn()
    mockUseCodeRunner.mockReturnValue({
      ...defaultMockReturn,
      output: 'test output',
      clearOutput: mockClearOutput,
    })

    const user = userEvent.setup()
    render(<CodeRunner code="console.log('test')" language="javascript" />)
    
    const clearButton = screen.getByText('Limpiar')
    await user.click(clearButton)
    
    expect(mockClearOutput).toHaveBeenCalled()
  })
})
