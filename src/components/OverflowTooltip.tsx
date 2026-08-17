import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'

interface Position {
  left: number
  top: number
  scale: number
  width: number
  maxHeight: number
}

/** Renders compact-card tooltips outside card overflow and transform boundaries. */
export function OverflowTooltip({
  anchor,
  width,
  children,
}: {
  anchor: RefObject<HTMLElement | null>
  width: number
  children: ReactNode
}) {
  const [position, setPosition] = useState<Position | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const update = () => {
      const element = anchor.current
      const tooltip = tooltipRef.current
      if (!element || !tooltip) return
      const rect = element.getBoundingClientRect()
      const margin = 8
      const gap = 9
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const scale = element.offsetWidth > 0 ? rect.width / element.offsetWidth : 1
      const renderedWidth = Math.min(width, (viewportWidth - margin * 2) / scale)
      const tooltipWidth = renderedWidth * scale
      const tooltipHeight = tooltip.offsetHeight * scale
      const left = Math.max(
        margin,
        Math.min(viewportWidth - tooltipWidth - margin, rect.left + rect.width / 2 - tooltipWidth / 2),
      )
      const above = rect.top - tooltipHeight - gap
      const below = rect.bottom + gap
      const top =
        above >= margin || below + tooltipHeight > viewportHeight - margin
          ? Math.max(margin, above)
          : below
      setPosition({
        left,
        top,
        scale,
        width: renderedWidth,
        maxHeight: (viewportHeight - margin * 2) / scale,
      })
    }

    update()
    const frame = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor, width])

  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        zIndex: 10000,
        width: position?.width ?? width,
        maxHeight: position?.maxHeight ?? 'calc(100vh - 16px)',
        overflowY: 'auto',
        transform: `scale(${position?.scale ?? 1})`,
        transformOrigin: 'top left',
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
