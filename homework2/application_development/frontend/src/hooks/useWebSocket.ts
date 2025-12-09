import { useEffect, useRef, useCallback, useState } from 'react'

export interface WebSocketMessage {
  type: string
  [key: string]: any
}

export interface UseWebSocketReturn {
  isConnected: boolean
  sendMessage: (message: WebSocketMessage) => void
  error: string | null
}

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useWebSocket(
  roomId: string | null,
  onMessage?: (message: WebSocketMessage) => void,
  onError?: (error: Event) => void
): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!roomId) {
      return
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      const wsUrl = `${WS_BASE_URL}/ws/${roomId}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected to room:', roomId)
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0

        // Send join message
        ws.send(JSON.stringify({
          type: 'join',
          username: 'Anonymous'
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          // Handle different message types
          if (message.type === 'error') {
            setError(message.message || 'Unknown error')
            console.error('WebSocket error:', message.message)
          } else if (onMessage) {
            onMessage(message)
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
        if (onError) {
          onError(event)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected from room:', roomId)
        setIsConnected(false)

        // Attempt to reconnect if not manually closed
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          setError('Failed to reconnect to WebSocket')
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Error creating WebSocket:', err)
      setError('Failed to create WebSocket connection')
    }
  }, [roomId, onMessage, onError])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
      } catch (err) {
        console.error('Error sending WebSocket message:', err)
        setError('Failed to send message')
      }
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  useEffect(() => {
    if (roomId) {
      connect()
    } else {
      // Close connection if no roomId
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
    }

    // Cleanup on unmount or roomId change
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [roomId, connect])

  return {
    isConnected,
    sendMessage,
    error
  }
}


