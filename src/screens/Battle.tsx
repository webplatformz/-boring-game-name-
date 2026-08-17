import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { MEMBERS_BY_ID } from '../data/members'
import type { Member } from '../data/members'
import { CARD_MAX_W, TIERS, partyColors } from '../theme'
import type { Game } from '../game/useGame'
import type { Battle as BattleHook } from '../game/useBattle'
import type { Action, BattleResult } from '../game/battle'
import { CardFront } from '../components/CardFront'
import { CardGlow } from '../components/CardGlow'
import { Flag } from '../components/Flag'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

/** Width used for the two stacked cards during the fight/reveal steps —
 * smaller than the full-size card so both fit one viewport with the
 * action buttons below. Capped statically; the runtime hook below can
 * shrink it further on short viewports so the buttons stay reachable. */
const FIGHT_CARD_W_MAX = Math.min(0.6 * CARD_MAX_W, 210)
const CARD_ASPECT = 504 / 336

/** Non-card vertical chrome around the two stacked cards inside the
 * Battle screen: outer padding, header row, gaps, labels, VS separator,
 * and the footer button row. Kept as a constant estimate — being a bit
 * generous is fine (cards just render slightly smaller), being too small
 * isn't (buttons get pushed off screen, which is the bug we're fixing).
 * Includes the compact top navigation and the remaining in-screen chrome. */
const ARENA_CHROME_H = 312

