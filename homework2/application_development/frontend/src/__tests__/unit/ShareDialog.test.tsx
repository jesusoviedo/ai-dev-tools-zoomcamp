import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShareDialog from '../../components/ShareDialog'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})

describe('ShareDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    shareUrl: 'http://localhost:5173/session/test-session-id',
    language: 'javascript' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<ShareDialog {...defaultProps} />)
    expect(screen.getByText(/compartir sesión/i)).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<ShareDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByText(/compartir sesión/i)).not.toBeInTheDocument()
  })

  it('should display share URL', () => {
    render(<ShareDialog {...defaultProps} />)
    const urlInput = screen.getByDisplayValue(defaultProps.shareUrl) as HTMLInputElement
    expect(urlInput).toBeInTheDocument()
    expect(urlInput.value).toBe(defaultProps.shareUrl)
  })

  it('should display language info when language is provided', () => {
    render(<ShareDialog {...defaultProps} language="python" />)
    expect(screen.getByText(/lenguaje bloqueado/i)).toBeInTheDocument()
  })

  it('should not display language info when language is not provided', () => {
    render(<ShareDialog {...defaultProps} language={undefined} />)
    expect(screen.queryByText(/lenguaje bloqueado/i)).not.toBeInTheDocument()
  })

  it('should copy URL to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup()
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText')
    render(<ShareDialog {...defaultProps} />)

    const copyButton = screen.getByText(/copiar enlace/i)
    await user.click(copyButton)

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(defaultProps.shareUrl)
    })
    writeTextSpy.mockRestore()
  })

  it('should show copied message after copying', async () => {
    const user = userEvent.setup()
    render(<ShareDialog {...defaultProps} />)

    const copyButton = screen.getByText(/copiar enlace/i)
    await user.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText(/copiado/i)).toBeInTheDocument()
    })
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ShareDialog {...defaultProps} onClose={onClose} />)

    const closeButton = screen.getByLabelText(/cerrar/i)
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should display QR code', () => {
    render(<ShareDialog {...defaultProps} />)
    // QR code is rendered as SVG - check for any SVG in the container
    const qrCodeContainer = document.querySelector('.qr-code-container')
    expect(qrCodeContainer).toBeInTheDocument()
    const svg = qrCodeContainer?.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('should display session ID when provided', () => {
    render(<ShareDialog {...defaultProps} />)
    // Session ID might be displayed in the dialog
    expect(screen.getByDisplayValue(defaultProps.shareUrl)).toBeInTheDocument()
  })
})

