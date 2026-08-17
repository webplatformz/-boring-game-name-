import type { CSSProperties } from 'react'
import { useI18n } from '../i18n'
import type { Language } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

interface OpeningStatsProps {
  cardsRevealed: number
  packsOpened: number
  compact?: boolean
  style?: CSSProperties
}

/** Compact lifetime totals shared by the Home and Collection screens. */
export function OpeningStats({ cardsRevealed, packsOpened, compact = false, style }: OpeningStatsProps) {
  const { language, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t('openingStats')}
      style={{
        padding: '9px 12px 10px',
        borderRadius: 13,
        background: '#0B121D',
        border: '1px solid rgba(234,242,255,.1)',
        ...style,
      }}
    >
      {!compact && (
        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.13em', color: '#5C7391' }}>
          {t('openingStats')}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: compact ? 8 : 12, marginTop: compact ? 0 : 3 }}>
        <Stat value={cardsRevealed} label={t('cardsRevealed')} language={language} stacked={compact} />
        <Stat value={packsOpened} label={t('packsOpened')} language={language} stacked={compact} />
      </div>
    </div>
  )
}

function Stat({
  value,
  label,
  language,
  stacked,
}: {
  value: number
  label: string
  language: Language
  stacked: boolean
}) {
  const valueElement = (
    <div style={{ flex: 'none', marginTop: stacked ? 2 : 0, fontFamily: AB, fontSize: 19, lineHeight: 1, color: '#EAF2FF' }}>
      {value.toLocaleString(language)}
    </div>
  )
  const labelElement = (
    <div
      style={{
        minWidth: 0,
        fontFamily: MONO,
        fontSize: stacked ? 7 : 8,
        lineHeight: 1.15,
        letterSpacing: stacked ? '.06em' : '.1em',
        color: '#7690AE',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  )

  return (
    <div
      style={{
        minWidth: 0,
        display: stacked ? 'block' : 'flex',
        alignItems: stacked ? undefined : 'baseline',
        gap: stacked ? undefined : 5,
      }}
    >
      {stacked ? labelElement : valueElement}
      {stacked ? valueElement : labelElement}
    </div>
  )
}
