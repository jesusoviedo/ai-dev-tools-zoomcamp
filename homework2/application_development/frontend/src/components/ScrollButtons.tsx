import { useState, useEffect, useRef } from 'react'
import './ScrollButtons.css'

interface ScrollButtonsProps {
  containerRef: React.RefObject<HTMLDivElement>
}

export default function ScrollButtons({ containerRef }: ScrollButtonsProps) {
  const [showUp, setShowUp] = useState(false)
  const [showDown, setShowDown] = useState(false)

  const checkScroll = () => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const hasScroll = scrollHeight > clientHeight
    const isAtTop = scrollTop <= 10
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10

    setShowUp(hasScroll && !isAtTop)
    setShowDown(hasScroll && !isAtBottom)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    checkScroll()
    container.addEventListener('scroll', checkScroll)
    // Check on resize
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', checkScroll)
      resizeObserver.disconnect()
    }
  }, [containerRef])

  const scrollUp = () => {
    if (!containerRef.current) return
    containerRef.current.scrollBy({ top: -100, behavior: 'smooth' })
  }

  const scrollDown = () => {
    if (!containerRef.current) return
    containerRef.current.scrollBy({ top: 100, behavior: 'smooth' })
  }

  if (!showUp && !showDown) return null

  return (
    <div className="scroll-buttons-container">
      {showUp && (
        <button
          className="scroll-button scroll-button-up"
          onClick={scrollUp}
          aria-label="Scroll up"
          title="Scroll up"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      {showDown && (
        <button
          className="scroll-button scroll-button-down"
          onClick={scrollDown}
          aria-label="Scroll down"
          title="Scroll down"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

