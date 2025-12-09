import '@testing-library/jest-dom'

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
}
