import { useLayoutEffect, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'

interface Position {
  left: number
  top: number
  below: boolean
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

  useLayoutEffect(() => {
    const update = () => {
      const element = anchor.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2))
      const below = rect.top < 180
      setPosition({ left, top: below ? rect.bottom + 9 : rect.top - 9, below })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor, width])

  if (!position) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        zIndex: 10000,
        width,
        transform: position.below ? undefined : 'translateY(-100%)',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
