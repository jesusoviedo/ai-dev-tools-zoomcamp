import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sessionService, type SessionData, type CreateSessionRequest } from '../../services/sessionService'

describe('sessionService', () => {
  const mockFetch = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = mockFetch
    mockFetch.mockClear()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('createSession', () => {
    it('should create a session with default values', async () => {
      const mockSession: SessionData = {
        session_id: 'test-session-id',
        room_id: 'test-room-id',
        share_url: 'http://localhost:5173/session/test-session-id',
        language: 'javascript',
        initial_code: '',
        title: null,
        created_at: '2024-01-01T00:00:00Z',
        active_users: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      })

      const result = await sessionService.createSession()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })
      )
      expect(result).toEqual(mockSession)
    })

    it('should create a session with custom values', async () => {
      const mockSession: SessionData = {
        session_id: 'test-session-id',
        room_id: 'test-room-id',
        share_url: 'http://localhost:5173/session/test-session-id',
        language: 'python',
        initial_code: 'print("Hello")',
        title: 'Test Session',
        created_at: '2024-01-01T00:00:00Z',
        active_users: 0,
      }

      const request: CreateSessionRequest = {
        language: 'python',
        initial_code: 'print("Hello")',
        title: 'Test Session',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      })

      const result = await sessionService.createSession(request)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        })
      )
      expect(result).toEqual(mockSession)
    })

    it('should throw error when request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      })

      await expect(sessionService.createSession()).rejects.toThrow('Failed to create session: Bad Request')
    })

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(sessionService.createSession()).rejects.toThrow('Network error')
    })
  })

  describe('getSession', () => {
    it('should get a session by id', async () => {
      const mockSession: SessionData = {
        session_id: 'test-session-id',
        room_id: 'test-room-id',
        share_url: 'http://localhost:5173/session/test-session-id',
        language: 'javascript',
        initial_code: '',
        title: null,
        created_at: '2024-01-01T00:00:00Z',
        active_users: 1,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      })

      const result = await sessionService.getSession('test-session-id')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions/test-session-id')
      )
      expect(result).toEqual(mockSession)
    })

    it('should throw error when session not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(sessionService.getSession('non-existent')).rejects.toThrow('Session not found')
    })

    it('should throw error on other failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(sessionService.getSession('test-id')).rejects.toThrow('Failed to get session: Internal Server Error')
    })

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(sessionService.getSession('test-id')).rejects.toThrow('Network error')
    })
  })

  describe('getShareUrl', () => {
    it('should generate correct share URL', () => {
      const originalLocation = window.location
      delete (window as any).location
      window.location = { origin: 'http://localhost:5173' } as any

      const url = sessionService.getShareUrl('test-session-id')

      expect(url).toBe('http://localhost:5173/session/test-session-id')

      window.location = originalLocation
    })
  })
})


