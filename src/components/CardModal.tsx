import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Member } from '../data/members'
import { CARD_MAX_W, TIERS } from '../theme'
import { CardFront } from './CardFront'
import { CardGlow } from './CardGlow'
import { useI18n } from '../i18n'

const MONO = "'IBM Plex Mono',monospace"

/**
 * Full-screen card viewer. Renders nothing when `member` is null. Tapping it
 * plays the reverse of the entry animation and only then calls `onClose`,
 * which is what actually unmounts it.
 */
export function CardModal({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { t } = useI18n()
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (member) setClosing(false)
  }, [member])

  useEffect(() => {
    if (!member) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [member])

  if (!member) return null

  return createPortal(
    <div
      className="card-modal-overlay"
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
        className="card-modal-content"
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
        <div className="card-modal-card" style={{ width: '100%', maxWidth: CARD_MAX_W, aspectRatio: '336 / 504', position: 'relative' }}>
          <CardGlow rarity={member.ratings.rarity} />
          <CardFront
            member={member}
            foil
            style={{ boxShadow: `0 24px 60px -18px rgba(0,0,0,.6),0 0 0 1px ${TIERS[member.ratings.rarity].c}8c` }}
          />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: '#5C7391' }}>{t('tapClose')}</div>
      </div>
    </div>,
    document.body,
  )
}
