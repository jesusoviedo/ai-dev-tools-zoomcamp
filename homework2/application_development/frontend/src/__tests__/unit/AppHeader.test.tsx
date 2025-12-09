import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppHeader from '../../components/AppHeader'

const mockChangeLanguage = vi.fn()
let currentLanguage = 'es'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.name': 'Plataforma de Entrevistas',
        'app.description': 'Editor de código colaborativo',
      }
      return translations[key] || key
    },
    get i18n() {
      return {
        language: currentLanguage,
        changeLanguage: mockChangeLanguage,
      }
    },
  }),
}))

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChangeLanguage.mockImplementation((lng: string) => {
      document.documentElement.lang = lng
    })
  })

  it('should render app name and description', () => {
    render(<AppHeader />)
    expect(screen.getByText('Plataforma de Entrevistas')).toBeInTheDocument()
    expect(screen.getByText('Editor de código colaborativo')).toBeInTheDocument()
  })

  it('should render language selector buttons', () => {
    render(<AppHeader />)
    expect(screen.getByLabelText('Español')).toBeInTheDocument()
    expect(screen.getByLabelText('English')).toBeInTheDocument()
  })

  it('should call changeLanguage when ES button is clicked', async () => {
    const user = userEvent.setup()
    render(<AppHeader />)
    
    const esButton = screen.getByLabelText('Español')
    await user.click(esButton)
    
    expect(mockChangeLanguage).toHaveBeenCalledWith('es')
    expect(document.documentElement.lang).toBe('es')
  })

  it('should call changeLanguage when EN button is clicked', async () => {
    const user = userEvent.setup()
    render(<AppHeader />)
    
    const enButton = screen.getByLabelText('English')
    await user.click(enButton)
    
    expect(mockChangeLanguage).toHaveBeenCalledWith('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('should mark active language button for Spanish', () => {
    render(<AppHeader />)
    const esButton = screen.getByLabelText('Español')
    expect(esButton).toHaveClass('active')
  })

  it('should mark active language button for English', () => {
    // Cambiar el idioma actual a inglés para cubrir la línea 28
    currentLanguage = 'en'
    
    render(<AppHeader />)
    const enButton = screen.getByLabelText('English')
    expect(enButton).toHaveClass('active')
    
    // Verificar que el botón ES no tiene la clase active
    const esButton = screen.getByLabelText('Español')
    expect(esButton).not.toHaveClass('active')
    
    // Restaurar el idioma por defecto
    currentLanguage = 'es'
  })
})

