import { SwissCross } from '../components/CardBack'
import { updatesContent } from '../content/updates'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export function Updates({ onClose }: { onClose: () => void }) {
  const { language, t } = useI18n()
  const copy = updatesContent(language)
  const locale = `${language}-CH`
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <main style={{ padding: '22px 20px 50px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'riseIn 260ms ease-out' }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {copy.items.map((item, index) => (
          <article
            key={item.id}
            style={{
              padding: '18px 19px',
              borderRadius: 14,
              background: '#0B121D',
              border: `1px solid ${index === 0 ? 'rgba(255,197,61,.3)' : 'rgba(234,242,255,.11)'}`,
            }}
          >
            <time dateTime={item.date} style={{ display: 'block', marginBottom: 8, color: '#FFC53D', fontFamily: MONO, fontSize: 10 }}>
              {dateFormatter.format(new Date(`${item.date}T00:00:00Z`))}
            </time>
            <h2 style={{ margin: 0, color: '#EAF2FF', fontFamily: AB, fontSize: 17, lineHeight: 1.15 }}>{item.title}</h2>
            <p style={{ margin: '9px 0 0', color: '#9FB6D2', fontSize: 12, lineHeight: 1.65 }}>{item.body}</p>
          </article>
        ))}
      </div>
    </main>
  )
}
