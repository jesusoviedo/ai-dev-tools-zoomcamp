import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'

describe('App', () => {
  it('should render the main heading', () => {
    render(<App />)
    const heading = screen.getByText('Editor de Código')
    expect(heading).toBeInTheDocument()
  })

  it('should render the sidebar heading', () => {
    render(<App />)
    const sidebarHeading = screen.getByText('Panel Lateral')
    expect(sidebarHeading).toBeInTheDocument()
  })

  it('should render the code editor textarea', () => {
    render(<App />)
    const textarea = screen.getByPlaceholderText('Escribe tu código aquí...')
    expect(textarea).toBeInTheDocument()
  })

  it('should render the sidebar content', () => {
    render(<App />)
    const sidebarContent = screen.getByText('Información de la sesión aparecerá aquí')
    expect(sidebarContent).toBeInTheDocument()
  })

  it('should allow typing in the code editor', async () => {
    const user = userEvent.setup()
    render(<App />)
    const textarea = screen.getByPlaceholderText('Escribe tu código aquí...') as HTMLTextAreaElement
    
    await user.type(textarea, 'print("Hello, World!")')
    
    expect(textarea.value).toBe('print("Hello, World!")')
  })

  it('should update code state when textarea changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const textarea = screen.getByPlaceholderText('Escribe tu código aquí...') as HTMLTextAreaElement
    
    const testCode = 'const x = 42;'
    await user.clear(textarea)
    await user.type(textarea, testCode)
    
    expect(textarea.value).toBe(testCode)
  })

  it('should have empty initial code value', () => {
    render(<App />)
    const textarea = screen.getByPlaceholderText('Escribe tu código aquí...') as HTMLTextAreaElement
    expect(textarea.value).toBe('')
  })
})

