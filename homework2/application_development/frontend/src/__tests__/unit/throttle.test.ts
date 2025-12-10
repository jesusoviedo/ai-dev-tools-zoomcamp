import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { throttle, debounce, throttleWithOptions } from '../../utils/throttle'

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call function immediately on first call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('test')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('test')
  })

  it('should throttle multiple rapid calls', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('call1')
    throttled('call2')
    throttled('call3')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('call1')

    // Advance time
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith('call3')
  })

  it('should call function after delay when called multiple times', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('call1')
    expect(fn).toHaveBeenCalledTimes(1) // First call is immediate
    
    vi.advanceTimersByTime(50)
    throttled('call2')
    expect(fn).toHaveBeenCalledTimes(1) // Still only 1 call

    vi.advanceTimersByTime(50) // Total 100ms, should trigger call2
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith('call1')
    expect(fn).toHaveBeenCalledWith('call2')
  })

  it('should call function immediately if enough time has passed', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('call1')
    vi.advanceTimersByTime(100)
    throttled('call2')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith('call1')
    expect(fn).toHaveBeenCalledWith('call2')
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should delay function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('test')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('test')
  })

  it('should reset timer on multiple calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('call1')
    vi.advanceTimersByTime(50)
    debounced('call2')
    vi.advanceTimersByTime(50)
    debounced('call3')

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('call3')
  })

  it('should cancel previous calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('call1')
    vi.advanceTimersByTime(50)
    debounced('call2')
    vi.advanceTimersByTime(50)
    debounced('call3')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('call3')
  })
})

describe('throttleWithOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call on leading edge by default', () => {
    const fn = vi.fn()
    const throttled = throttleWithOptions(fn, 100, { leading: true })

    throttled('test')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should not call on leading edge when disabled', () => {
    const fn = vi.fn()
    const throttled = throttleWithOptions(fn, 100, { leading: false, trailing: true })

    throttled('test')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('test')
  })

  it('should call on trailing edge by default', () => {
    const fn = vi.fn()
    const throttled = throttleWithOptions(fn, 100, { trailing: true })

    throttled('call1')
    throttled('call2')
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should not call on trailing edge when disabled', () => {
    const fn = vi.fn()
    const throttled = throttleWithOptions(fn, 100, { trailing: false })

    throttled('call1')
    throttled('call2')
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

