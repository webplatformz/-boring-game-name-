import type { CSSProperties, ReactNode } from 'react'
import { SwissCross } from '../components/CardBack'
import { DataProvenance } from '../components/DataProvenance'
import { privacyContent } from '../content/privacy'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"
const section: CSSProperties = { padding: '18px 19px', borderRadius: 14, background: '#0B121D', border: '1px solid rgba(234,242,255,.11)' }

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section style={section}><h2 style={{ margin: '0 0 10px', fontFamily: AB, fontSize: 15, color: '#C9B8FF' }}>{title}</h2><div style={{ color: '#9FB6D2', fontSize: 12, lineHeight: 1.65 }}>{children}</div></section>
}

export function DataMethodology({ onClose }: { onClose: () => void }) {
  const { language, t } = useI18n()
  const copy = privacyContent(language).methodology

  return (
    <main style={{ padding: '22px 20px 34px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'riseIn 260ms ease-out' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><SwissCross size={24} /><div style={{ fontFamily: AB, fontSize: 13, letterSpacing: '.08em' }}>{copy.eyebrow}</div></div>
        <button type="button" onClick={onClose} style={{ padding: '8px 11px', borderRadius: 9, border: '1px solid rgba(234,242,255,.16)', color: '#AFC0D5', fontFamily: MONO, fontSize: 10 }}>{t('backToGame')}</button>
      </header>

      <div><h1 style={{ margin: 0, fontFamily: AB, fontSize: 31, lineHeight: 1, letterSpacing: '-.035em' }}>{copy.title}</h1><p style={{ margin: '9px 0 0', color: '#9FB6D2', fontSize: 13, lineHeight: 1.55 }}>{copy.intro}</p></div>

      <Section title={copy.purposeTitle}><p style={{ margin: 0 }}>{copy.purposeBody}</p></Section>
      <Section title={copy.categoriesTitle}><div style={{ display: 'grid', gap: 11 }}>{copy.categories.map((item) => <div key={item.title}><strong style={{ color: '#EAF2FF' }}>{item.title}</strong><div>{item.body}</div></div>)}</div></Section>
      <Section title={copy.flowTitle}><ol style={{ margin: 0, paddingLeft: 20 }}>{copy.flow.map((item) => <li key={item} style={{ marginTop: 6 }}>{item}</li>)}</ol></Section>
      <Section title={copy.scoreTitle}>
        <p style={{ margin: 0 }}>{copy.scoreBody}</p>
        <div style={{ display: 'grid', gap: 10, marginTop: 11 }}>{copy.scoreDetails.map((item) => <div key={item.title}><strong style={{ color: '#FFC53D' }}>{item.title}</strong><div>{item.body}</div></div>)}</div>
        <div style={{ marginTop: 11, padding: '10px 12px', borderRadius: 9, background: 'rgba(255,197,61,.07)', color: '#E8D89E', fontFamily: MONO, fontSize: 10.5 }}>OVR = 45% ATK + 45% DEF + 10% lower of ATK/DEF</div>
      </Section>
      <Section title={copy.derivedTitle}><p style={{ margin: 0 }}>{copy.derivedBody}</p></Section>
      <Section title={copy.exclusionsTitle}><p style={{ margin: 0 }}>{copy.exclusionsBody}</p></Section>
      <Section title={copy.minimisationTitle}><p style={{ margin: 0 }}>{copy.minimisationBody}</p></Section>
      <Section title={copy.limitationsTitle}><ul style={{ margin: 0, paddingLeft: 18 }}>{copy.limitations.map((item) => <li key={item} style={{ marginTop: 5 }}>{item}</li>)}</ul></Section>

      <section style={{ ...section, borderColor: 'rgba(201,184,255,.25)' }}><DataProvenance /></section>

      <Section title={copy.challengeTitle}>
        <p style={{ margin: 0 }}>{copy.challengeBody}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10, fontFamily: MONO, fontSize: 10 }}>
          <a href="#privacy">{copy.privacyLink}</a><a href="#methodology">{copy.scoreLink}</a>
        </div>
      </Section>
    </main>
  )
}
