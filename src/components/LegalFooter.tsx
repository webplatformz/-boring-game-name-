import { useI18n } from '../i18n'

const MONO = "'IBM Plex Mono',monospace"

export function LegalFooter({ aboveTabs = false }: { aboveTabs?: boolean }) {
  const { t } = useI18n()
  const links = [
    { href: '#methodology', label: t('footerMethodologyLink') },
    { href: '#data-methodology', label: t('footerDataMethodologyLink') },
    { href: '#privacy', label: t('footerPrivacyLink') },
    { href: '#disclaimer', label: t('footerProjectLink') },
  ]

  return (
    <footer
      aria-label={t('legalFooterAria')}
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        flex: 'none',
        gap: '8px 16px',
        padding: aboveTabs ? '6px 20px 12px' : '8px 20px 28px',
      }}
    >
      {links.map((link) => (
        <a key={link.href} href={link.href} style={{ fontFamily: MONO, fontSize: 9.5, color: '#7187A4', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {link.label}
        </a>
      ))}
    </footer>
  )
}
