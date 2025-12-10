import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SaveNotification from '../../components/SaveNotification'
import { useTranslation } from 'react-i18next'

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}))

describe('SaveNotification', () => {
  const mockHide = vi.fn()
  const mockT = vi.fn((key: string) => key)

  beforeEach(() => {
    vi.mocked(useTranslation).mockReturnValue({
      t: mockT,
      i18n: {
        language: 'es',
        changeLanguage: vi.fn(),
      },
    } as any)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should not render when show is false', () => {
    render(<SaveNotification show={false} onHide={mockHide} />)
    expect(screen.queryByText(/session.saved/i)).not.toBeInTheDocument()
  })

  it('should render when show is true', () => {
    render(<SaveNotification show={true} onHide={mockHide} />)
    expect(screen.getByText(/session.saved/i)).toBeInTheDocument()
  })

  it('should auto-hide after 3 seconds', async () => {
    render(<SaveNotification show={true} onHide={mockHide} />)
    
    expect(screen.getByText(/session.saved/i)).toBeInTheDocument()
    
    // Fast-forward 3 seconds
    vi.advanceTimersByTime(3000)
    
    await waitFor(() => {
      expect(mockHide).toHaveBeenCalledTimes(1)
    })
  })

  it('should show check icon', () => {
    render(<SaveNotification show={true} onHide={mockHide} />)
    const icon = screen.getByText(/session.saved/i).closest('.save-notification-content')?.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('should call onHide when hiding', async () => {
    render(<SaveNotification show={true} onHide={mockHide} />)
    
    vi.advanceTimersByTime(3300) // 3 seconds + animation delay
    
    await waitFor(() => {
      expect(mockHide).toHaveBeenCalled()
    })
  })

  it('should reset timer when show changes from false to true', () => {
    const { rerender } = render(<SaveNotification show={false} onHide={mockHide} />)
    
    rerender(<SaveNotification show={true} onHide={mockHide} />)
    
    expect(screen.getByText(/session.saved/i)).toBeInTheDocument()
    
    // Fast-forward less than 3 seconds
    vi.advanceTimersByTime(2000)
    expect(mockHide).not.toHaveBeenCalled()
    
    // Fast-forward to 3 seconds
    vi.advanceTimersByTime(1000)
    
    waitFor(() => {
      expect(mockHide).toHaveBeenCalledTimes(1)
    })
  })
})

