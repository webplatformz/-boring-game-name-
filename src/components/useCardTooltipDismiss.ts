import { useEffect, useRef } from 'react'

function isTooltipInteraction(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-card-tooltip-interactive]') !== null
}

export function useCardTooltipDismiss(open: boolean, onDismiss: () => void) {
  const openRef = useRef(open)
  const onDismissRef = useRef(onDismiss)
  const suppressClickRef = useRef(false)
  const dismissedPointerRef = useRef<number | null>(null)

  openRef.current = open
  onDismissRef.current = onDismiss

  useEffect(() => {
    const clearSuppression = () => {
      suppressClickRef.current = false
      dismissedPointerRef.current = null
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!openRef.current || isTooltipInteraction(event.target)) return

      event.stopPropagation()
      suppressClickRef.current = true
      dismissedPointerRef.current = event.pointerId
      onDismissRef.current()
    }

    const handlePointerEnd = (event: PointerEvent) => {
      if (dismissedPointerRef.current !== event.pointerId) return
      // A synthesized click follows pointerup synchronously. Clear on the next
      // task so that click is consumed, without swallowing a later interaction.
      setTimeout(clearSuppression, 0)
    }

    const handleClick = (event: MouseEvent) => {
      const shouldDismiss = openRef.current && !isTooltipInteraction(event.target)
      if (!suppressClickRef.current && !shouldDismiss) return

      event.preventDefault()
      event.stopPropagation()
      clearSuppression()
      if (shouldDismiss) onDismissRef.current()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('pointerup', handlePointerEnd, true)
    document.addEventListener('pointercancel', handlePointerEnd, true)
    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('pointerup', handlePointerEnd, true)
      document.removeEventListener('pointercancel', handlePointerEnd, true)
      document.removeEventListener('click', handleClick, true)
      clearSuppression()
    }
  }, [])
}
