import type { CSSProperties } from 'react'
import { PACK_CLIP } from '../theme'
import type { GameState } from '../game/useGame'
import { PackFoil, PackLabel, TearTab, PACK_W, PACK_H, packBodyBg } from '../components/PackArt'
import { PACK_SIZE } from '../game/pack'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export function Tear({ state }: { state: GameState }) {
  const { tear, tearing, ripped } = state
  const tearPct = Math.min(100, (tear / 60) * 100)

  const stripStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 38,
    zIndex: 3,
    borderRadius: '4px 4px 0 0',
    overflow: 'hidden',
    background: '#FFC53D',
    ...(ripped
      ? {
          transform: 'translateY(300px) translateX(26px) rotate(16deg)',
          opacity: 0,
          transition: 'transform 520ms cubic-bezier(.3,.7,.2,1),opacity 460ms ease-out',
        }
      : {
          transform: `translateY(${tear}px) rotate(${tear * 0.02}deg)`,
          transition: tearing ? 'none' : 'transform 400ms cubic-bezier(.34,1.4,.64,1)',
        }),
  }

  const bodyStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PACK_W,
    height: PACK_H,
    background: packBodyBg,
    overflow: 'hidden',
    clipPath: PACK_CLIP,
    ...(ripped
      ? { transform: 'scale(.93) translateY(10px)', opacity: 0.18, transition: 'transform 500ms ease-out,opacity 500ms ease-out' }
      : { transition: 'transform 300ms ease-out' }),
    filter: `drop-shadow(0 16px 26px rgba(0,0,0,.6)) drop-shadow(0 0 ${ripped ? 60 : 10 + tearPct * 0.25}px rgba(255,197,61,${ripped ? 0.75 : 0.18 + tearPct * 0.004}))`,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '30px 20px', touchAction: 'none', userSelect: 'none' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: AB, fontSize: 20, letterSpacing: '-.02em' }}>TEARING IT OPEN</div>
        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: '#5C7391' }}>FIVE MEMBERS INCOMING</div>
      </div>

      <div style={{ position: 'relative', width: PACK_W, height: PACK_H }}>
        {/* the golden tear-strip */}
        <div style={stripStyle}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(255,197,61,.35),rgba(255,197,61,.08))', borderRadius: '4px 4px 0 0' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(112deg,rgba(255,255,255,.12) 0 1px,transparent 1px 8px)' }} />
          <TearTab dark />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'repeating-linear-gradient(90deg,rgba(7,12,19,.8) 0 4px,transparent 4px 9px)' }} />
        </div>

        {/* the pack body */}
        <div style={bodyStyle}>
          <PackFoil />
          <PackLabel />
        </div>
      </div>

      {/* incoming pips */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
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
