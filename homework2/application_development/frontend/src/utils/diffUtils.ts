/**
 * Utility functions for calculating and applying diffs between code versions.
 */

export interface CodeDiff {
  from: number
  to: number
  insert: string
  deleteLength?: number
}

/**
 * Calculate a simple diff between two strings.
 * Returns the change needed to transform oldCode into newCode.
 * 
 * @param oldCode - Previous version of the code
 * @param newCode - New version of the code
 * @returns Diff object or null if no change
 */
export function calculateDiff(oldCode: string, newCode: string): CodeDiff | null {
  if (oldCode === newCode) {
    return null
  }

  // Find the common prefix
  let prefixLength = 0
  const minLength = Math.min(oldCode.length, newCode.length)
  while (prefixLength < minLength && oldCode[prefixLength] === newCode[prefixLength]) {
    prefixLength++
  }

  // Find the common suffix
  let suffixLength = 0
  const maxSuffixLength = Math.min(
    oldCode.length - prefixLength,
    newCode.length - prefixLength
  )
  while (
    suffixLength < maxSuffixLength &&
    oldCode[oldCode.length - suffixLength - 1] === newCode[newCode.length - suffixLength - 1]
  ) {
    suffixLength++
  }

  // Calculate the changed region
  const from = prefixLength
  const to = oldCode.length - suffixLength
  const insert = newCode.slice(prefixLength, newCode.length - suffixLength)
  const deleteLength = to - from

  return {
    from,
    to,
    insert,
    deleteLength: deleteLength > 0 ? deleteLength : undefined
  }
}

/**
 * Apply a diff to a string.
 * 
 * @param code - Current code
 * @param diff - Diff to apply
 * @returns Updated code
 */
export function applyDiff(code: string, diff: CodeDiff): string {
  const before = code.slice(0, diff.from)
  const after = code.slice(diff.to)
  return before + diff.insert + after
}

/**
 * Check if a diff can be safely applied to the current code.
 * 
 * @param code - Current code
 * @param diff - Diff to check
 * @returns True if diff can be applied safely
 */
export function canApplyDiff(code: string, diff: CodeDiff): boolean {
  // Check if the diff position is valid
  if (diff.from < 0 || diff.to < diff.from || diff.to > code.length) {
    return false
  }

  // Check if the context matches (simple validation)
  // For a more robust check, we could verify the content at 'from' and 'to' positions
  return true
}

/**
 * Check if sending the full code is more efficient than sending a diff.
 * 
 * @param diff - Diff to check
 * @param codeLength - Length of the current code
 * @returns True if full code should be sent instead
 */
export function shouldSendFullCode(diff: CodeDiff | null, codeLength: number): boolean {
  if (!diff) {
    return false
  }

  // If diff is larger than 50% of the code, send full code instead
  const diffSize = diff.insert.length + (diff.deleteLength || 0)
  return diffSize > codeLength * 0.5
}

/**
 * Transform a diff to account for a change that happened before it.
 * Simple OT (Operational Transformation) for non-overlapping changes.
 * 
 * @param diff - Diff to transform
 * @param otherDiff - Diff that happened before
 * @returns Transformed diff or null if conflict
 */
export function transformDiff(diff: CodeDiff, otherDiff: CodeDiff): CodeDiff | null {
  // If changes don't overlap, we can apply both
  if (diff.from >= otherDiff.to) {
    // diff is after otherDiff, adjust positions
    const offset = otherDiff.insert.length - (otherDiff.deleteLength || 0)
    return {
      ...diff,
      from: diff.from + offset,
      to: diff.to + offset
    }
  } else if (diff.to <= otherDiff.from) {
    // diff is before otherDiff, no adjustment needed
    return diff
  } else {
    // Changes overlap - conflict detected
    return null
  }
}

