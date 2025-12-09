import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'

describe('App', () => {
  beforeEach(() => {
    // Mock para evitar errores de CodeMirror en jsdom
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    } as DOMRect)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('should render the code editor component', async () => {
    render(<App />)
    // Esperar a que CodeMirror se inicialice
    await waitFor(() => {
      const editor = screen.queryByRole('textbox')
      expect(editor).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should render the language selector', () => {
    render(<App />)
    const languageSelector = screen.getByLabelText(/lenguaje/i)
    expect(languageSelector).toBeInTheDocument()
  })

  it('should render the sidebar content', () => {
    render(<App />)
    const sidebarContent = screen.getByText('Información de la sesión aparecerá aquí')
    expect(sidebarContent).toBeInTheDocument()
  })

  it('should allow changing language', async () => {
    const user = userEvent.setup()
    render(<App />)
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    
    expect(languageSelector.value).toBe('')
    
    await user.selectOptions(languageSelector, 'python')
    expect(languageSelector.value).toBe('python')
  })

  it('should have language options available including empty', () => {
    render(<App />)
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    
    const options = Array.from(languageSelector.options).map(opt => opt.value)
    expect(options).toContain('')
    expect(options).toContain('javascript')
    expect(options).toContain('python')
  })
})
