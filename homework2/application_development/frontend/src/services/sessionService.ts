const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface SessionData {
  session_id: string
  room_id: string
  share_url: string
  language: string
  initial_code: string
  title: string | null
  created_at: string
  active_users: number
  last_saved_at?: string | null
}

export interface CreateSessionRequest {
  language?: string
  initial_code?: string
  title?: string
}

class SessionService {
  async createSession(request: CreateSessionRequest = {}): Promise<SessionData> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating session:', error)
      throw error
    }
  }

  async getSession(sessionId: string): Promise<SessionData> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found')
        }
        throw new Error(`Failed to get session: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting session:', error)
      throw error
    }
  }

  getShareUrl(sessionId: string): string {
    const baseUrl = window.location.origin
    return `${baseUrl}/session/${sessionId}`
  }

  async saveCode(sessionId: string, code: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/code`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found')
        }
        if (response.status === 410) {
          throw new Error('Session has expired')
        }
        throw new Error(`Failed to save code: ${response.statusText}`)
      }

      // Return void on success
      await response.json()
    } catch (error) {
      console.error('Error saving code:', error)
      throw error
    }
  }
}

export const sessionService = new SessionService()


