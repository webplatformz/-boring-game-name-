import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'

const STORAGE_KEY = 'bundeshaus-disclaimer-v1'
const MONO = "'IBM Plex Mono',monospace"

export function hasAcknowledgedDisclaimer(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'acknowledged'
  } catch {
    return false
  }
}

export function DisclaimerText() {
  const { t } = useI18n()

  return (
    <div style={{ display: 'grid', gap: 12, color: '#B8C8DC', fontSize: 14, lineHeight: 1.55 }}>
      <p style={{ margin: 0 }}>{t('disclaimerProject')}</p>
      <p style={{ margin: 0 }}>{t('disclaimerScores')}</p>
      <p style={{ margin: 0 }}>{t('disclaimerLimitations')}</p>
      <p style={{ margin: 0 }}>{t('disclaimerUse')}</p>
    </div>
  )
}

export function ProjectDisclaimer({ onAcknowledge }: { onAcknowledge: () => void }) {
  const { t } = useI18n()
  const acknowledgeButton = useRef<HTMLButtonElement>(null)
  const scrollContent = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    acknowledgeButton.current?.focus()
    // The focused action lives outside the scroller, so keep the reading area
    // at its beginning on every first presentation.
    scrollContent.current?.scrollTo({ top: 0 })

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const acknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'acknowledged')
    } catch {
      // The acknowledgement still applies for this session when storage is unavailable.
    }
    onAcknowledge()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-disclaimer-title"
      aria-describedby="project-disclaimer-description"
      onKeyDown={(event) => {
        if (event.key === 'Tab' || event.key === 'Escape') {
          event.preventDefault()
          acknowledgeButton.current?.focus()
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        background: 'rgba(4,7,12,.92)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 200ms ease-out backwards',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: 'calc(100dvh - 24px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(255,197,61,.4)',
          borderRadius: 18,
          background: 'linear-gradient(145deg, #111D2E, #090F18)',
          boxShadow: '0 28px 80px rgba(0,0,0,.55)',
          animation: 'riseIn 220ms ease-out backwards',
        }}
      >
        <div
          ref={scrollContent}
          className="project-disclaimer-scroll"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '24px clamp(18px, 5vw, 36px) 18px',
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', color: '#FFC53D' }}>
            {t('disclaimerEyebrow')}
          </div>
          <h1
            id="project-disclaimer-title"
            style={{ margin: '10px 0 14px', fontSize: 'clamp(24px, 6vw, 34px)', lineHeight: 1.05 }}
          >
            {t('disclaimerTitle')}
          </h1>
          <div id="project-disclaimer-description">
            <DisclaimerText />
          </div>
        </div>
        <div
          style={{
            flex: 'none',
            padding: '14px clamp(18px, 5vw, 36px) 20px',
            borderTop: '1px solid rgba(234,242,255,.1)',
            background: 'rgba(9,15,24,.96)',
          }}
        >
          <button
            ref={acknowledgeButton}
            type="button"
            onClick={acknowledge}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: 10,
              background: '#FFC53D',
              color: '#07101A',
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '.08em',
              boxShadow: '0 8px 24px rgba(255,197,61,.18)',
            }}
          >
            {t('disclaimerAcknowledge')}
          </button>
        </div>
      </div>
    </div>
  )
}
