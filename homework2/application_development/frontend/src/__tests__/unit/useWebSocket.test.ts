import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWebSocket, type WebSocketMessage } from '../../hooks/useWebSocket'

describe('useWebSocket', () => {
  let mockWebSocket: any
  let wsInstances: any[] = []

  beforeEach(() => {
    wsInstances = []
    mockWebSocket = class MockWebSocket {
      url: string
      readyState: number = WebSocket.CONNECTING
      onopen: ((event: Event) => void) | null = null
      onclose: ((event: CloseEvent) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null

      constructor(url: string) {
        this.url = url
        wsInstances.push(this)
        // Simulate connection after a short delay
        setTimeout(() => {
          this.readyState = WebSocket.OPEN
          if (this.onopen) {
            this.onopen(new Event('open'))
          }
        }, 10)
      }

      send(data: string) {
        // Mock send
      }

      close() {
        this.readyState = WebSocket.CLOSED
        if (this.onclose) {
          this.onclose(new CloseEvent('close'))
        }
      }
    }

    global.WebSocket = mockWebSocket as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    wsInstances.forEach(ws => {
      if (ws.readyState !== WebSocket.CLOSED) {
        ws.close()
      }
    })
    wsInstances = []
  })

  it('should not connect when roomId is null', () => {
    const { result } = renderHook(() => useWebSocket(null))
    expect(result.current.isConnected).toBe(false)
    expect(wsInstances.length).toBe(0)
  })

  it('should connect when roomId is provided', async () => {
    const { result } = renderHook(() => useWebSocket('test-room'))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    expect(wsInstances.length).toBe(1)
  })

  it('should send join message on connect', async () => {
    const sendSpy = vi.fn()
    const { result } = renderHook(() => useWebSocket('test-room'))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    const ws = wsInstances[0]
    ws.send = sendSpy
    
    // Trigger onopen again to send join message
    if (ws.onopen) {
      ws.onopen(new Event('open'))
    }
    
    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalled()
    })
  })

  it('should call onMessage when message is received', async () => {
    const onMessage = vi.fn()
    const { result } = renderHook(() => useWebSocket('test-room', onMessage))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    const ws = wsInstances[0]
    const testMessage: WebSocketMessage = {
      type: 'code_change',
      code: 'test code',
    }
    
    if (ws.onmessage) {
      ws.onmessage(new MessageEvent('message', {
        data: JSON.stringify(testMessage),
      }))
    }
    
    await waitFor(() => {
      expect(onMessage).toHaveBeenCalledWith(testMessage)
    })
  })

  it('should handle error messages', async () => {
    const onMessage = vi.fn()
    const { result } = renderHook(() => useWebSocket('test-room', onMessage))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    const ws = wsInstances[0]
    const errorMessage: WebSocketMessage = {
      type: 'error',
      message: 'Test error',
    }
    
    if (ws.onmessage) {
      ws.onmessage(new MessageEvent('message', {
        data: JSON.stringify(errorMessage),
      }))
    }
    
    await waitFor(() => {
      expect(result.current.error).toBe('Test error')
    })
  })

  it('should send message when sendMessage is called', async () => {
    const sendSpy = vi.fn()
    const { result } = renderHook(() => useWebSocket('test-room'))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    const ws = wsInstances[0]
    ws.send = sendSpy
    
    const testMessage: WebSocketMessage = {
      type: 'code_change',
      code: 'test',
    }
    
    result.current.sendMessage(testMessage)
    
    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testMessage))
    })
  })

  it('should handle connection errors', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useWebSocket('test-room', undefined, onError))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    const ws = wsInstances[0]
    if (ws.onerror) {
      ws.onerror(new Event('error'))
    }
    
    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
      expect(onError).toHaveBeenCalled()
    })
  })

  it('should handle disconnect', async () => {
    const { result } = renderHook(() => useWebSocket('test-room'))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    const ws = wsInstances[0]
    ws.close()
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
    }, { timeout: 1000 })
  })

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useWebSocket('test-room'))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    expect(wsInstances.length).toBeGreaterThan(0)
    unmount()
    
    // After unmount, cleanup should be called
    // The WebSocket close is handled in the cleanup effect
  })

  it('should not send message when not connected', () => {
    const { result } = renderHook(() => useWebSocket(null))
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    result.current.sendMessage({ type: 'test' })
    
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should handle error when sending message fails', async () => {
    const sendSpy = vi.fn().mockImplementation(() => {
      throw new Error('Send failed')
    })
    const { result } = renderHook(() => useWebSocket('test-room'))
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    const ws = wsInstances[0]
    ws.send = sendSpy
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    result.current.sendMessage({ type: 'test' })
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result.current.error).toBeTruthy()
    })
    
    consoleErrorSpy.mockRestore()
  })

  it('should close connection when roomId becomes null', async () => {
    const { result, rerender } = renderHook(
      ({ roomId }) => useWebSocket(roomId),
      { initialProps: { roomId: 'test-room' } }
    )
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 1000 })
    
    expect(wsInstances.length).toBeGreaterThan(0)
    const ws = wsInstances[0]
    const closeSpy = vi.spyOn(ws, 'close')
    
    // Cambiar roomId a null
    rerender({ roomId: null })
    
    await waitFor(() => {
      expect(closeSpy).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
    })
  })
})

