import type { CSSProperties } from 'react'
import { PARLIAMENT_PROVENANCE } from '../data/provenance'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

const labelStyle: CSSProperties = {
  color: '#7187A4',
  fontFamily: MONO,
  fontSize: 9,
  letterSpacing: '.09em',
  textTransform: 'uppercase',
}

export function DataProvenance({ showTitle = true }: { showTitle?: boolean }) {
  const { t } = useI18n()
  const provenance = PARLIAMENT_PROVENANCE

  return (
    <div style={{ display: 'grid', gap: 13, color: '#9FB6D2', fontSize: 12, lineHeight: 1.55 }}>
      {showTitle && (
        <h2 style={{ margin: 0, fontFamily: AB, fontSize: 15, color: '#C9B8FF' }}>
          {t('provenanceTitle')}
        </h2>
      )}

      <dl
        style={{
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(116px, auto) 1fr',
          gap: '7px 12px',
          alignItems: 'baseline',
        }}
      >
        <dt style={labelStyle}>{t('provenanceAttributionLabel')}</dt>
        <dd style={{ margin: 0, color: '#EAF2FF', fontWeight: 700 }}>
          {provenance.requiredAttribution}
        </dd>
        <dt style={labelStyle}>{t('provenanceRetrievedLabel')}</dt>
        <dd style={{ margin: 0, color: '#EAF2FF', fontFamily: MONO }}>
          <time dateTime={provenance.retrievedAt}>{provenance.retrievedAt}</time>
        </dd>
        <dt style={labelStyle}>{t('provenanceVersionLabel')}</dt>
        <dd style={{ margin: 0, color: '#EAF2FF', fontFamily: MONO, overflowWrap: 'anywhere' }}>
          {provenance.datasetVersion}
        </dd>
        <dt style={labelStyle}>{t('provenanceAlgorithmLabel')}</dt>
        <dd style={{ margin: 0, color: '#EAF2FF', fontFamily: MONO }}>
          v{provenance.projectDerivation.algorithmVersion}
        </dd>
      </dl>

      <div>
        <div style={{ marginBottom: 7 }}>{t('provenanceOfficialIntro')}</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 7 }}>
          {provenance.datasets.map((dataset) => (
            <li key={dataset.id}>
              <div style={{ color: '#DCE7F5' }}>{dataset.label}</div>
              <a
                href={dataset.endpoint}
                target="_blank"
                rel="noreferrer"
                style={{ fontFamily: MONO, fontSize: 9, color: '#8FA9C8', overflowWrap: 'anywhere' }}
              >
                {dataset.endpoint} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div
        style={{
          padding: '11px 12px',
          borderRadius: 9,
          border: '1px solid rgba(255,197,61,.24)',
          background: 'rgba(255,197,61,.055)',
        }}
      >
        <div style={{ fontFamily: AB, fontSize: 10, color: '#FFC53D', letterSpacing: '.05em' }}>
          {t('provenanceDerivedTitle')}
        </div>
        <p style={{ margin: '6px 0 0' }}>{t('provenanceDerivedBody')}</p>
        <div style={{ marginTop: 10, fontFamily: AB, fontSize: 10, color: '#E8D89E', letterSpacing: '.05em' }}>
          {t('provenanceDerivationTitle')}
        </div>
        <p style={{ margin: '6px 0 0' }}>
          {t('provenanceDerivationBody')}
        </p>
      </div>

      <a
        href={provenance.termsUrl}
        target="_blank"
        rel="noreferrer"
        style={{ justifySelf: 'start', fontFamily: MONO, fontSize: 10, textDecoration: 'underline', textUnderlineOffset: 3 }}
      >
        {t('provenanceTermsLink')} ↗
      </a>
    </div>
  )
}
