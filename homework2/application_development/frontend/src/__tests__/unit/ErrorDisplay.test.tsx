import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorDisplay from '../../components/ErrorDisplay'

describe('ErrorDisplay', () => {
  it('should render error message', () => {
    render(<ErrorDisplay error="Test error message" language="javascript" />)
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should display JavaScript error type', () => {
    render(<ErrorDisplay error="Error de JavaScript: SyntaxError: Unexpected token" language="javascript" />)
    expect(screen.getByText('SyntaxError')).toBeInTheDocument()
    expect(screen.getByText('JAVASCRIPT')).toBeInTheDocument()
  })

  it('should display Python error type', () => {
    render(<ErrorDisplay error="Error de Python: SyntaxError: invalid syntax" language="python" />)
    expect(screen.getByText('SyntaxError')).toBeInTheDocument()
    expect(screen.getByText('PYTHON')).toBeInTheDocument()
  })

  it('should parse and display JavaScript SyntaxError', () => {
    render(<ErrorDisplay error="Error de JavaScript: SyntaxError: Unexpected token '}'" language="javascript" />)
    expect(screen.getByText('SyntaxError')).toBeInTheDocument()
    expect(screen.getAllByText(/Unexpected token/).length).toBeGreaterThan(0)
  })

  it('should parse and display JavaScript TypeError', () => {
    render(<ErrorDisplay error="Error de JavaScript: TypeError: Cannot read property 'x' of undefined" language="javascript" />)
    expect(screen.getByText('TypeError')).toBeInTheDocument()
    expect(screen.getAllByText(/Cannot read property/).length).toBeGreaterThan(0)
  })

  it('should parse and display JavaScript ReferenceError', () => {
    render(<ErrorDisplay error="Error de JavaScript: ReferenceError: x is not defined" language="javascript" />)
    expect(screen.getByText('ReferenceError')).toBeInTheDocument()
    expect(screen.getAllByText(/is not defined/).length).toBeGreaterThan(0)
  })

  it('should parse and display Python SyntaxError', () => {
    render(<ErrorDisplay error="Error de Python: SyntaxError: invalid syntax (main.py, line 1)" language="python" />)
    expect(screen.getByText('SyntaxError')).toBeInTheDocument()
    expect(screen.getAllByText(/invalid syntax/).length).toBeGreaterThan(0)
  })

  it('should parse and display Python NameError', () => {
    render(<ErrorDisplay error="Error de Python: NameError: name 'x' is not defined" language="python" />)
    expect(screen.getByText('NameError')).toBeInTheDocument()
    expect(screen.getAllByText(/is not defined/).length).toBeGreaterThan(0)
  })

  it('should parse and display Python TypeError', () => {
    render(<ErrorDisplay error="Error de Python: TypeError: unsupported operand type(s)" language="python" />)
    expect(screen.getByText('TypeError')).toBeInTheDocument()
    expect(screen.getAllByText(/unsupported operand/).length).toBeGreaterThan(0)
  })

  it('should display generic Error when error type cannot be parsed', () => {
    render(<ErrorDisplay error="Some generic error message" language="javascript" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Some generic error message')).toBeInTheDocument()
  })

  it('should show details section when full error differs from message', () => {
    render(<ErrorDisplay error="Error de JavaScript: SyntaxError: Unexpected token" language="javascript" />)
    const details = screen.queryByText('Detalles técnicos')
    expect(details).toBeInTheDocument()
  })

  it('should expand details when clicked', async () => {
    const user = userEvent.setup()
    render(<ErrorDisplay error="Error de JavaScript: SyntaxError: Unexpected token" language="javascript" />)
    
    const summary = screen.getByText('Detalles técnicos')
    await user.click(summary)
    
    // Verificar que el contenido de detalles está visible
    const detailsContent = screen.getByText(/Error de JavaScript: SyntaxError: Unexpected token/)
    expect(detailsContent).toBeInTheDocument()
  })

  it('should handle Python IndentationError', () => {
    render(<ErrorDisplay error="Error de Python: IndentationError: expected an indented block" language="python" />)
    expect(screen.getByText('IndentationError')).toBeInTheDocument()
  })

  it('should handle Python AttributeError', () => {
    render(<ErrorDisplay error="Error de Python: AttributeError: 'str' object has no attribute 'append'" language="python" />)
    expect(screen.getByText('AttributeError')).toBeInTheDocument()
  })

  it('should handle Python ValueError', () => {
    render(<ErrorDisplay error="Error de Python: ValueError: invalid literal for int()" language="python" />)
    expect(screen.getByText('ValueError')).toBeInTheDocument()
  })

  it('should handle Python ZeroDivisionError', () => {
    render(<ErrorDisplay error="Error de Python: ZeroDivisionError: division by zero" language="python" />)
    expect(screen.getByText('ZeroDivisionError')).toBeInTheDocument()
  })

  it('should handle JavaScript RangeError', () => {
    render(<ErrorDisplay error="Error de JavaScript: RangeError: Maximum call stack size exceeded" language="javascript" />)
    expect(screen.getByText('RangeError')).toBeInTheDocument()
  })

  it('should handle JavaScript EvalError', () => {
    render(<ErrorDisplay error="Error de JavaScript: EvalError: eval() not allowed" language="javascript" />)
    expect(screen.getByText('EvalError')).toBeInTheDocument()
  })

  it('should display error icon', () => {
    const { container } = render(<ErrorDisplay error="Test error" language="javascript" />)
    const icon = container.querySelector('.error-icon')
    expect(icon).toBeInTheDocument()
  })
})

