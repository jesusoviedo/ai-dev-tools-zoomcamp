import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
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

  const renderApp = () => {
    return render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
  }

  it('should render the main heading', () => {
    renderApp()
    const heading = screen.getByText(/editor de código/i)
    expect(heading).toBeInTheDocument()
  })

  it('should render the sidebar heading', () => {
    renderApp()
    const sidebarHeading = screen.getByText(/panel lateral/i)
    expect(sidebarHeading).toBeInTheDocument()
  })

  it('should render the code editor component', async () => {
    renderApp()
    // Esperar a que CodeMirror se inicialice
    await waitFor(() => {
      const editor = screen.queryByRole('textbox')
      expect(editor).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should render the language selector', () => {
    renderApp()
    const languageSelector = screen.getByLabelText(/lenguaje/i)
    expect(languageSelector).toBeInTheDocument()
  })

  it('should render the sidebar content', () => {
    renderApp()
    const sidebarContent = screen.getByText(/información de la sesión aparecerá aquí/i)
    expect(sidebarContent).toBeInTheDocument()
  })

  it('should allow changing language', async () => {
    const user = userEvent.setup()
    renderApp()
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    
    expect(languageSelector.value).toBe('')
    
    await user.selectOptions(languageSelector, 'python')
    expect(languageSelector.value).toBe('python')
  })

  it('should have language options available including empty', () => {
    renderApp()
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    
    const options = Array.from(languageSelector.options).map(opt => opt.value)
    expect(options).toContain('')
    expect(options).toContain('javascript')
    expect(options).toContain('python')
  })

  it('should render EditorPage with sessionId from route', async () => {
    render(
      <MemoryRouter initialEntries={['/session/test-session-123']}>
        <App />
      </MemoryRouter>
    )
    
    // El componente debería renderizar correctamente
    // Verificamos que el editor está presente
    await waitFor(() => {
      expect(screen.getByText(/editor de código/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should render SessionRoute component when navigating to /session/:sessionId', async () => {
    // Este test verifica que SessionRoute se ejecuta correctamente
    // SessionRoute obtiene sessionId de useParams y lo pasa a EditorPage
    render(
      <MemoryRouter initialEntries={['/session/my-test-session-id']}>
        <App />
      </MemoryRouter>
    )
    
    // Verificar que EditorPage se renderiza con el sessionId de la ruta
    await waitFor(() => {
      expect(screen.getByText(/editor de código/i)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    // Verificar que el componente se renderizó correctamente
    const languageSelector = screen.getByLabelText(/lenguaje/i)
    expect(languageSelector).toBeInTheDocument()
  })

  it('should handle SessionRoute when sessionId param exists', async () => {
    // Este test cubre el caso cuando sessionId tiene un valor
    // La línea 29: sessionId || null - cubre el caso cuando sessionId es truthy
    render(
      <MemoryRouter initialEntries={['/session/valid-session-id']}>
        <App />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/editor de código/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })


  it('should set document.documentElement.lang on mount', () => {
    const originalLang = document.documentElement.lang
    renderApp()
    
    // Verificar que el lang se establece (puede ser 'es' por defecto del i18n)
    expect(document.documentElement.lang).toBeTruthy()
    
    // Restaurar el lang original
    document.documentElement.lang = originalLang
  })
})
