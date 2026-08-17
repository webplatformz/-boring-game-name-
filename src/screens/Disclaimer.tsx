import { SwissCross } from '../components/CardBack'
import { DataProvenance } from '../components/DataProvenance'
import { DisclaimerText } from '../components/ProjectDisclaimer'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export function Disclaimer({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()

  return (
    <main style={{ padding: '22px 20px 50px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'riseIn 260ms ease-out' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <SwissCross size={24} />
          <div style={{ fontFamily: AB, fontSize: 13, letterSpacing: '.08em' }}>{t('disclaimerEyebrow')}</div>
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
        <h1 style={{ margin: 0, fontFamily: AB, fontSize: 31, lineHeight: 1, letterSpacing: '-.035em' }}>
          {t('disclaimerTitle')}
        </h1>
      </div>

      <section
        style={{
          padding: '22px 20px',
          borderRadius: 14,
          background: '#0B121D',
          border: '1px solid rgba(255,197,61,.3)',
        }}
      >
        <DisclaimerText />
      </section>

      <section
        style={{
          padding: '22px 20px',
          borderRadius: 14,
          background: '#0B121D',
          border: '1px solid rgba(201,184,255,.25)',
        }}
      >
        <DataProvenance />
      </section>

      <a
        href="#methodology"
        style={{ alignSelf: 'flex-start', fontFamily: MONO, fontSize: 10, color: '#FFC53D', textDecoration: 'underline', textUnderlineOffset: 3 }}
      >
        {t('methodologyLink')}
      </a>
    </main>
  )
}
