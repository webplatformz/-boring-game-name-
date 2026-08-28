import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TrophyIcon } from './TrophyIcon'
import { RepeatIcon } from './RepeatIcon'
import { useI18n } from '../i18n'
import type { AchievementToastItem } from '../game/useAchievements'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"
const AUTO_DISMISS_MS = 4200

/**
 * Achievement-unlocked banner. Renders nothing when there's nothing to show.
 * Auto-dismisses, but a tap also closes it early. Portalled so it floats
 * above whichever screen is active when the unlock happens.
 */
export function AchievementToast({ item, onDismiss, onSelect }: {
  item: AchievementToastItem | null
  onDismiss: () => void
  onSelect: (achievementId: string) => void
}) {
  const { t } = useI18n()
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!item) return
    setClosing(false)
    const timer = setTimeout(() => setClosing(true), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [item])

  if (!item) return null
  const { achievement, rewardPacks } = item

  return createPortal(
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 16,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        // Keying on the achievement id forces a fresh DOM node per toast, so the
        // popIn keyframe animation replays even when consecutive toasts queue up
        // back-to-back (otherwise the `animation` style string is identical
        // between renders and the browser won't retrigger it).
        key={achievement.id}
        onClick={() => onSelect(achievement.id)}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return
          if (closing) onDismiss()
        }}
        style={{
          width: 'min(360px, calc(100vw - 32px))',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '12px 14px',
          borderRadius: 13,
          background: '#0B121D',
          border: '1px solid rgba(255,197,61,.45)',
          boxShadow: '0 14px 34px rgba(0,0,0,.5), 0 0 24px rgba(255,197,61,.18)',
          cursor: 'pointer',
          pointerEvents: 'auto',
          textAlign: 'left',
          // Horizontal centering lives on the wrapper above, so these keyframes
          // are free to animate transform (scale/translateY) on their own
          // without fighting a translateX(-50%) centering offset.
          animation: closing ? 'sinkOut 220ms ease-in forwards' : 'popIn 260ms ease-out backwards',
        }}
      >
        <div
          style={{
            flex: 'none',
            width: 34,
            height: 34,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,197,61,.14)',
            color: '#FFC53D',
          }}
        >
          {achievement.repeatEvery ? <RepeatIcon size={19} /> : <TrophyIcon size={18} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.14em', color: '#FFD87A' }}>
            {t('achievementUnlocked')}
          </div>
          <div style={{ fontFamily: AB, fontSize: 13, color: '#EAF2FF', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t(achievement.titleKey)}
          </div>
        </div>
        <div style={{ flex: 'none', fontFamily: MONO, fontSize: 10, color: '#FFC53D', whiteSpace: 'nowrap' }}>
          {t(rewardPacks === 1 ? 'achievementRewardOne' : 'achievementRewardMany', { count: rewardPacks })}
        </div>
      </button>
    </div>,
    document.body,
  )
}
