import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CARD_MAX_W, PACK_GROW_MS, PACK_RIP_MS, PACK_STRIP_CLIP, PACK_TORN_CLIP } from '../theme'
import type { GameState } from '../game/useGame'
import { PACK_H, PACK_TOP_H, PACK_W, PackFoil, PackLabel, PackShell, PackTop, packBodyBg } from '../components/PackArt'
import { PACK_SIZE } from '../game/pack'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"
const GROW_EASE = 'cubic-bezier(.34,1.06,.4,1)'

/** Scale factor that takes the Home-sized pack up to the revealed card width. */
function useCardScale() {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / PACK_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, scale }
}

export function Tear({ state }: { state: GameState }) {
  const { ripped, grown } = state
  const { ref: sizerRef, scale } = useCardScale()

  // One uninterrupted pull: the strip goes from seated to gone in a single move.
  const stripStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: PACK_TOP_H,
    zIndex: 3,
    overflow: 'hidden',
    background: packBodyBg,
    clipPath: PACK_STRIP_CLIP,
    transform: ripped ? 'translateY(330px) translateX(30px) rotate(17deg)' : 'none',
    opacity: ripped ? 0 : 1,
    transition: `transform ${PACK_RIP_MS}ms cubic-bezier(.5,.02,.35,1),opacity ${PACK_RIP_MS * 0.45}ms ease-in ${PACK_RIP_MS * 0.5}ms`,
  }

  // The strip's band is cut out of the body from the start (the strip covers it
  // while sealed), so pulling the strip away leaves a real hole with a torn edge.
  const bodyStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    clipPath: PACK_TORN_CLIP,
    ...(ripped
      ? { transform: 'scale(.93) translateY(10px)', opacity: 0.18, transition: `transform ${PACK_RIP_MS}ms ease-out,opacity ${PACK_RIP_MS}ms ease-in,filter ${PACK_RIP_MS}ms ease-out` }
      : { transition: 'transform 300ms ease-out' }),
    filter: `drop-shadow(0 16px 26px rgba(0,0,0,.6)) drop-shadow(0 0 ${ripped ? 60 : 10}px rgba(255,197,61,${ripped ? 0.75 : 0.18}))`,
  }

  // Sizer holds the final (card-sized) footprint so nothing reflows while the
  // pack zooms; the pack itself is centred inside it and scaled up.
  const zoomStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: PACK_W,
    height: PACK_H,
    marginLeft: -PACK_W / 2,
    marginTop: -PACK_H / 2,
    transform: `scale(${grown ? scale : 1})`,
    transition: `transform ${PACK_GROW_MS}ms ${GROW_EASE}`,
  }

  const introStyle = (delay: number): CSSProperties => ({
    opacity: grown ? 1 : 0,
    transform: grown ? 'none' : 'translateY(6px)',
    transition: `opacity 320ms ease-out ${delay}ms,transform 320ms ease-out ${delay}ms`,
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '30px 20px', touchAction: 'none', userSelect: 'none' }}>
      <div style={{ textAlign: 'center', ...introStyle(60) }}>
        <div style={{ fontFamily: AB, fontSize: 20, letterSpacing: '-.02em' }}>TEARING IT OPEN</div>
        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: '#5C7391' }}>FIVE MEMBERS INCOMING</div>
      </div>

      <div ref={sizerRef} style={{ position: 'relative', width: '100%', maxWidth: CARD_MAX_W, aspectRatio: '2 / 3' }}>
        <div style={zoomStyle}>
          {/* the perforated tear-strip */}
          <div style={stripStyle}>
            <PackFoil />
            <PackTop />
          </div>

          {/* the pack body */}
          <PackShell style={bodyStyle}>
            {/* lit lip along the ragged edge — only paints where the body survives */}
            <div
              style={{ position: 'absolute', left: 0, right: 0, top: PACK_TOP_H - 9, height: 9, background: 'linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,197,61,.14) 45%,transparent)' }}
            />
            <PackLabel />
          </PackShell>
        </div>
      </div>

      {/* incoming pips */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', ...introStyle(140) }}>
        {Array.from({ length: PACK_SIZE }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: 99,
              background: ripped ? 'rgba(255,197,61,.85)' : 'rgba(234,242,255,.18)',
              transition: `background 260ms ease-out ${i * 34}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
