import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, RefObject } from 'react'
import type { RarityKey } from '../theme'
import { TIERS } from '../theme'

const alpha = (a: number) =>
  Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, '0')

// Lazily-created portal target for FixedCardGlow, inserted as the very first
// child of <body> (before #root). Elements at the same stacking level
// (z-index: auto) paint in DOM order, so keeping this node ahead of #root in
// the tree — rather than appending to the end of body, which a naive portal
// would do — is what keeps the glow behind the app's content without resorting
// to a negative z-index (which would sink it below the app shell's own opaque
// background, since that background is on a non-positioned element and
// therefore always paints above negative z-index content regardless of DOM
// order).
let glowPortalRoot: HTMLDivElement | null = null
function getGlowPortalRoot(): HTMLDivElement {
  if (glowPortalRoot && glowPortalRoot.isConnected) return glowPortalRoot
  const el = document.createElement('div')
  el.dataset.cardGlowLayer = 'backdrop'
  document.body.insertBefore(el, document.body.firstChild)
  glowPortalRoot = el
  return el
}

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
    ? 'conic-gradient(from 8deg,transparent 0 15deg,#73e8ff 29deg,transparent 52deg,transparent 82deg,#ff78dc 101deg,transparent 127deg,transparent 164deg,#ffe49b 184deg,transparent 216deg,transparent 250deg,#b38cff 273deg,transparent 303deg,transparent 326deg,#67f4dc 340deg,transparent 356deg)'
    : `conic-gradient(from 0deg,transparent 0deg,${t.c} 24deg,transparent 52deg,transparent 90deg,${t.c} 114deg,transparent 142deg,transparent 180deg,${t.c} 204deg,transparent 232deg,transparent 270deg,${t.c} 294deg,transparent 322deg)`
  // The mythic signature colour is near-white, which blooms grey — so its
  // backdrop borrows the prismatic hues of the foil instead.
  const bloomPaint = isMythic
    ? `radial-gradient(closest-side,#FFF0B0${alpha(0.68 * g)},#6BDBFF${alpha(0.56 * g)} 32%,#B783FF${alpha(0.48 * g)} 50%,#FF62C8${alpha(0.3 * g)} 66%,#57F0DC${alpha(0.2 * g)} 76%,transparent 86%)`
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
            opacity: (isMythic ? 0.43 : 0.58) * g,
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
 *
 * Portalled onto a dedicated node ahead of #root in the DOM (see
 * `getGlowPortalRoot`) rather than rendered inline: `position: fixed`
 * normally resolves against the viewport, but any ancestor with a
 * `transform` (or `will-change: transform`) becomes the containing block
 * instead — which `.screen-transition`'s entrance animation does. Without
 * the portal, the glow would be positioned relative to that (narrower,
 * centred) column rather than the viewport, drifting further off-centre the
 * wider the viewport got past the column's max-width.
 */
export function FixedCardGlow({
  rarity,
  anchor,
  opacity = 1,
}: {
  rarity: RarityKey
  anchor: RefObject<HTMLElement | null>
  opacity?: number
}) {
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

  return createPortal(
    <div
      aria-hidden
      data-testid="fixed-card-glow"
      style={{
        position: 'fixed',
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        opacity,
        pointerEvents: 'none',
        transition: 'opacity 300ms ease-out',
      }}
    >
      <CardGlow rarity={rarity} />
    </div>,
    getGlowPortalRoot(),
  )
}
