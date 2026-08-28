import { useState } from 'react'
import type { CSSProperties } from 'react'
import { MEMBERS, MEMBERS_BY_ID } from '../data/members'
import type { Member } from '../data/members'
import { LEGISLATURE, TIERS } from '../theme'
import type { Game } from '../game/useGame'
import { recordLanguageUsed } from '../game/achievements'
import { PackFace } from '../components/PackArt'
import { SwissCross } from '../components/CardBack'
import { CardModal } from '../components/CardModal'
import { OpeningStats } from '../components/OpeningStats'
import { TrophyIcon } from '../components/TrophyIcon'
import { VoucherModal } from '../components/VoucherModal'
import { PACK_SIZE } from '../game/pack'
import { LANGUAGES, useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export function Home({ game, unlockedAchievements, totalAchievements }: { game: Game; unlockedAchievements: number; totalAchievements: number }) {
  const { language, setLanguage, t, rarity } = useI18n()
  const [openCardMember, setOpenCardMember] = useState<Member | null>(null)
  const [voucherOpen, setVoucherOpen] = useState(false)
  const { packs, owned, refillAt } = game.state
  const ownedList = Object.keys(owned)
    .map((id) => MEMBERS_BY_ID.get(Number(id)))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
  const total = MEMBERS.length
  const ownedCount = ownedList.length
  const best = ownedList.reduce<(typeof ownedList)[number] | null>(
    (b, m) => (!b || m.ratings.ovr > b.ratings.ovr ? m : b),
    null,
  )
  const progress = Math.round((ownedCount / total) * 100)
  const canRip = packs > 0
  const remainingSec = refillAt ? Math.max(0, Math.ceil((refillAt - Date.now()) / 1000)) : 0
  const countdown = `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`

  return (
    <div className="tabbed-screen" style={{ padding: '14px 20px 18px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'riseIn 320ms ease-out' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <SwissCross size={24} />
          <div style={{ fontFamily: AB, fontSize: 14, letterSpacing: '-.01em' }}>{t('legislature', { number: LEGISLATURE })}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <div role="group" aria-label={t('languageSwitcher')} style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 7, background: 'rgba(234,242,255,.05)', border: '1px solid rgba(234,242,255,.1)' }}>
            {LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLanguage(code)
                  recordLanguageUsed(code)
                }}
                aria-pressed={language === code}
                style={{
                  minWidth: 25,
                  padding: '3px 4px',
                  borderRadius: 5,
                  background: language === code ? 'rgba(255,197,61,.18)' : 'transparent',
                  color: language === code ? '#FFD87A' : '#5C7391',
                  fontFamily: MONO,
                  fontSize: 8,
                  fontWeight: 600,
                  letterSpacing: '.08em',
                }}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* headline */}
      <div>
        <div
          style={{
            fontFamily: AB,
            fontSize: 34,
            lineHeight: 0.95,
            letterSpacing: '-.035em',
            background: 'linear-gradient(100deg,#FFC53D,#FF3D8B 40%,#8B5CF6 70%,#2FD3C4)',
            backgroundSize: '200% 100%',
            animation: 'shimmerText 9s ease-in-out infinite',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {t('homeHeadlineOne')}
          <br />
          {t('homeHeadlineTwo')}
        </div>
        <div style={{ marginTop: 9, fontSize: 13.5, lineHeight: 1.5, color: '#9FB6D2' }}>
          {t('homeSubtitle', { count: PACK_SIZE })}
        </div>
      </div>

      {/* pack */}
      <div style={{ position: 'relative', width: '100%', padding: '6px 0 0' }}>
        <div style={{ width: 212, margin: '0 auto' }}>
          <button
            onClick={game.ripNow}
            className="home-pack hoverlift"
            style={{ width: 212, flex: 'none', filter: 'drop-shadow(0 18px 30px rgba(0,0,0,.65)) drop-shadow(0 0 22px rgba(255,197,61,.24))' }}
            aria-label={t('ripPackAria')}
          >
            <PackFace />
          </button>
          <div
            className="packs-badge"
            style={{
              position: 'absolute',
              top: 22,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              minWidth: 46,
              padding: '5px 7px',
              borderRadius: 10,
              background: 'rgba(12,20,32,.92)',
              border: '1px solid rgba(255,197,61,.45)',
              boxShadow: '0 8px 20px rgba(0,0,0,.4)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 7, lineHeight: 1, letterSpacing: '.1em', color: '#FFD87A' }}>{t('packs')}</span>
            <span style={{ fontFamily: AB, fontSize: 15, lineHeight: 1, color: '#FFC53D' }}>{packs}</span>
          </div>
        </div>
      </div>

      <button onClick={game.ripNow} disabled={!canRip} className="rip-btn" style={openBtn(canRip)}>
        {canRip ? t('ripOpen') : refillAt ? t('nextPackIn', { time: countdown }) : t('noPacksLeft')}
      </button>
      {refillAt && canRip && (
        <div
          aria-live="polite"
          style={{
            marginTop: -7,
            textAlign: 'center',
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: '.14em',
            color: '#7690AE',
          }}
        >
          {t('nextPackIn', { time: countdown })}
        </div>
      )}

      <button
        onClick={() => setVoucherOpen(true)}
        aria-label={t('redeemVoucherAria')}
        style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: '#5C7391' }}
      >
        {t('redeemVoucherLink')}
      </button>

      {/* stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <button
          type="button"
          onClick={game.goCollection}
          style={{ ...tile, textAlign: 'left', cursor: 'pointer' }}
          aria-label={t('openCollectionAria')}
        >
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#5C7391' }}>{t('collected')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
            <span style={{ fontFamily: AB, fontSize: 26, lineHeight: 1, color: '#EAF2FF' }}>{ownedCount}</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#5C7391' }}>/ {total}</span>
          </div>
          <div style={{ marginTop: 9, height: 5, borderRadius: 99, background: 'rgba(234,242,255,.12)', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#FFC53D,#FF3D8B)' }} />
          </div>
        </button>
        <button
          type="button"
          onClick={() => best && setOpenCardMember(best)}
          disabled={!best}
          style={{ ...tile, textAlign: 'left', cursor: best ? 'pointer' : 'default' }}
          aria-label={best ? t('showCardAria', { name: best.name }) : undefined}
        >
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#5C7391' }}>{t('bestPull')}</div>
          <div style={{ fontFamily: AB, fontSize: 17, lineHeight: 1.05, marginTop: 3, color: '#EAF2FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {best ? best.name : '—'}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', marginTop: 4, color: best ? TIERS[best.ratings.rarity].ovrTint : '#5C7391' }}>
            {best ? `${rarity(best.ratings.rarity)} · ${best.ratings.ovr} OVR` : t('ripAPack')}
          </div>
        </button>
      </div>

      {/* Trade-in banner */}
      <button
        onClick={game.goTrade}
        style={{
          ...tile,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontFamily: AB, fontSize: 13, color: '#EAF2FF' }}>{t('cardDuplicates')}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: '#7690AE', marginTop: 2 }}>{t('tradeHint')}</div>
        </div>
        <div style={{ fontFamily: AB, fontSize: 12, color: '#FFC53D', whiteSpace: 'nowrap' }}>{t('tradeIn')}</div>
      </button>

      <div style={{ display: 'flex', gap: 10 }}>
        <OpeningStats
          cardsRevealed={game.state.cardsRevealed}
          packsOpened={game.state.packsOpened}
          compact
          style={{ width: 'calc((100% - 10px) / 2)' }}
        />
        <a
          href="#achievements"
          aria-label={t('achievementsLinkAria')}
          style={{
            width: 'calc((100% - 10px) / 2)',
            padding: '9px 12px 10px',
            borderRadius: 13,
            background: '#0B121D',
            border: '1px solid rgba(234,242,255,.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            textDecoration: 'none',
          }}
        >
          <div style={{ flex: 'none', color: '#FFC53D' }}>
            <TrophyIcon size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '.06em', color: '#7690AE', whiteSpace: 'nowrap' }}>
              {t('achievements')}
            </div>
            <div style={{ fontFamily: AB, fontSize: 15, lineHeight: 1, color: '#EAF2FF', marginTop: 2 }}>
              {unlockedAchievements} <span style={{ fontFamily: MONO, fontSize: 10, color: '#5C7391' }}>/ {totalAchievements}</span>
            </div>
          </div>
        </a>
      </div>

      <CardModal member={openCardMember} onClose={() => setOpenCardMember(null)} />
      <VoucherModal open={voucherOpen} onClose={() => setVoucherOpen(false)} game={game} />
    </div>
  )
}

const tile: CSSProperties = { padding: '13px 15px', borderRadius: 13, background: '#0B121D', border: '1px solid rgba(234,242,255,.1)' }

function openBtn(canRip: boolean): CSSProperties {
  return canRip
    ? { padding: '17px 26px', borderRadius: 13, textAlign: 'center', background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 15, letterSpacing: '.06em', animation: 'pulseGlow 2.6s ease-out infinite' }
    : { padding: '17px 26px', borderRadius: 13, textAlign: 'center', background: 'rgba(234,242,255,.05)', color: '#3E5170', fontFamily: AB, fontSize: 15, letterSpacing: '.06em', cursor: 'default' }
}
