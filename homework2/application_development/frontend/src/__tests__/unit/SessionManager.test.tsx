import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionManager from '../../components/SessionManager'
import { sessionService, type SessionData } from '../../services/sessionService'

// Mock sessionService
vi.mock('../../services/sessionService', () => ({
  sessionService: {
    createSession: vi.fn(),
    getSession: vi.fn(),
    getShareUrl: vi.fn((id: string) => `http://localhost:5173/session/${id}`),
  },
}))

describe('SessionManager', () => {
  const mockOnSessionCreated = vi.fn()
  const mockOnSessionLoaded = vi.fn()

  const defaultProps = {
    onSessionCreated: mockOnSessionCreated,
    onSessionLoaded: mockOnSessionLoaded,
    currentSessionId: null,
    currentLanguage: '',
    isSessionCreator: false,
    showInSidebar: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.alert para evitar que aparezca durante los tests
    window.alert = vi.fn()
    // Mock console.error para evitar que aparezca durante los tests
    console.error = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render create session button when no session exists', () => {
    render(<SessionManager {...defaultProps} />)
    expect(screen.getByText(/crear nueva sesión/i)).toBeInTheDocument()
  })

  it('should disable create button when language is not selected', () => {
    render(<SessionManager {...defaultProps} currentLanguage="" />)
    const button = screen.getByText(/crear nueva sesión/i)
    expect(button).toBeDisabled()
  })

  it('should enable create button when language is selected', () => {
    render(<SessionManager {...defaultProps} currentLanguage="javascript" />)
    const button = screen.getByText(/crear nueva sesión/i)
    expect(button).not.toBeDisabled()
  })

  it('should show warning when language is not selected', () => {
    render(<SessionManager {...defaultProps} currentLanguage="" />)
    expect(screen.getByText(/selecciona un lenguaje/i)).toBeInTheDocument()
  })

  it('should show info text when language is selected', () => {
    render(<SessionManager {...defaultProps} currentLanguage="python" />)
    expect(screen.getByText(/el lenguaje seleccionado/i)).toBeInTheDocument()
  })

  it('should create session when button is clicked', async () => {
    const user = userEvent.setup()
    const mockSession: SessionData = {
      session_id: 'test-id',
      room_id: 'test-room',
      share_url: 'http://localhost:5173/session/test-id',
      language: 'javascript',
      initial_code: '',
      title: null,
      created_at: '2024-01-01T00:00:00Z',
      active_users: 0,
    }

    vi.mocked(sessionService.createSession).mockResolvedValueOnce(mockSession)

    render(<SessionManager {...defaultProps} currentLanguage="javascript" />)

    const button = screen.getByText(/crear nueva sesión/i)
    await user.click(button)

    await waitFor(() => {
      expect(sessionService.createSession).toHaveBeenCalledWith({
        language: 'javascript',
        initial_code: '',
        title: null,
      })
      expect(mockOnSessionCreated).toHaveBeenCalledWith(mockSession)
    })
  })

  it('should render share button when session exists', async () => {
    const mockSession: SessionData = {
      session_id: 'test-id',
      room_id: 'test-room',
      share_url: 'http://localhost:5173/session/test-id',
      language: 'javascript',
      initial_code: '',
      title: null,
      created_at: '2024-01-01T00:00:00Z',
      active_users: 0,
    }

    vi.mocked(sessionService.getSession).mockResolvedValueOnce(mockSession)

    render(<SessionManager {...defaultProps} currentSessionId="test-id" />)

    await waitFor(() => {
      expect(screen.getByText(/compartir sesión/i)).toBeInTheDocument()
    })
  })

  it('should open share dialog when share button is clicked', async () => {
    const user = userEvent.setup()
    const mockSession: SessionData = {
      session_id: 'test-id',
      room_id: 'test-room',
      share_url: 'http://localhost:5173/session/test-id',
      language: 'javascript',
      initial_code: '',
      title: null,
      created_at: '2024-01-01T00:00:00Z',
      active_users: 0,
    }

    vi.mocked(sessionService.getSession).mockResolvedValueOnce(mockSession)

    render(<SessionManager {...defaultProps} currentSessionId="test-id" />)

    await waitFor(() => {
      expect(sessionService.getSession).toHaveBeenCalledWith('test-id')
    })

    const shareButton = screen.getByText(/compartir sesión/i)
    await user.click(shareButton)

    // ShareDialog should open - check for dialog content
    await waitFor(() => {
      expect(screen.getByDisplayValue(/session\/test-id/i)).toBeInTheDocument()
    })
  })

  it('should show warning when session creator tries to change language', async () => {
    const mockSession: SessionData = {
      session_id: 'test-id',
      room_id: 'test-room',
      share_url: 'http://localhost:5173/session/test-id',
      language: 'javascript',
      initial_code: '',
      title: null,
      created_at: '2024-01-01T00:00:00Z',
      active_users: 0,
    }

    vi.mocked(sessionService.getSession).mockResolvedValueOnce(mockSession)

    render(
      <SessionManager
        {...defaultProps}
        currentSessionId="test-id"
        isSessionCreator={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/si cambias el lenguaje/i)).toBeInTheDocument()
    })
  })

  it('should not show warning in sidebar mode', () => {
    render(
      <SessionManager
        {...defaultProps}
        currentLanguage="javascript"
        showInSidebar={true}
      />
    )
    expect(screen.queryByText(/selecciona un lenguaje/i)).not.toBeInTheDocument()
  })

  it('should disable button when language is empty to prevent creating session without language', () => {
    // Este test verifica que el botón está deshabilitado cuando no hay lenguaje seleccionado
    // Esto es la protección principal que previene crear sesiones sin lenguaje.
    // La validación dentro de handleCreateSession (líneas 31-34) es defensiva pero en la práctica
    // nunca se ejecutará porque React previene la ejecución de handlers en botones deshabilitados.
    
    render(<SessionManager {...defaultProps} currentLanguage="" />)

    const button = screen.getByText(/crear nueva sesión/i)
    expect(button).toBeDisabled()
  })

  it('should handle error when creating session fails', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('Failed to create session')

    vi.mocked(sessionService.createSession).mockRejectedValueOnce(error)

    render(<SessionManager {...defaultProps} currentLanguage="javascript" />)

    const button = screen.getByText(/crear nueva sesión/i)
    await user.click(button)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating session:', error)
    })

    // Verificar que el botón vuelve a estar habilitado después del error
    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should handle error when loading session fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('Failed to load session')

    vi.mocked(sessionService.getSession).mockRejectedValueOnce(error)

    render(<SessionManager {...defaultProps} currentSessionId="test-id" />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading session:', error)
    })

    // Verificar que no se muestra el botón de compartir cuando hay error
    expect(screen.queryByText(/compartir sesión/i)).not.toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})

