import { describe, it, expect } from 'vitest'
import {
  resolveConflict,
  hasConflict,
  resolveWithLWW,
  type ConflictInfo,
  type CodeDiff
} from '../../utils/conflictResolver'

describe('conflictResolver', () => {
  describe('resolveConflict', () => {
    it('should resolve when no local diff exists', () => {
      const remoteDiff: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const result = resolveConflict(null, remoteDiff)
      
      expect(result.hasConflict).toBe(false)
      expect(result.canResolve).toBe(true)
      expect(result.resolvedDiff).toEqual(remoteDiff)
    })

    it('should resolve when diffs do not overlap', () => {
      const localDiff: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const remoteDiff: CodeDiff = { from: 10, to: 15, insert: 'world' }
      const result = resolveConflict(localDiff, remoteDiff)
      
      expect(result.hasConflict).toBe(false)
      expect(result.canResolve).toBe(true)
      expect(result.resolvedDiff).not.toBeNull()
    })

    it('should detect conflict when diffs overlap', () => {
      const localDiff: CodeDiff = { from: 5, to: 15, insert: 'test' }
      const remoteDiff: CodeDiff = { from: 10, to: 20, insert: 'hello' }
      const result = resolveConflict(localDiff, remoteDiff)
      
      expect(result.hasConflict).toBe(true)
      expect(result.canResolve).toBe(false)
      expect(result.message).toBeDefined()
    })

    it('should transform diff when local is before remote', () => {
      const localDiff: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const remoteDiff: CodeDiff = { from: 10, to: 15, insert: 'world' }
      const result = resolveConflict(localDiff, remoteDiff)
      
      expect(result.hasConflict).toBe(false)
      expect(result.canResolve).toBe(true)
      expect(result.resolvedDiff).not.toBeNull()
    })

    it('should transform diff when local is after remote', () => {
      const localDiff: CodeDiff = { from: 20, to: 25, insert: 'test' }
      const remoteDiff: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const result = resolveConflict(localDiff, remoteDiff)
      
      expect(result.hasConflict).toBe(false)
      expect(result.canResolve).toBe(true)
      expect(result.resolvedDiff).not.toBeNull()
    })
  })

  describe('hasConflict', () => {
    it('should return false for non-overlapping diffs', () => {
      const diff1: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const diff2: CodeDiff = { from: 10, to: 15, insert: 'world' }
      expect(hasConflict(diff1, diff2)).toBe(false)
    })

    it('should return true for overlapping diffs', () => {
      const diff1: CodeDiff = { from: 5, to: 15, insert: 'test' }
      const diff2: CodeDiff = { from: 10, to: 20, insert: 'hello' }
      expect(hasConflict(diff1, diff2)).toBe(true)
    })

    it('should return false for adjacent diffs', () => {
      const diff1: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const diff2: CodeDiff = { from: 5, to: 10, insert: 'world' }
      expect(hasConflict(diff1, diff2)).toBe(false)
    })

    it('should return true when one diff contains the other', () => {
      const diff1: CodeDiff = { from: 0, to: 20, insert: 'test' }
      const diff2: CodeDiff = { from: 5, to: 15, insert: 'hello' }
      expect(hasConflict(diff1, diff2)).toBe(true)
    })
  })

  describe('resolveWithLWW', () => {
    it('should return later diff when timestamp2 is later', () => {
      const diff1: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const diff2: CodeDiff = { from: 0, to: 5, insert: 'world' }
      const timestamp1 = new Date('2024-01-01T00:00:00Z')
      const timestamp2 = new Date('2024-01-01T00:00:01Z')
      
      const result = resolveWithLWW(diff1, diff2, timestamp1, timestamp2)
      expect(result).toEqual(diff2)
    })

    it('should return earlier diff when timestamp1 is later', () => {
      const diff1: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const diff2: CodeDiff = { from: 0, to: 5, insert: 'world' }
      const timestamp1 = new Date('2024-01-01T00:00:01Z')
      const timestamp2 = new Date('2024-01-01T00:00:00Z')
      
      const result = resolveWithLWW(diff1, diff2, timestamp1, timestamp2)
      expect(result).toEqual(diff1)
    })

    it('should handle string timestamps', () => {
      const diff1: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const diff2: CodeDiff = { from: 0, to: 5, insert: 'world' }
      const timestamp1 = '2024-01-01T00:00:00Z'
      const timestamp2 = '2024-01-01T00:00:01Z'
      
      const result = resolveWithLWW(diff1, diff2, timestamp1, timestamp2)
      expect(result).toEqual(diff2)
    })

    it('should return first diff when timestamps are equal', () => {
      const diff1: CodeDiff = { from: 0, to: 5, insert: 'hello' }
      const diff2: CodeDiff = { from: 0, to: 5, insert: 'world' }
      const timestamp = new Date('2024-01-01T00:00:00Z')
      
      const result = resolveWithLWW(diff1, diff2, timestamp, timestamp)
      expect(result).toEqual(diff1)
    })
  })
})

