/**
 * Utility functions for resolving conflicts in collaborative editing.
 * Implements basic Operational Transformation (OT) for non-overlapping changes.
 */

import { CodeDiff, transformDiff } from './diffUtils'

export interface ConflictInfo {
  hasConflict: boolean
  canResolve: boolean
  resolvedDiff?: CodeDiff
  message?: string
}

/**
 * Resolve conflicts between local and remote changes.
 * Uses basic OT (Operational Transformation) for non-overlapping changes.
 * 
 * @param localDiff - Local change that hasn't been sent yet
 * @param remoteDiff - Remote change received from another user
 * @returns ConflictInfo with resolution result
 */
export function resolveConflict(localDiff: CodeDiff | null, remoteDiff: CodeDiff): ConflictInfo {
  if (!localDiff) {
    // No local change, apply remote change
    return {
      hasConflict: false,
      canResolve: true,
      resolvedDiff: remoteDiff
    }
  }

  // Try to transform local diff to account for remote change
  const transformedDiff = transformDiff(localDiff, remoteDiff)

  if (transformedDiff === null) {
    // Conflict detected - changes overlap
    return {
      hasConflict: true,
      canResolve: false,
      message: 'Los cambios se superponen. Se aplicará el cambio remoto.'
    }
  }

  // No conflict or successfully transformed
  return {
    hasConflict: false,
    canResolve: true,
    resolvedDiff: transformedDiff
  }
}

/**
 * Check if two diffs conflict (overlap).
 * 
 * @param diff1 - First diff
 * @param diff2 - Second diff
 * @returns True if diffs conflict
 */
export function hasConflict(diff1: CodeDiff, diff2: CodeDiff): boolean {
  // Check if changes overlap
  const diff1End = diff1.to
  const diff2End = diff2.to

  // Check if ranges overlap
  const rangesOverlap = !(
    diff1.to <= diff2.from || 
    diff2.to <= diff1.from
  )

  return rangesOverlap
}

/**
 * Apply Last-Write-Wins (LWW) strategy for conflicts.
 * Returns the diff with the later timestamp.
 * 
 * @param diff1 - First diff with timestamp
 * @param diff2 - Second diff with timestamp
 * @param timestamp1 - Timestamp of first diff
 * @param timestamp2 - Timestamp of second diff
 * @returns The diff to apply (the later one)
 */
export function resolveWithLWW(
  diff1: CodeDiff,
  diff2: CodeDiff,
  timestamp1: string | Date,
  timestamp2: string | Date
): CodeDiff {
  const time1 = typeof timestamp1 === 'string' ? new Date(timestamp1).getTime() : timestamp1.getTime()
  const time2 = typeof timestamp2 === 'string' ? new Date(timestamp2).getTime() : timestamp2.getTime()

  // Return the later diff
  return time2 > time1 ? diff2 : diff1
}

