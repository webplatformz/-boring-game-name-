import { useEffect, useState } from 'react'
import type { Member } from '../data/members'
import { TIERS } from '../theme'
import { CardFront } from './CardFront'

const MONO = "'IBM Plex Mono',monospace"

/**
 * Full-screen card viewer. Renders nothing when `member` is null. Tapping it
 * plays the reverse of the entry animation and only then calls `onClose`,
 * which is what actually unmounts it.
 */
export function CardModal({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (member) setClosing(false)
  }, [member])

  if (!member) return null

  return (
    <div
      onClick={() => setClosing(true)}
      onAnimationEnd={(e) => {
        // Ignore bubbled animation events from the card art's own loops.
        if (e.target !== e.currentTarget) return
        if (closing) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(4,7,12,.86)',
        backdropFilter: 'blur(4px)',
        cursor: 'pointer',
        pointerEvents: closing ? 'none' : 'auto',
        // `backwards` applies the first keyframe before the animation starts,
        // otherwise the opaque backdrop flashes for a frame on mount. The
        // backdrop only fades — transforming a backdrop-filtered layer flickers.
        animation: closing ? 'fadeOut 200ms ease-in forwards' : 'fadeIn 200ms ease-out backwards',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '20px 20px 40px',
          animation: closing ? 'sinkOut 200ms ease-in forwards' : 'riseIn 200ms ease-out backwards',
        }}
      >
        <div style={{ width: '100%', maxWidth: 300, aspectRatio: '336 / 504', position: 'relative' }}>
          <CardFront
            member={member}
            foil
            style={{ boxShadow: `0 24px 60px -18px rgba(0,0,0,.6),0 0 0 1px ${TIERS[member.rarity].c}8c` }}
          />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: '#5C7391' }}>TAP TO CLOSE</div>
      </div>
    </div>
  )
}
