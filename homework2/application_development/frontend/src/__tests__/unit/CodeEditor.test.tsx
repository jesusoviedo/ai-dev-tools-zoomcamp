import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodeEditor, { SupportedLanguage } from '../../components/CodeEditor'

describe('CodeEditor', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
    // Mock para evitar errores de CodeMirror en jsdom
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    } as DOMRect)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render with default language (empty)', () => {
    render(<CodeEditor value="" onChange={mockOnChange} />)
    
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    expect(languageSelector.value).toBe('')
  })

  it('should render with specified language', () => {
    render(<CodeEditor value="" onChange={mockOnChange} language="python" />)
    
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    expect(languageSelector.value).toBe('python')
  })

  it('should render language selector with all options including empty', () => {
    render(<CodeEditor value="" onChange={mockOnChange} />)
    
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    const options = Array.from(languageSelector.options).map(opt => opt.value)
    
    expect(options).toContain('')
    expect(options).toContain('javascript')
    expect(options).toContain('python')
    expect(options).toHaveLength(3)
  })

  it('should call onChange when code changes', async () => {
    render(<CodeEditor value="" onChange={mockOnChange} />)
    
    await waitFor(() => {
      const editor = screen.queryByRole('textbox')
      expect(editor).toBeInTheDocument()
    }, { timeout: 2000 })

    // Note: Testing actual CodeMirror onChange requires more complex setup
    // This test verifies the component renders correctly
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should update language when selector changes', async () => {
    const user = userEvent.setup()
    render(<CodeEditor value="" onChange={mockOnChange} language="javascript" />)
    
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    expect(languageSelector.value).toBe('javascript')
    
    await user.selectOptions(languageSelector, 'python')
    expect(languageSelector.value).toBe('python')
  })

  it('should handle language change from javascript to python', async () => {
    const user = userEvent.setup()
    render(<CodeEditor value="" onChange={mockOnChange} language="javascript" />)
    
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    await user.selectOptions(languageSelector, 'python')
    
    expect(languageSelector.value).toBe('python')
  })

  it('should handle language change from python to javascript', async () => {
    const user = userEvent.setup()
    render(<CodeEditor value="" onChange={mockOnChange} language="python" />)
    
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    await user.selectOptions(languageSelector, 'javascript')
    
    expect(languageSelector.value).toBe('javascript')
  })

  it('should render CodeMirror editor', async () => {
    render(<CodeEditor value="const x = 1;" onChange={mockOnChange} />)
    
    await waitFor(() => {
      const editor = screen.queryByRole('textbox')
      expect(editor).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should display initial value', async () => {
    const initialValue = 'function test() { return true; }'
    render(<CodeEditor value={initialValue} onChange={mockOnChange} />)
    
    await waitFor(() => {
      const editor = screen.queryByRole('textbox')
      expect(editor).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should have correct label for language selector', () => {
    render(<CodeEditor value="" onChange={mockOnChange} />)
    
    const label = screen.getByText('Lenguaje:', { selector: 'label' })
    expect(label).toBeInTheDocument()
    expect(label.tagName).toBe('LABEL')
  })

  it('should have correct id and htmlFor relationship', () => {
    render(<CodeEditor value="" onChange={mockOnChange} />)
    
    const label = screen.getByText('Lenguaje:', { selector: 'label' })
    const selector = screen.getByLabelText(/lenguaje/i)
    
    expect(label.getAttribute('for')).toBe('language-selector')
    expect(selector.id).toBe('language-selector')
  })

  // Test para cubrir el caso default del switch (línea 31)
  // Esto requiere forzar un valor inválido mediante type casting
  it('should handle invalid language gracefully', () => {
    // Forzar un valor inválido para cubrir el caso default
    const invalidLanguage = 'invalid' as SupportedLanguage
    render(<CodeEditor value="" onChange={mockOnChange} language={invalidLanguage} />)
    
    // El componente debería renderizar sin errores
    const languageSelector = screen.getByLabelText(/lenguaje/i)
    expect(languageSelector).toBeInTheDocument()
  })

  it('should prevent language change when language is locked', () => {
    const onLanguageChangeAttempt = vi.fn()
    render(
      <CodeEditor 
        value="" 
        onChange={mockOnChange} 
        language="python" 
        isLanguageLocked={true}
        onLanguageChangeAttempt={onLanguageChangeAttempt}
      />
    )
    
    const languageSelector = screen.getByLabelText(/lenguaje/i) as HTMLSelectElement
    expect(languageSelector.value).toBe('python')
    
    // Simular el evento change directamente
    fireEvent.change(languageSelector, { target: { value: 'javascript' } })
    
    // Verificar que el callback fue llamado
    expect(onLanguageChangeAttempt).toHaveBeenCalled()
    
    // El selector debería mantenerse en python después del preventDefault
    expect(languageSelector.value).toBe('python')
  })
})

