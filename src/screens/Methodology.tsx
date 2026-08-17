import type { CSSProperties, ReactNode } from 'react'
import { SwissCross } from '../components/CardBack'
import { DataProvenance } from '../components/DataProvenance'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"
const section: CSSProperties = {
  padding: '17px 18px',
  borderRadius: 14,
  background: '#0B121D',
  border: '1px solid rgba(234,242,255,.11)',
}

function Metric({ weight, color, title, children }: { weight: string; color: string; title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 11, alignItems: 'start' }}>
      <div style={{ fontFamily: AB, fontSize: 16, color, lineHeight: 1 }}>{weight}</div>
      <div>
        <div style={{ fontFamily: AB, fontSize: 11, color: '#EAF2FF', letterSpacing: '.025em' }}>{title}</div>
        <div style={{ marginTop: 3, color: '#91A6C1', fontSize: 12, lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  )
}

export function Methodology({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  return (
    <main style={{ padding: '22px 20px 50px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'riseIn 260ms ease-out' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <SwissCross size={24} />
          <div style={{ fontFamily: AB, fontSize: 13, letterSpacing: '.08em' }}>{t('scoreLab')}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: '8px 11px', borderRadius: 9, border: '1px solid rgba(234,242,255,.16)', color: '#AFC0D5', fontFamily: MONO, fontSize: 10 }}
        >
          {t('backToGame')}
        </button>
      </header>

      <div>
        <h1 style={{ margin: 0, fontFamily: AB, fontSize: 31, lineHeight: 1, letterSpacing: '-.035em' }}>{t('methodologyTitle')}</h1>
        <p style={{ margin: '9px 0 0', color: '#9FB6D2', fontSize: 13, lineHeight: 1.55 }}>
          {t('methodologyIntro')}
        </p>
      </div>

      <section style={{ ...section, borderColor: 'rgba(255,95,162,.32)' }}>
        <h2 style={{ margin: '0 0 14px', fontFamily: AB, fontSize: 16, color: '#FF5FA2' }}>{t('atkMethodTitle')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Metric weight="45%" color="#FF5FA2" title={t('authoredDriveTitle')}>
            {t('authoredDriveBody')}
          </Metric>
          <Metric weight="30%" color="#FF5FA2" title={t('advancedTitle')}>
            {t('advancedBody')}
          </Metric>
          <Metric weight="25%" color="#FF5FA2" title={t('leadershipTitle')}>
            {t('leadershipBody')}
          </Metric>
        </div>
      </section>

      <section style={{ ...section, borderColor: 'rgba(47,211,196,.32)' }}>
        <h2 style={{ margin: '0 0 14px', fontFamily: AB, fontSize: 16, color: '#2FD3C4' }}>{t('defMethodTitle')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Metric weight="20%" color="#2FD3C4" title={t('votingTitle')}>
            {t('votingBody')}
          </Metric>
          <Metric weight="45%" color="#2FD3C4" title={t('committeeTitle')}>
            {t('committeeBody')}
          </Metric>
          <Metric weight="30%" color="#2FD3C4" title={t('experienceTitle')}>
            {t('experienceBody')}
          </Metric>
          <Metric weight="5%" color="#2FD3C4" title={t('ageTitle')}>
            {t('ageBody')}
          </Metric>
        </div>
      </section>

      <section style={section}>
        <h2 style={{ margin: '0 0 9px', fontFamily: AB, fontSize: 15, color: '#FFC53D' }}>{t('inputsTitle')}</h2>
        <div style={{ color: '#9FB6D2', fontSize: 12, lineHeight: 1.6 }}>
          {t('inputsBody')}
          <div style={{ marginTop: 9, padding: '10px 12px', borderRadius: 9, background: 'rgba(255,197,61,.07)', color: '#E8D89E', fontFamily: MONO, fontSize: 10.5 }}>
            OVR = 45% ATK + 45% DEF + 10% lower of ATK/DEF
          </div>
          <p style={{ margin: '9px 0 0' }}>{t('rarityMethodBody')}</p>
        </div>
      </section>

      <section style={section}>
        <h2 style={{ margin: '0 0 9px', fontFamily: AB, fontSize: 15, color: '#C9B8FF' }}>{t('dataSources')}</h2>
        <div style={{ color: '#9FB6D2', fontSize: 12, lineHeight: 1.65 }}>
          <DataProvenance showTitle={false} />
          <p style={{ margin: '10px 0 0', color: '#7187A4' }}>{t('methodologyDisclaimer')}</p>
          <a
            href="#disclaimer"
            style={{ display: 'inline-block', marginTop: 10, fontFamily: MONO, fontSize: 10, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {t('projectDisclaimerLink')}
          </a>
        </div>
      </section>
    </main>
  )
}
