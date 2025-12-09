import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CollapsiblePanel from '../../components/CollapsiblePanel'

describe('CollapsiblePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render title and children', () => {
    render(
      <CollapsiblePanel title="Test Panel">
        <div>Panel Content</div>
      </CollapsiblePanel>
    )
    
    expect(screen.getByText('Test Panel')).toBeInTheDocument()
    expect(screen.getByText('Panel Content')).toBeInTheDocument()
  })

  it('should be expanded by default', () => {
    render(
      <CollapsiblePanel title="Test Panel">
        <div>Panel Content</div>
      </CollapsiblePanel>
    )
    
    const content = screen.getByText('Panel Content')
    expect(content).toBeInTheDocument()
    expect(content.parentElement).not.toHaveClass('collapsed')
  })

  it('should be collapsed when defaultCollapsed is true', () => {
    render(
      <CollapsiblePanel title="Test Panel" defaultCollapsed={true}>
        <div>Panel Content</div>
      </CollapsiblePanel>
    )
    
    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument()
  })

  it('should toggle collapse when header is clicked', async () => {
    const user = userEvent.setup()
    render(
      <CollapsiblePanel title="Test Panel">
        <div>Panel Content</div>
      </CollapsiblePanel>
    )
    
    const header = screen.getByRole('button')
    expect(screen.getByText('Panel Content')).toBeInTheDocument()
    
    await user.click(header)
    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument()
    
    await user.click(header)
    expect(screen.getByText('Panel Content')).toBeInTheDocument()
  })

  it('should update aria-expanded when toggled', async () => {
    const user = userEvent.setup()
    render(
      <CollapsiblePanel title="Test Panel">
        <div>Panel Content</div>
      </CollapsiblePanel>
    )
    
    const header = screen.getByRole('button')
    expect(header).toHaveAttribute('aria-expanded', 'true')
    
    await user.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    
    await user.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
  })

  it('should render icon when provided', () => {
    const icon = <span data-testid="test-icon">Icon</span>
    render(
      <CollapsiblePanel title="Test Panel" icon={icon}>
        <div>Panel Content</div>
      </CollapsiblePanel>
    )
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('should not render icon when not provided', () => {
    render(
      <CollapsiblePanel title="Test Panel">
        <div>Panel Content</div>
      </CollapsiblePanel>
    )
    
    expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument()
  })

  it('should apply collapsed class when collapsed', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <CollapsiblePanel title="Test Panel">
        <div>Panel Content</div>
      </CollapsiblePanel>
    )
    
    const panel = container.querySelector('.collapsible-panel')
    expect(panel).not.toHaveClass('collapsed')
    
    const header = screen.getByRole('button')
    await user.click(header)
    
    expect(panel).toHaveClass('collapsed')
  })
})

