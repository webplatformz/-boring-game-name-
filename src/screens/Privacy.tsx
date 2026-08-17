import type { CSSProperties, ReactNode } from 'react'
import { SwissCross } from '../components/CardBack'
import { PRIVACY_CONFIGURATION, PRIVACY_CONFIGURATION_MISSING } from '../data/privacy'
import { privacyContent } from '../content/privacy'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"
const section: CSSProperties = {
  padding: '18px 19px',
  borderRadius: 14,
  background: '#0B121D',
  border: '1px solid rgba(234,242,255,.11)',
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={section}>
      <h2 style={{ margin: '0 0 10px', fontFamily: AB, fontSize: 15, color: '#C9B8FF' }}>{title}</h2>
      <div style={{ color: '#9FB6D2', fontSize: 12, lineHeight: 1.65 }}>{children}</div>
    </section>
  )
}

function value(value: string | null | undefined, pending: string): string {
  return value?.trim() || pending
}

export function Privacy({ onClose }: { onClose: () => void }) {
  const { language, t } = useI18n()
  const copy = privacyContent(language).privacy
  const config = PRIVACY_CONFIGURATION
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
        <h1 style={{ margin: 0, fontFamily: AB, fontSize: 31, lineHeight: 1, letterSpacing: '-.035em' }}>{copy.title}</h1>
        <p style={{ margin: '9px 0 0', color: '#9FB6D2', fontSize: 13, lineHeight: 1.55 }}>{copy.intro}</p>
      </div>

      {PRIVACY_CONFIGURATION_MISSING.length > 0 && (
        <div role="status" style={{ padding: '13px 14px', borderRadius: 11, border: '1px solid rgba(255,95,162,.35)', background: 'rgba(255,95,162,.075)', color: '#FFD0E4', fontSize: 12, lineHeight: 1.55 }}>
          {copy.draftWarning}
        </div>
      )}

      <Section title={copy.controllerTitle}>
        <p style={{ margin: 0 }}>{copy.controllerContactBody}</p>
        <p style={{ margin: '9px 0 0', color: '#EAF2FF' }}>
          <strong>{value(config.controller.name, copy.pending)}</strong><br />
          {config.controller.privacyEmail ? <a href={`mailto:${config.controller.privacyEmail}`}>{config.controller.privacyEmail}</a> : copy.pending}
        </p>
      </Section>

      <Section title={copy.categoriesTitle}>
        <div style={{ display: 'grid', gap: 11 }}>
          {copy.categories.map((item) => <div key={item.title}><strong style={{ color: '#EAF2FF' }}>{item.title}</strong><div>{item.body}</div></div>)}
        </div>
      </Section>

      <Section title={copy.purposesTitle}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{copy.purposes.map((item) => <li key={item} style={{ marginTop: 5 }}>{item}</li>)}</ul>
      </Section>

      <Section title={copy.profilingTitle}><p style={{ margin: 0 }}>{copy.profilingBody}</p></Section>

      <Section title={copy.recipientsTitle}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{copy.recipients.map((item) => <li key={item} style={{ marginTop: 5 }}>{item}</li>)}</ul>
      </Section>

      <Section title={copy.retentionTitle}><p style={{ margin: 0 }}>{copy.retentionBody}</p></Section>
      <Section title={copy.rightsTitle}><p style={{ margin: 0 }}>{copy.rightsBody}</p></Section>

      <Section title={copy.correctionTitle}>
        <p style={{ margin: 0 }}>{copy.correctionIntro}</p>
        <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>{copy.correctionSteps.map((item) => <li key={item} style={{ marginTop: 6 }}>{item}</li>)}</ol>
        {config.controller.privacyEmail ? (
          <a href={`mailto:${config.controller.privacyEmail}`} style={{ display: 'inline-block', marginTop: 12, fontFamily: MONO, fontSize: 10 }}>{config.controller.privacyEmail} →</a>
        ) : (
          <p style={{ margin: '11px 0 0', color: '#FFD0E4' }}>{copy.correctionUnavailable}</p>
        )}
      </Section>

      <Section title={copy.securityTitle}><p style={{ margin: 0 }}>{copy.securityBody}</p></Section>

      <div style={{ fontFamily: MONO, color: '#7187A4', fontSize: 9.5 }}>
        {copy.updatedLabel}: <time dateTime={config.lastUpdated}>{config.lastUpdated}</time> · {config.noticeVersion}
      </div>
    </main>
  )
}