function useFightCardWidth(): number {
  const [w, setW] = useState<number>(() => computeFightCardWidth())
  useEffect(() => {
    const onResize = () => setW(computeFightCardWidth())
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  return w
}

function computeFightCardWidth(): number {
  if (typeof window === 'undefined') return FIGHT_CARD_W_MAX
  const vh = window.innerHeight
  const vw = window.innerWidth
  // Two cards stack vertically; solve for width from remaining height.
  const heightBudget = Math.max(0, vh - ARENA_CHROME_H)
  const widthFromHeight = heightBudget / 2 / CARD_ASPECT
  // Also respect narrow viewports (side padding ~20px each side).
  const widthFromWidth = vw - 40
  return Math.max(120, Math.min(FIGHT_CARD_W_MAX, widthFromHeight, widthFromWidth))
}

/**
 * CardFront/CardGlow are laid out with fixed px font sizes sized for the
 * full CARD_MAX_W card — shrinking their container just crams full-size
 * text into a smaller box. Instead, render them at native size and scale
 * the whole thing down with a CSS transform, so every proportion (text,
 * wedge, bars) shrinks together correctly.
 */
function ScaledCard({ width, member, foil = true, highlightStat = null, hideStats = false, style }: {
  width: number
  member: Member
  foil?: boolean
  highlightStat?: 'atk' | 'def' | null
  hideStats?: boolean
  style?: CSSProperties
}) {
  const scale = width / CARD_MAX_W
  const height = width * (504 / 336)
  return (
    <div style={{ width, height, position: 'relative' }}>
      <div style={{ width: CARD_MAX_W, height: CARD_MAX_W * (504 / 336), position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <CardGlow rarity={member.ratings.rarity} />
        <CardFront member={member} foil={foil} highlightStat={highlightStat} hideStats={hideStats} style={style} />
      </div>
    </div>
  )
}

export function Battle({ game, battle }: { game: Game; battle: BattleHook }) {
  const { t } = useI18n()
  const { step, record, playerCard, oppCard, playerAction, oppAction, result } = battle.state

  const ownedList = useMemo(() => {
    return Object.keys(game.state.owned)
      .map((id) => MEMBERS_BY_ID.get(Number(id)))
      .filter((m): m is Member => Boolean(m))
      .sort((a, b) => b.ratings.ovr - a.ratings.ovr)
  }, [game.state.owned])

  return (
    <div
      className="screen-fill"
      // No overflow:hidden here (unlike Collection) — the fight/reveal/result
      // steps render CardGlow directly in the flow, and its bloom is meant to
      // bleed past the card edges (see CardModal/Reveal for the same pattern).
      style={{ padding: '14px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16, animation: 'riseIn 300ms ease-out' }}
    >
      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: AB, fontSize: 26, letterSpacing: '-.03em' }}>{t('battleTitle')}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontFamily: MONO, fontSize: 11, letterSpacing: '.1em' }}>
          <span style={{ color: '#8FEDE3' }}>{t('winsShort', { count: record.wins })}</span>
          <span style={{ color: '#3E5170' }}>·</span>
          <span style={{ color: '#FF9EC4' }}>{t('lossesShort', { count: record.losses })}</span>
        </div>
      </div>

      {step === 'pick' && <Picker ownedList={ownedList} onPick={battle.pickPlayerCard} onGoHome={game.goHome} />}

      {/* fight/reveal/result share one persistent Arena instance so the cards
       * never unmount+remount between them — that full-tree swap was the
       * cause of the jarring instant cut into the result screen. Only the
       * footer content (buttons → status → banner) changes underneath. */}
      {(step === 'fight' || step === 'reveal' || step === 'result') && playerCard && oppCard && (
        <Arena
          step={step}
          playerCard={playerCard}
          oppCard={oppCard}
          playerAction={playerAction}
          oppAction={oppAction}
          result={result}
          onChoose={battle.chooseAction}
          onFightAgain={battle.reset}
        />
      )}
    </div>
  )
}

// ── card picker: choose your fighter from the owned collection ─────────────
// Deliberately simplified from Collection's table (no filters/sort) — this is
// a quick pick step, not a browsing view.

function Picker({ ownedList, onPick, onGoHome }: { ownedList: Member[]; onPick: (m: Member) => void; onGoHome: () => void }) {
  const { t, party } = useI18n()
  if (ownedList.length === 0) {
    return (
      <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', padding: '0 10px' }}>
        <div style={{ fontFamily: AB, fontSize: 19, color: '#3E5170', letterSpacing: '.02em' }}>{t('noFighters')}</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#5C7391', maxWidth: 260 }}>
          {t('noFightersBody')}
        </div>
        <button
          onClick={onGoHome}
          style={{ marginTop: 4, padding: '14px 24px', borderRadius: 12, background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 13, letterSpacing: '.06em' }}
        >
          {t('getPack')}
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{ flex: 'none', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: '#5C7391' }}>{t('chooseFighter')}</div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(234,242,255,.1)', background: '#0B121D' }}>
        <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: '1fr 40px 40px 44px', gap: 8, padding: '10px 12px', background: 'rgba(234,242,255,.05)', borderBottom: '1px solid rgba(234,242,255,.1)' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#5C7391' }}>{t('member')}</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#FF9EC4', textAlign: 'right' }}>ATK</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#8FEDE3', textAlign: 'right' }}>DEF</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#FFD87A', textAlign: 'right' }}>OVR</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {ownedList.map((m) => {
            const t = TIERS[m.ratings.rarity]
            const pc = partyColors(m.partyCode)
            return (
              <div
                key={m.id}
                onClick={() => onPick(m)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 44px', gap: 8, padding: '11px 12px', borderBottom: '1px solid rgba(234,242,255,.07)', borderLeft: `3px solid ${t.c}`, cursor: 'pointer' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: AB, fontSize: 13, color: '#EAF2FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                    <span style={{ padding: '2px 5px', borderRadius: 4, background: pc[0], fontFamily: AB, fontSize: 8, color: pc[1] }}>{party(m.partyCode, m.party)}</span>
                    <Flag canton={m.canton} height={10} />
                    <span style={{ fontFamily: MONO, fontSize: 9, color: '#7690AE' }}>{m.cantonName}</span>
                  </div>
                </div>
                <div style={{ fontFamily: AB, fontSize: 15, color: '#FF5FA2', textAlign: 'right', alignSelf: 'center' }}>{m.ratings.atk}</div>
                <div style={{ fontFamily: AB, fontSize: 15, color: '#2FD3C4', textAlign: 'right', alignSelf: 'center' }}>{m.ratings.def}</div>
                <div style={{ fontFamily: AB, fontSize: 15, textAlign: 'right', alignSelf: 'center', color: t.ovrTint }}>{m.ratings.ovr}</div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── fight / reveal / result: one persistent arena, opponent stacked above
// the player's own card ─────────────────────────────────────────────────
// Vertical stacking (rather than side by side) is deliberate — this app is
// mobile-width first, and two full-height cards side by side would be
// cramped. The player's card always anchors the bottom so it's unambiguous
// which one is "yours". Kept as a single component across all three steps
// (rather than swapping between separate Fight/Result components) so the
// cards themselves never unmount — only the footer content changes.

function Arena({
  step,
  playerCard,
  oppCard,
  playerAction,
  oppAction,
  result,
  onChoose,
  onFightAgain,
}: {
  step: 'fight' | 'reveal' | 'result'
  playerCard: Member
  oppCard: Member
  playerAction: Action | null
  oppAction: Action | null
  result: BattleResult | null
  onChoose: (action: Action) => void
  onFightAgain: () => void
}) {
  const { t } = useI18n()
  const locked = playerAction !== null
  const revealed = step === 'reveal' || step === 'result'
  const won = result?.winner === 'player'
  const cardW = useFightCardWidth()

  return (
    // No overflowY:auto here — that would force overflow-x to 'auto' too
    // (per the CSS overflow spec) and clip CardGlow's horizontal bleed.
    // Card sizes are chosen to fit typical viewports without scrolling.
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
      <BattleCard
        label={t('opponent')}
        labelColor="#FF9EC4"
        member={oppCard}
        width={cardW}
        highlightStat={revealed ? statFor(oppAction) : null}
        actionLabel={revealed ? oppAction : null}
        bump={step === 'reveal' && oppAction === 'attack' ? 'down' : null}
        dimmed={step === 'result' && won}
        hideStats={!locked}
      />

      <div
        style={{
          flex: 'none',
          fontFamily: AB,
          fontSize: 13,
          letterSpacing: '.1em',
          color: '#5C7391',
          animation: step === 'reveal' ? 'vsFlash 420ms ease-out' : undefined,
        }}
      >
        {t('versus')}
      </div>

      <BattleCard
        label={t('yourCard')}
        labelColor="#8FEDE3"
        member={playerCard}
        width={cardW}
        highlightStat={revealed ? statFor(playerAction) : null}
        actionLabel={revealed ? playerAction : null}
        bump={step === 'reveal' && playerAction === 'attack' ? 'up' : null}
        dimmed={step === 'result' && !won}
      />

      {/* Footer swaps content (buttons → locking/resolving status → result
       * banner) but stays the same box, so nothing else jumps around it. */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 320, marginTop: 6, minHeight: 68 }}>
        {step === 'fight' && !locked && (
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button onClick={() => onChoose('attack')} style={actionButtonStyle('#FF3D8B')}>
              {t('attack')}
            </button>
            <button onClick={() => onChoose('defend')} style={actionButtonStyle('#2FD3C4')}>
              {t('defend')}
            </button>
          </div>
        )}

        {step !== 'result' && locked && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '.16em',
              color: '#9FB6D2',
              animation: 'glowPulse 1000ms ease-in-out infinite',
            }}
          >
            {step === 'reveal' ? t('resolving') : t('lockingIn')}
          </div>
        )}

        {step === 'result' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, animation: 'riseIn 320ms ease-out' }}>
            <div style={{ fontFamily: AB, fontSize: 22, letterSpacing: '-.02em', color: won ? '#FFC53D' : '#FF5FA2' }}>
              {won ? t('youWon') : t('youLost')}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', color: '#9FB6D2', textAlign: 'center' }}>
              {result.winner === 'player'
                ? playerAction === 'attack' ? t('battlePlayerAttackWin') : t('battlePlayerDefendWin')
                : oppAction === 'attack' ? t('battleOpponentAttackWin') : t('battleOpponentDefendWin')}
            </div>
            <button
              onClick={onFightAgain}
              style={{ marginTop: 2, padding: '13px 26px', borderRadius: 12, background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 13, letterSpacing: '.06em' }}
            >
              {t('fightAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function statFor(action: Action | null): 'atk' | 'def' | null {
  if (action === 'attack') return 'atk'
  if (action === 'defend') return 'def'
  return null
}

function actionButtonStyle(color: string): CSSProperties {
  return {
    flex: 1,
    padding: '14px 10px',
    borderRadius: 12,
    background: `${color}22`,
    border: `1px solid ${color}`,
    color,
    fontFamily: AB,
    fontSize: 13,
    letterSpacing: '.08em',
    cursor: 'pointer',
  }
}

function BattleCard({
  label,
  labelColor,
  member,
  width,
  highlightStat,
  actionLabel,
  bump,
  dimmed = false,
  hideStats = false,
}: {
  label: string
  labelColor: string
  member: Member
  width: number
  highlightStat: 'atk' | 'def' | null
  actionLabel: Action | null
  bump: 'up' | 'down' | null
  dimmed?: boolean
  hideStats?: boolean
}) {
  const { t } = useI18n()
  const tier = TIERS[member.ratings.rarity]
  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: dimmed ? 0.55 : 1,
        transition: 'opacity 300ms ease-out',
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: labelColor }}>{label}</div>
      <div style={{ animation: bump ? `${bump === 'up' ? 'bumpUp' : 'bumpDown'} 560ms ease-out` : undefined }}>
        <ScaledCard
          width={width}
          member={member}
          highlightStat={highlightStat}
          hideStats={hideStats}
          style={{ boxShadow: `0 20px 46px -20px rgba(0,0,0,.7),0 0 0 1px ${tier.c}8c` }}
        />
      </div>
      {actionLabel && (
        <div
          style={{
            fontFamily: AB,
            fontSize: 11,
            letterSpacing: '.08em',
            color: actionLabel === 'attack' ? '#FF5FA2' : '#2FD3C4',
            animation: 'popIn 220ms ease-out',
          }}
        >
          {actionLabel === 'attack' ? t('attacked') : t('defended')}
        </div>
      )}
    </div>
  )
}
