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
}

export const sessionService = new SessionService()


