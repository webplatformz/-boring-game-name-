import type { CSSProperties } from 'react'
import { LEGISLATURE } from '../theme'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

/** The card's reverse — Bundeshaus pack art. `style` supplies the flip/shadow. */
export function CardBack({ style }: { style?: CSSProperties }) {
  const face: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 18,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    background: 'linear-gradient(168deg,#1B2A44 0%,#101B2E 46%,#0A121F 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    ...style,
  }
  return (
    <div style={face}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          background: 'repeating-linear-gradient(112deg,rgba(255,197,61,.07) 0 1px,transparent 1px 10px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(70% 50% at 50% 46%,rgba(255,197,61,.12),transparent 70%)',
        }}
      />
      <SwissCross size={56} />
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <div style={{ fontFamily: AB, fontSize: 15, letterSpacing: '.16em', color: '#EAF2FF' }}>BUNDESHAUS</div>
        <div style={{ marginTop: 5, fontFamily: MONO, fontSize: 9, letterSpacing: '.24em', color: '#FFD87A' }}>
          LEGISLATURE {LEGISLATURE}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 16, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 52, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,197,61,.7),transparent)' }} />
      </div>
    </div>
  )
}

/** The red Swiss-cross badge used across the pack chrome. */
export function SwissCross({ size = 36 }: { size?: number }) {
  const arm = size * 0.55 // white cross arm length
  const thick = size * 0.135
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: size * 0.21,
        background: '#E4002B',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 6px 18px rgba(0,0,0,.55)',
        flex: 'none',
      }}
    >
      <div style={{ width: arm, height: thick, background: '#fff', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: (arm - thick) / 2,
            top: -(arm - thick) / 2,
            width: thick,
            height: arm,
            background: '#fff',
          }}
        />
      </div>
    </div>
  )
}
