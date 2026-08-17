import type { CSSProperties, ReactNode } from 'react'
import { SwissCross } from '../components/CardBack'
import { portraitCreditsContent } from '../content/portraitCredits'
import { PORTRAIT_CREDITS } from '../data/portraitCredits'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

const card: CSSProperties = {
  padding: '14px 15px',
  borderRadius: 12,
  background: '#0B121D',
  border: '1px solid rgba(234,242,255,.11)',
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(94px, .7fr) minmax(0, 1.3fr)', gap: 10 }}>
      <div style={{ color: '#7187A4' }}>{label}</div>
      <div style={{ minWidth: 0, color: '#C7D5E7', overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  )
}

export function PortraitCredits({ onClose }: { onClose: () => void }) {
  const { language, t } = useI18n()
  const copy = portraitCreditsContent(language)

  return (
    <main style={{ padding: '22px 20px 34px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'riseIn 260ms ease-out' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <SwissCross size={24} />
          <div style={{ fontFamily: AB, fontSize: 13, letterSpacing: '.08em' }}>{copy.eyebrow}</div>
        </div>
        <button type="button" onClick={onClose} style={{ padding: '8px 11px', borderRadius: 9, border: '1px solid rgba(234,242,255,.16)', color: '#AFC0D5', fontFamily: MONO, fontSize: 10 }}>
          {t('backToGame')}
        </button>
      </header>

      <div>
        <h1 style={{ margin: 0, fontFamily: AB, fontSize: 29, lineHeight: 1.05, letterSpacing: '-.035em' }}>{copy.title}</h1>
        <p style={{ margin: '9px 0 0', color: '#9FB6D2', fontSize: 13, lineHeight: 1.55 }}>{copy.intro}</p>
        <p style={{ margin: '8px 0 0', color: '#C9B8FF', fontFamily: MONO, fontSize: 10 }}>{copy.summary(PORTRAIT_CREDITS.meta.count)}</p>
      </div>

      <div style={{ display: 'grid', gap: 9 }}>
        {PORTRAIT_CREDITS.credits.map((credit) => (
          <article key={credit.memberId} id={`portrait-credit-${credit.memberId}`} style={card}>
            <h2 style={{ margin: '0 0 9px', fontFamily: AB, fontSize: 13.5, color: '#EAF2FF' }}>{credit.memberName}</h2>
            <div style={{ display: 'grid', gap: 6, fontSize: 11, lineHeight: 1.45 }}>
              <Row label={copy.authorLabel}>{credit.author}</Row>
              {credit.attribution && (
                <Row label={copy.attributionLabel}>
                  <a href={credit.attribution} target="_blank" rel="noreferrer">{credit.attribution}</a>
                </Row>
              )}
              <Row label={copy.licenceLabel}>
                {credit.licenceUrl ? (
                  <a href={credit.licenceUrl} target="_blank" rel="noreferrer">{credit.licence}</a>
                ) : copy.attributionOnly}
              </Row>
              <Row label={copy.sourceLabel}>
                <div>{credit.title.replace(/^File:/, '')}</div>
                <a href={credit.source} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 2, fontFamily: MONO, fontSize: 9 }}>{copy.sourceLink}</a>
              </Row>
              <Row label={copy.changesLabel}>{copy.changesBody}</Row>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}

export default PortraitCredits
