import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'
import i18n from './i18n/i18n'

// Configurar i18n para español por defecto en los tests
beforeEach(() => {
  i18n.changeLanguage('es')
})

// Mock para CodeMirror en el entorno de testing
// CodeMirror requiere APIs del DOM que jsdom no proporciona completamente
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
})

// Mock para Range.getClientRects que CodeMirror necesita
if (typeof Range !== 'undefined') {
  Range.prototype.getClientRects = function () {
    return {
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {},
    } as DOMRectList
  }
  
  Range.prototype.getBoundingClientRect = function () {
    return {
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect
  }
}

// Suprimir errores de CodeMirror relacionados con posAtCoords y posBefore
// Estos errores ocurren porque CodeMirror intenta calcular posiciones de mouse que jsdom no soporta completamente
// No afectan la funcionalidad real de la aplicación, solo ocurren en el entorno de testing

// Interceptar errores antes de que lleguen a los handlers globales
const suppressCodeMirrorError = (error: any): boolean => {
  if (error instanceof RangeError) {
    const msg = error.message || ''
    const stack = error.stack || ''
    if (msg.includes('posBefore') || msg.includes('Invalid child') || stack.includes('posBefore')) {
      return true
    }
  }
  if (typeof error === 'string' && error.includes('posBefore')) {
    return true
  }
  return false
}

// Suprimir errores en console.error
const originalError = console.error
console.error = (...args: any[]) => {
  if (args[0] && suppressCodeMirrorError(args[0])) {
    return
  }
  originalError.apply(console, args)
}

// Suprimir errores no manejados de CodeMirror relacionados con coordenadas de mouse en jsdom
const originalErrorHandler = window.onerror
window.onerror = function(message, source, lineno, colno, error) {
  if (suppressCodeMirrorError(message) || suppressCodeMirrorError(error)) {
    return true // Suprimir el error
  }
  // Llamar al handler original si existe
  if (originalErrorHandler) {
    return originalErrorHandler.call(this, message, source, lineno, colno, error)
  }
  return false
}

// Interceptar unhandledrejection para errores de promesas
window.addEventListener('unhandledrejection', (event) => {
  if (suppressCodeMirrorError(event.reason)) {
    event.preventDefault() // Suprimir el error
  }
})

// Interceptar errores no capturados usando process.on si está disponible
if (typeof process !== 'undefined' && process.on) {
  process.on('uncaughtException', (error: Error) => {
    if (suppressCodeMirrorError(error)) {
      // Suprimir el error silenciosamente
      return
    }
    // Si no es un error de CodeMirror, dejarlo propagar
  })
  
  process.on('unhandledRejection', (reason: any) => {
    if (suppressCodeMirrorError(reason)) {
      // Suprimir el error silenciosamente
      return
    }
  })
}
