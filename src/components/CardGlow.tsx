import { useEffect, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { RarityKey } from '../theme'
import { HOLO, TIERS } from '../theme'

const alpha = (a: number) =>
  Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, '0')

// Fades the rotating rays out before they reach the layer's square edges. The
// mythic variant is softer/tighter so its prismatic arms stay distinct instead
// of smearing into one bright wash.
const RAY_MASK = 'radial-gradient(closest-side,#000 26%,rgba(0,0,0,.7) 60%,transparent 88%)'
const RAY_MASK_SOFT = 'radial-gradient(closest-side,#000 18%,rgba(0,0,0,.55) 52%,transparent 78%)'

/**
 * Backdrop glow rendered *behind* a card. Intensity comes from the tier's
 * `glow` factor, so rarer pulls bloom bigger, brighter and faster. Render it as
 * a sibling right before the card inside a positioned wrapper.
 */
export function CardGlow({ rarity, style }: { rarity: RarityKey; style?: CSSProperties }) {
  const t = TIERS[rarity]
  const g = t.glow
  if (g <= 0) return null

  const spread = Math.round(10 + 26 * g) // how far the bloom reaches past the card
  const rays = g >= 0.65 // rays from rare upwards
  const isMythic = rarity === 'mythic'
  const rayPaint = isMythic
    ? HOLO
    : `conic-gradient(from 0deg,transparent 0deg,${t.c} 24deg,transparent 52deg,transparent 90deg,${t.c} 114deg,transparent 142deg,transparent 180deg,${t.c} 204deg,transparent 232deg,transparent 270deg,${t.c} 294deg,transparent 322deg)`
  // The mythic signature colour is near-white, which blooms grey — so its
  // backdrop borrows the prismatic hues of the foil instead.
  const bloomPaint = isMythic
    ? `radial-gradient(closest-side,#FFD700${alpha(0.62 * g)},#FF3D8B${alpha(0.52 * g)} 38%,#8B5CF6${alpha(0.4 * g)} 58%,#7CF2FF${alpha(0.26 * g)} 72%,transparent 84%)`
    : `radial-gradient(closest-side,${t.c}${alpha(0.85 * g)},${t.c}${alpha(0.52 * g)} 42%,${t.c}${alpha(0.22 * g)} 62%,transparent 80%)`

  return (
    <div aria-hidden style={{ position: 'absolute', inset: `-${spread}%`, pointerEvents: 'none', ...style }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: bloomPaint,
          filter: `blur(${Math.round(16 + 22 * g)}px) saturate(${(1.5 + 0.9 * g).toFixed(2)})`,
          animation: `glowPulse ${(5.4 - 1.6 * g).toFixed(2)}s ease-in-out infinite`,
        }}
      />
      {rays && (
        <div
          style={{
            position: 'absolute',
            inset: isMythic ? '-8%' : '-14%',
            background: rayPaint,
            opacity: (isMythic ? 0.3 : 0.58) * g,
            filter: `blur(${isMythic ? 7 : 5}px) saturate(${isMythic ? 1.9 : 1.7})`,
            mixBlendMode: 'screen',
            maskImage: isMythic ? RAY_MASK_SOFT : RAY_MASK,
            WebkitMaskImage: isMythic ? RAY_MASK_SOFT : RAY_MASK,
            animation: `holoSpin ${(isMythic ? 20 - 7 * g : 15 - 5 * g).toFixed(2)}s linear infinite`,
          }}
        />
      )}
    </div>
  )
}

/**
 * Same glow, but painted in a viewport-anchored layer tracking `anchor`'s box.
 * The app shell clips its content column with `overflow: hidden`, which would
 * otherwise cut the bloom off at the column edges; a fixed layer is only
 * clipped by the viewport, so the glow can spill out over the full window.
 */
export function FixedCardGlow({ rarity, anchor }: { rarity: RarityKey; anchor: RefObject<HTMLElement | null> }) {
  const [box, setBox] = useState<DOMRect | null>(null)

  useEffect(() => {
    const el = anchor.current
    if (!el) return
    const update = () => setBox(el.getBoundingClientRect())
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor])

  if (!box) return null

  return (
    <div
      aria-hidden
      style={{ position: 'fixed', left: box.left, top: box.top, width: box.width, height: box.height, pointerEvents: 'none' }}
    >
      <CardGlow rarity={rarity} />
    </div>
  )
}
