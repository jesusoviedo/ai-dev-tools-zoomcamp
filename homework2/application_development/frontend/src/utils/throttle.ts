/**
 * Utility functions for throttling and debouncing.
 */

/**
 * Throttle function - limits how often a function can be called.
 * Ensures the function is called at most once per specified time period.
 * 
 * @param func - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timeoutId: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T> | null = null

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    // Store the latest arguments
    lastArgs = args

    if (timeSinceLastCall >= delay) {
      // Enough time has passed, call immediately
      lastCall = now
      func.apply(this, args)
      lastArgs = null
    } else {
      // Schedule call for later
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          if (lastArgs !== null) {
            lastCall = Date.now()
            func.apply(this, lastArgs)
            lastArgs = null
          }
          timeoutId = null
        }, delay - timeSinceLastCall)
      }
    }
  }
}

/**
 * Debounce function - delays function execution until after a specified time
 * has passed since the last invocation.
 * 
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Throttle with leading and trailing options.
 * 
 * @param func - Function to throttle
 * @param delay - Delay in milliseconds
 * @param options - Options object
 * @param options.leading - Call on leading edge (default: true)
 * @param options.trailing - Call on trailing edge (default: true)
 * @returns Throttled function
 */
export function throttleWithOptions<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options
  let lastCall = 0
  let timeoutId: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T> | null = null

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    lastArgs = args

    if (timeSinceLastCall >= delay) {
      if (leading) {
        lastCall = now
        func.apply(this, args)
        lastArgs = null
      } else if (trailing) {
        // Leading is false but enough time passed, schedule trailing call
        if (timeoutId === null) {
          timeoutId = setTimeout(() => {
            if (lastArgs !== null) {
              lastCall = Date.now()
              func.apply(this, lastArgs)
              lastArgs = null
            }
            timeoutId = null
          }, delay)
        }
      }
    } else {
      if (trailing && timeoutId === null) {
        timeoutId = setTimeout(() => {
          if (lastArgs !== null) {
            lastCall = Date.now()
            func.apply(this, lastArgs)
            lastArgs = null
          }
          timeoutId = null
        }, delay - timeSinceLastCall)
      }
    }
  }
}

