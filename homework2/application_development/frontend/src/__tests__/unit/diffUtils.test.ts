import { describe, it, expect } from 'vitest'
import {
  calculateDiff,
  applyDiff,
  canApplyDiff,
  shouldSendFullCode,
  transformDiff,
  type CodeDiff
} from '../../utils/diffUtils'

describe('diffUtils', () => {
  describe('calculateDiff', () => {
    it('should return null for identical strings', () => {
      const result = calculateDiff('hello', 'hello')
      expect(result).toBeNull()
    })

    it('should calculate diff for insertion at start', () => {
      const result = calculateDiff('world', 'hello world')
      expect(result).not.toBeNull()
      expect(result?.from).toBe(0)
      expect(result?.to).toBe(0)
      expect(result?.insert).toBe('hello ')
    })

    it('should calculate diff for insertion at end', () => {
      const result = calculateDiff('hello', 'hello world')
      expect(result).not.toBeNull()
      expect(result?.from).toBe(5)
      expect(result?.to).toBe(5)
      expect(result?.insert).toBe(' world')
    })

    it('should calculate diff for insertion in middle', () => {
      const result = calculateDiff('hello world', 'hello beautiful world')
      expect(result).not.toBeNull()
      expect(result?.from).toBe(6)
      expect(result?.to).toBe(6)
      expect(result?.insert).toBe('beautiful ')
    })

    it('should calculate diff for deletion', () => {
      const result = calculateDiff('hello world', 'hello')
      expect(result).not.toBeNull()
      expect(result?.from).toBe(5)
      expect(result?.to).toBe(11)
      expect(result?.insert).toBe('')
      expect(result?.deleteLength).toBe(6)
    })

    it('should calculate diff for replacement', () => {
      const result = calculateDiff('hello world', 'hello there')
      expect(result).not.toBeNull()
      expect(result?.from).toBe(6)
      expect(result?.to).toBe(11)
      expect(result?.insert).toBe('there')
      expect(result?.deleteLength).toBe(5)
    })

    it('should handle empty strings', () => {
      const result1 = calculateDiff('', 'hello')
      expect(result1).not.toBeNull()
      expect(result1?.from).toBe(0)
      expect(result1?.to).toBe(0)
      expect(result1?.insert).toBe('hello')

      const result2 = calculateDiff('hello', '')
      expect(result2).not.toBeNull()
      expect(result2?.from).toBe(0)
      expect(result2?.to).toBe(5)
      expect(result2?.insert).toBe('')
    })
  })

  describe('applyDiff', () => {
    it('should apply insertion diff', () => {
      const diff: CodeDiff = { from: 5, to: 5, insert: ' beautiful' }
      const result = applyDiff('hello world', diff)
      expect(result).toBe('hello beautiful world')
    })

    it('should apply deletion diff', () => {
      const diff: CodeDiff = { from: 5, to: 11, insert: '', deleteLength: 6 }
      const result = applyDiff('hello world', diff)
      expect(result).toBe('hello')
    })

    it('should apply replacement diff', () => {
      const diff: CodeDiff = { from: 6, to: 11, insert: 'there', deleteLength: 5 }
      const result = applyDiff('hello world', diff)
      expect(result).toBe('hello there')
    })

    it('should apply diff at start', () => {
      const diff: CodeDiff = { from: 0, to: 0, insert: 'start ' }
      const result = applyDiff('hello', diff)
      expect(result).toBe('start hello')
    })

    it('should apply diff at end', () => {
      const diff: CodeDiff = { from: 5, to: 5, insert: ' end' }
      const result = applyDiff('hello', diff)
      expect(result).toBe('hello end')
    })
  })

  describe('canApplyDiff', () => {
    it('should return true for valid diff', () => {
      const diff: CodeDiff = { from: 5, to: 10, insert: 'test' }
      expect(canApplyDiff('hello world', diff)).toBe(true)
    })

    it('should return false for invalid from position', () => {
      const diff: CodeDiff = { from: -1, to: 5, insert: 'test' }
      expect(canApplyDiff('hello', diff)).toBe(false)
    })

    it('should return false for invalid to position', () => {
      const diff: CodeDiff = { from: 0, to: 100, insert: 'test' }
      expect(canApplyDiff('hello', diff)).toBe(false)
    })

    it('should return false when to < from', () => {
      const diff: CodeDiff = { from: 10, to: 5, insert: 'test' }
      expect(canApplyDiff('hello world', diff)).toBe(false)
    })
  })

  describe('shouldSendFullCode', () => {
    it('should return false for null diff', () => {
      expect(shouldSendFullCode(null, 100)).toBe(false)
    })

    it('should return false for small diff', () => {
      const diff: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      expect(shouldSendFullCode(diff, 100)).toBe(false)
    })

    it('should return true for large diff (>50% of code)', () => {
      const diff: CodeDiff = { from: 0, to: 10, insert: 'a'.repeat(60) }
      expect(shouldSendFullCode(diff, 100)).toBe(true)
    })

    it('should return false for diff exactly 50%', () => {
      const diff: CodeDiff = { from: 0, to: 50, insert: 'a'.repeat(50) }
      expect(shouldSendFullCode(diff, 100)).toBe(false)
    })
  })

  describe('transformDiff', () => {
    it('should transform diff when other diff is before', () => {
      const diff1: CodeDiff = { from: 20, to: 25, insert: 'test' }
      const diff2: CodeDiff = { from: 10, to: 15, insert: 'hello' }
      const result = transformDiff(diff1, diff2)
      
      expect(result).not.toBeNull()
      expect(result?.from).toBe(25) // 20 + (5 - 0) = 25
      expect(result?.to).toBe(30)
      expect(result?.insert).toBe('test')
    })

    it('should not transform diff when other diff is after', () => {
      const diff1: CodeDiff = { from: 10, to: 15, insert: 'test' }
      const diff2: CodeDiff = { from: 20, to: 25, insert: 'hello' }
      const result = transformDiff(diff1, diff2)
      
      expect(result).not.toBeNull()
      expect(result?.from).toBe(10)
      expect(result?.to).toBe(15)
      expect(result?.insert).toBe('test')
    })

    it('should return null for overlapping diffs', () => {
      const diff1: CodeDiff = { from: 10, to: 20, insert: 'test' }
      const diff2: CodeDiff = { from: 15, to: 25, insert: 'hello' }
      const result = transformDiff(diff1, diff2)
      
      expect(result).toBeNull()
    })

    it('should handle adjacent diffs', () => {
      const diff1: CodeDiff = { from: 20, to: 20, insert: 'test' }
      const diff2: CodeDiff = { from: 10, to: 20, insert: 'hello' }
      const result = transformDiff(diff1, diff2)
      
      expect(result).not.toBeNull()
      expect(result?.from).toBe(25) // 20 + (10 - 0) = 30, but insert is at 20, so 20 + 5 = 25
      expect(result?.insert).toBe('test')
    })
  })
})

