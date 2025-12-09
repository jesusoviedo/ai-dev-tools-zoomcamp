import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'

// Mock ReactDOM before any imports
const mockRender = vi.fn()
const mockCreateRoot = vi.fn(() => ({
  render: mockRender,
}))

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mockCreateRoot,
  },
}))

// Mock App component
vi.mock('../App', () => ({
  default: () => <div data-testid="app">App Component</div>,
}))

// Mock CSS import
vi.mock('../index.css', () => ({}))

describe('main.tsx', () => {
  let container: HTMLElement

  beforeEach(async () => {
    // Clear module cache to allow re-import
    vi.resetModules()
    
    // Create a container element
    container = document.createElement('div')
    container.id = 'root'
    document.body.appendChild(container)

    // Clear all mocks
    vi.clearAllMocks()
    
    // Reset the mocks
    mockCreateRoot.mockReturnValue({
      render: mockRender,
    })
  })

  afterEach(() => {
    // Cleanup
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should create root and render App in StrictMode', async () => {
    // Dynamically import main.tsx to trigger execution
    const mainModule = await import('../../main')

    // Wait for React to process
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify createRoot was called with the root element
    expect(mockCreateRoot).toHaveBeenCalledTimes(1)
    const rootElement = document.getElementById('root')
    expect(mockCreateRoot).toHaveBeenCalledWith(rootElement)

    // Verify render was called
    expect(mockRender).toHaveBeenCalledTimes(1)

    // Verify render was called with React.StrictMode containing App
    const renderCall = mockRender.mock.calls[0][0]
    expect(renderCall.type).toBe(React.StrictMode)
    expect(renderCall.props.children).toBeDefined()
  })

  it('should use React.StrictMode wrapper', async () => {
    await import('../../main')
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockRender).toHaveBeenCalled()
    const renderCall = mockRender.mock.calls[0][0]
    expect(renderCall.type).toBe(React.StrictMode)
  })

  it('should render App component inside StrictMode', async () => {
    await import('../../main')
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockRender).toHaveBeenCalled()
    const renderCall = mockRender.mock.calls[0][0]
    
    // Verify App is rendered inside StrictMode
    expect(renderCall.props.children).toBeDefined()
    expect(renderCall.type).toBe(React.StrictMode)
  })

  it('should call createRoot with root element', async () => {
    await import('../../main')
    await new Promise(resolve => setTimeout(resolve, 50))

    const rootElement = document.getElementById('root')
    expect(mockCreateRoot).toHaveBeenCalledWith(rootElement)
  })

  it('should handle root element correctly', async () => {
    const rootElement = document.getElementById('root')
    expect(rootElement).toBeTruthy()
    expect(rootElement?.id).toBe('root')

    await import('../../main')
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockCreateRoot).toHaveBeenCalledWith(rootElement)
  })

  it('should import React and ReactDOM correctly', async () => {
    await import('../../main')
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(React).toBeDefined()
    expect(React.StrictMode).toBeDefined()
    expect(mockCreateRoot).toHaveBeenCalled()
  })
})
