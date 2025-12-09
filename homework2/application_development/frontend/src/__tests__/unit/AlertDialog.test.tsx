import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import AlertDialog from '../../components/AlertDialog'

describe('AlertDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Title',
    message: 'Test Message',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<AlertDialog {...defaultProps} />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Message')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<AlertDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AlertDialog {...defaultProps} onClose={onClose} />)

    const closeButton = screen.getByLabelText(/cerrar/i)
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when understood button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AlertDialog {...defaultProps} onClose={onClose} />)

    const understoodButton = screen.getByText(/entendido/i)
    await user.click(understoodButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <AlertDialog
        {...defaultProps}
        onClose={onClose}
        onConfirm={onConfirm}
        showCancel={true}
      />
    )

    const confirmButton = screen.getByText(/confirmar/i)
    await user.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <AlertDialog
        {...defaultProps}
        onClose={onClose}
        onConfirm={onConfirm}
        showCancel={true}
      />
    )

    const cancelButton = screen.getByText(/cancelar/i)
    await user.click(cancelButton)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('should display custom confirm text', () => {
    render(
      <AlertDialog
        {...defaultProps}
        onConfirm={vi.fn()}
        confirmText="Custom Confirm"
        showCancel={true}
      />
    )
    expect(screen.getByText('Custom Confirm')).toBeInTheDocument()
  })

  it('should display icon when provided', () => {
    const icon = <div data-testid="test-icon">Icon</div>
    render(<AlertDialog {...defaultProps} icon={icon} />)
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('should apply correct type styling', () => {
    const { container } = render(<AlertDialog {...defaultProps} type="error" />)
    expect(container.querySelector('.alert-dialog')).toBeInTheDocument()
  })

  it('should apply warning type styling', () => {
    const { container } = render(<AlertDialog {...defaultProps} type="warning" />)
    expect(container.querySelector('.alert-dialog')).toBeInTheDocument()
  })

  it('should apply info type styling', () => {
    const { container } = render(<AlertDialog {...defaultProps} type="info" />)
    expect(container.querySelector('.alert-dialog')).toBeInTheDocument()
  })

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<AlertDialog {...defaultProps} onClose={onClose} />)
    
    // Simular presionar la tecla Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should not call onClose when other keys are pressed', () => {
    const onClose = vi.fn()
    render(<AlertDialog {...defaultProps} onClose={onClose} />)
    
    // Simular presionar otras teclas
    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' })
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' })
    fireEvent.keyDown(document, { key: 'a', code: 'KeyA' })
    
    expect(onClose).not.toHaveBeenCalled()
  })

  it('should remove event listener when dialog closes', () => {
    const onClose = vi.fn()
    const { rerender } = render(<AlertDialog {...defaultProps} onClose={onClose} />)
    
    // Presionar Escape debería llamar onClose
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    
    // Cerrar el diálogo
    rerender(<AlertDialog {...defaultProps} isOpen={false} onClose={onClose} />)
    
    // Limpiar el mock
    onClose.mockClear()
    
    // Presionar Escape ahora no debería llamar onClose porque el diálogo está cerrado
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  afterEach(() => {
    // Limpiar cualquier listener que pueda quedar
    vi.clearAllMocks()
  })
})


