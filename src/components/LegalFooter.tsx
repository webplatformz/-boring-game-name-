import { useI18n } from '../i18n'

const MONO = "'IBM Plex Mono',monospace"

export function LegalFooter({
  aboveTabs = false,
  pushToBottom = false,
  updatesUnread = false,
}: {
  aboveTabs?: boolean
  pushToBottom?: boolean
  updatesUnread?: boolean
}) {
  const { t } = useI18n()
  const links = [
    { href: '#updates', label: t('footerUpdatesLink'), unread: updatesUnread },
    { href: '#methodology', label: t('footerMethodologyLink') },
    { href: '#data-methodology', label: t('footerDataMethodologyLink') },
    { href: '#privacy', label: t('footerPrivacyLink') },
    { href: '#photo-credits', label: t('footerPhotoCreditsLink') },
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
        marginTop: pushToBottom ? 'auto' : undefined,
        gap: '8px 16px',
        padding: aboveTabs ? '6px 20px 12px' : '8px 20px 28px',
      }}
    >
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          aria-label={link.unread ? `${link.label}, ${t('updatesUnreadAria')}` : undefined}
          style={{ fontFamily: MONO, fontSize: 9.5, color: link.unread ? '#FFC53D' : '#7187A4', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          {link.label}
          {link.unread && (
            <span
              aria-hidden="true"
              style={{ display: 'inline-block', width: 6, height: 6, marginLeft: 5, borderRadius: '50%', background: '#FFC53D', boxShadow: '0 0 6px rgba(255,197,61,.55)', verticalAlign: 'middle' }}
            />
          )}
        </a>
      ))}
    </footer>
  )
}
