import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'

interface Position {
  left: number
  top: number
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
      const tooltipRect = tooltip.getBoundingClientRect()
      const margin = 8
      const gap = 9
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const tooltipWidth = tooltipRect.width
      const tooltipHeight = tooltipRect.height
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
      setPosition({ left, top })
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
        width: `min(${width}px, calc(100vw - 16px))`,
        maxHeight: 'calc(100vh - 16px)',
        overflowY: 'auto',
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
