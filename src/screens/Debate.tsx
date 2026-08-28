import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { MEMBERS_BY_ID } from '../data/members'
import type { Member } from '../data/members'
import { CARD_MAX_W, TIERS, partyColors } from '../theme'
import type { Game } from '../game/useGame'
import type {
  Debate as DebateHook,
  CompletedDebateTurn,
} from '../game/useDebate'
import {
  DEBATE_TURN_LIMIT,
  type DebateAction,
  type PollState,
  type PollWinner,
} from '../game/debate'
import {
  getDebateFeedbackKey,
  getPollDeltas,
} from '../game/debateFeedback'
import { CardFront } from '../components/CardFront'
import { CardGlow } from '../components/CardGlow'
import { Flag } from '../components/Flag'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

const CARD_ASPECT = 504 / 336
// Cards sit side by side now, so width is driven by the shared app column
// (capped at 430px, see .app-shell-width) as much as by height — a single
// card row needs far less vertical room than the old stacked layout did,
// which is what lets cards run bigger without risking a scroll.
const DEBATE_CARD_W_MAX = 165
const DEBATE_CARD_W_MIN = 66
const DEBATE_SIDE_PADDING = 40 // screen-fill's left+right padding
const DEBATE_ROW_RESERVED_W = 60 // VS label + the two flex gaps around it
// Everything in the viewport-constrained column besides the card itself:
// tab bar, legal footer, screen padding, header, poll meter, the gaps
// between them, and — since attack/defend now stack under the player's own
// card instead of living in a separate row — that action slot's height too.
// The footer stays visible through every step (tests rely on it framing the
// result screen), so its height is budgeted here even though it sits
// outside the Arena.
const DEBATE_CHROME_H = 454

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
  if (typeof window === 'undefined') return DEBATE_CARD_W_MAX
  const vh = window.innerHeight
  const vw = window.innerWidth
  const heightBudget = Math.max(0, vh - DEBATE_CHROME_H)
  const widthFromHeight = heightBudget / CARD_ASPECT
  const arenaWidth = Math.min(vw, 430) - DEBATE_SIDE_PADDING
  const widthFromWidth = (arenaWidth - DEBATE_ROW_RESERVED_W) / 2
  return Math.max(DEBATE_CARD_W_MIN, Math.min(DEBATE_CARD_W_MAX, widthFromHeight, widthFromWidth))
}

/**
 * CardFront/CardGlow are laid out with fixed px font sizes sized for the
 * full CARD_MAX_W card — shrinking their container just crams full-size
 * text into a smaller box. Instead, render them at native size and scale
 * the whole thing down with a CSS transform, so every proportion (text,
 * wedge, bars) shrinks together correctly.
 */
function ScaledCard({ width, member, foil = true, highlightStat = null, style }: {
  width: number
  member: Member
  foil?: boolean
  highlightStat?: 'atk' | 'def' | null
  style?: CSSProperties
}) {
  const scale = width / CARD_MAX_W
  const height = width * (504 / 336)
  return (
    <div style={{ width, height, position: 'relative' }}>
      <div style={{ width: CARD_MAX_W, height: CARD_MAX_W * (504 / 336), position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <CardGlow rarity={member.ratings.rarity} />
        <CardFront member={member} foil={foil} highlightStat={highlightStat} style={style} />
      </div>
    </div>
  )
}

export function Debate({ game, debate }: { game: Game; debate: DebateHook }) {
  const { t } = useI18n()
  const {
    step,
    record,
    playerCard,
    oppCard,
    playerAction,
    oppAction,
    poll,
    lastTurn,
    turn,
    winner,
  } = debate.state

  useEffect(() => debate.reset, [debate.reset])

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
      style={{ padding: '10px 20px 12px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'riseIn 300ms ease-out' }}
    >
      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: AB, fontSize: 26, letterSpacing: '-.03em' }}>{t('debateTitle')}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontFamily: MONO, fontSize: 11, letterSpacing: '.1em' }}>
          <span style={{ color: '#8FEDE3' }}>{t('winsShort', { count: record.wins })}</span>
          <span style={{ color: '#3E5170' }}>·</span>
          <span style={{ color: '#FF9EC4' }}>{t('lossesShort', { count: record.losses })}</span>
        </div>
      </div>

      {step === 'pick' && <Picker ownedList={ownedList} onPick={debate.pickPlayerCard} onGoHome={game.goHome} />}

      {/* fight/reveal/result share one persistent Arena instance so the cards
       * never unmount+remount between them — that full-tree swap was the
       * cause of the jarring instant cut into the result screen. Only the
       * footer content (buttons → status → banner) changes underneath. */}
      {(step === 'fight' || step === 'reveal' || step === 'result') &&
        playerCard &&
        oppCard &&
        poll && (
        <Arena
          step={step}
          playerCard={playerCard}
          oppCard={oppCard}
          playerAction={playerAction}
          oppAction={oppAction}
          poll={poll}
          lastTurn={lastTurn}
          turn={turn}
          winner={winner}
          onChoose={debate.chooseAction}
          onFightAgain={debate.reset}
        />
      )}
    </div>
  )
}

// ── card picker: choose your fighter from the owned collection ─────────────
// Deliberately simplified from Collection's table (no filters/sort) — this is
// a quick pick step, not a browsing view.

function Picker({ ownedList, onPick, onGoHome }: { ownedList: Member[]; onPick: (m: Member) => void; onGoHome: () => void }) {
  const { t, party, cantonName } = useI18n()
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
                    <span style={{ fontFamily: MONO, fontSize: 9, color: '#7690AE' }}>{cantonName(m.canton)}</span>
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

// ── debate arena: compact persistent cards around the animated poll ──────────

function Arena({
  step,
  playerCard,
  oppCard,
  playerAction,
  oppAction,
  poll,
  lastTurn,
  turn,
  winner,
  onChoose,
  onFightAgain,
}: {
  step: 'fight' | 'reveal' | 'result'
  playerCard: Member
  oppCard: Member
  playerAction: DebateAction | null
  oppAction: DebateAction | null
  poll: PollState
  lastTurn: CompletedDebateTurn | null
  turn: number
  winner: PollWinner | null
  onChoose: (action: DebateAction) => void
  onFightAgain: () => void
}) {
  const { t } = useI18n()
  const locked = playerAction !== null
  const revealed = step === 'reveal' || step === 'result'
  const won = winner?.winner === 'player'
  const cardW = useFightCardWidth()

  // The clash only plays out once, during the reveal step itself — by the
  // time we're in 'result' the lunge/brace animations have long finished
  // (680ms, against an 1800ms reveal window) and playerAction/oppAction are
  // just sitting there frozen for the stat highlight, not re-animating.
  const clash = step === 'reveal' && playerAction && oppAction
    ? getClashPlan(playerAction, oppAction, playerCard, oppCard)
    : null

  // Your move belongs under your own card, not floating full-width — it's
  // your choice, not the match's. Reserves a fixed height so clicking
  // ATTACK/DEFEND (buttons → "locking in…") doesn't jump the layout; it
  // only disappears once the turn actually reveals.
  const playerMoveSlot: ReactNode = step === 'fight' ? (
    <div style={{ marginTop: 10, width: cardW, minHeight: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {locked ? (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: '.14em',
            color: '#9FB6D2',
            textAlign: 'center',
            animation: 'glowPulse 1000ms ease-in-out infinite',
          }}
        >
          {t('lockingIn')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <button onClick={() => onChoose('attack')} style={stackedActionButtonStyle('#FF3D8B')}>
            {t('attack')}
          </button>
          <button onClick={() => onChoose('defend')} style={stackedActionButtonStyle('#2FD3C4')}>
            {t('defend')}
          </button>
        </div>
      )}
    </div>
  ) : null

  return (
    <div
      // overflowY is a safety net, not the primary fit mechanism: cardW is
      // sized against DEBATE_CHROME_H to fit without clipping on real
      // devices, but this guards against edge cases (browser chrome
      // resize, font load) so the arena never forces a page scroll.
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        paddingBottom: 4,
        overflowY: 'hidden',
      }}
    >
      <PollMeter
        step={step}
        turn={turn}
        poll={poll}
        lastTurn={lastTurn}
        playerCard={playerCard}
        oppCard={oppCard}
        playerAction={playerAction}
        oppAction={oppAction}
      />

      <div
        data-testid="debate-fight-row"
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
          animation: clash?.shake ? 'arenaShake 680ms cubic-bezier(.32,.72,.28,1)' : undefined,
        }}
      >
        <DebateCard
          side="player"
          label={t('yourCard')}
          labelColor="#8FEDE3"
          member={playerCard}
          width={cardW}
          highlightStat={revealed ? statFor(playerAction) : null}
          motion={clash?.player ?? null}
          dimmed={step === 'result' && !won}
          own
          actionSlot={playerMoveSlot}
        />

        <VsBadge width={cardW} flash={clash?.flash ?? null} />

        <DebateCard
          side="opponent"
          label={t('opponent')}
          labelColor="#FF9EC4"
          member={oppCard}
          width={cardW}
          highlightStat={revealed ? statFor(oppAction) : null}
          motion={clash?.opp ?? null}
          dimmed={step === 'result' && won}
        />
      </div>

      {step === 'result' && winner && (
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 340 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: 'riseIn 320ms ease-out' }}>
            <div style={{ fontFamily: AB, fontSize: 20, letterSpacing: '-.02em', color: won ? '#FFC53D' : '#FF5FA2' }}>
              {won ? t('youWon') : t('youLost')}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', color: '#9FB6D2', textAlign: 'center' }}>
              {winner.winner === 'player'
                ? winner.majority
                  ? t('debateMajorityWin')
                  : t('debateTurnLimitWin')
                : winner.majority
                  ? t('debateMajorityLoss')
                  : t('debateTurnLimitLoss')}
            </div>
            <button
              onClick={onFightAgain}
              style={{ marginTop: 0, padding: '11px 24px', borderRadius: 12, background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 13, letterSpacing: '.06em' }}
            >
              {t('debateAgain')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── clash choreography: what each card visually does when a turn reveals ──

type CardMotion =
  | { kind: 'lunge'; dir: 'right' | 'left'; power: 'hit' | 'blocked' }
  | { kind: 'brace'; result: 'plain' | 'flinch' | 'block' }

interface ClashPlan {
  player: CardMotion
  opp: CardMotion
  shake: boolean
  flash: 'hit' | 'block' | null
}

// Mirrors the win/tie/loss math in getDebateFeedbackKey (debateFeedback.ts)
// so the animation always agrees with the feedback text and stat deltas —
// same "attacker's ATK vs defender's DEF" comparison, just turned into a
// motion instead of a sentence. Player lunges rightward (toward the VS
// badge in the middle), opponent lunges leftward, since the player card
// sits on the left.
function getClashPlan(
  playerAction: DebateAction,
  oppAction: DebateAction,
  playerCard: Member,
  oppCard: Member,
): ClashPlan {
  if (playerAction === 'defend' && oppAction === 'defend') {
    return {
      player: { kind: 'brace', result: 'plain' },
      opp: { kind: 'brace', result: 'plain' },
      shake: false,
      flash: null,
    }
  }
  if (playerAction === 'attack' && oppAction === 'attack') {
    return {
      player: { kind: 'lunge', dir: 'right', power: 'hit' },
      opp: { kind: 'lunge', dir: 'left', power: 'hit' },
      shake: true,
      flash: 'hit',
    }
  }
  const playerAttacks = playerAction === 'attack'
  const attackerCard = playerAttacks ? playerCard : oppCard
  const defenderCard = playerAttacks ? oppCard : playerCard
  const attackerWins = attackerCard.ratings.atk > defenderCard.ratings.def
  const attackerMotion: CardMotion = {
    kind: 'lunge',
    dir: playerAttacks ? 'right' : 'left',
    power: attackerWins ? 'hit' : 'blocked',
  }
  const defenderMotion: CardMotion = { kind: 'brace', result: attackerWins ? 'flinch' : 'block' }
  return {
    player: playerAttacks ? attackerMotion : defenderMotion,
    opp: playerAttacks ? defenderMotion : attackerMotion,
    shake: attackerWins,
    flash: attackerWins ? 'hit' : 'block',
  }
}

function motionStyle(motion: CardMotion | null): CSSProperties {
  if (!motion) return {}
  if (motion.kind === 'lunge') {
    const distance = motion.power === 'hit' ? 46 : 16
    return {
      ['--lunge-x' as string]: `${distance}px`,
      animation: `${motion.dir === 'right' ? 'lungeRight' : 'lungeLeft'} 680ms cubic-bezier(.32,.72,.28,1)`,
    }
  }
  const braceColor = motion.result === 'flinch' ? '#FF5FA2' : motion.result === 'block' ? '#8FEDE3' : '#2FD3C4'
  return {
    ['--brace-color' as string]: braceColor,
    animation: `${motion.result === 'flinch' ? 'braceFlinch' : 'bracePulse'} 680ms ease-out`,
  }
}

function VsBadge({ width, flash }: { width: number; flash: 'hit' | 'block' | null }) {
  return (
    <div
      aria-hidden="true"
      style={{
        flex: 'none',
        width: 40,
        height: 28,
        marginTop: width * CARD_ASPECT / 2 + 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: flash ? 'vsFlash 480ms ease-out' : undefined,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          padding: '0 5px 0 3px',
          fontFamily: AB,
          fontStyle: 'italic',
          fontSize: 16,
          letterSpacing: '-.02em',
          backgroundImage: flash === 'block' ? 'linear-gradient(160deg,#DFF7F3,#8FEDE3)' : 'linear-gradient(160deg,#FFD87A,#FF3D8B)',
          color: 'transparent',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        VS
      </span>
    </div>
  )
}

const POLL_SEGMENTS: {
  bucket: keyof PollState
  color: string
  label: 'pollFirm' | 'pollLean' | 'pollUndecided'
  side: 'player' | 'neutral' | 'opponent'
}[] = [
  { bucket: 'firmPlayer', color: '#168E85', label: 'pollFirm', side: 'player' },
  { bucket: 'ratherPlayer', color: '#45D8CB', label: 'pollLean', side: 'player' },
  { bucket: 'undecided', color: '#52647A', label: 'pollUndecided', side: 'neutral' },
  { bucket: 'ratherOpponent', color: '#FF87B8', label: 'pollLean', side: 'opponent' },
  { bucket: 'firmOpponent', color: '#C93672', label: 'pollFirm', side: 'opponent' },
]

function PollMeter({
  step,
  turn,
  poll,
  lastTurn,
  playerCard,
  oppCard,
  playerAction,
  oppAction,
}: {
  step: 'fight' | 'reveal' | 'result'
  turn: number
  poll: PollState
  lastTurn: CompletedDebateTurn | null
  playerCard: Member
  oppCard: Member
  playerAction: DebateAction | null
  oppAction: DebateAction | null
}) {
  const { t } = useI18n()
  const revealed = step === 'reveal' || step === 'result'
  const feedbackKey = lastTurn
    ? getDebateFeedbackKey(
        playerCard,
        lastTurn.playerAction,
        oppCard,
        lastTurn.oppAction,
        lastTurn.pollBefore,
        lastTurn.poll,
      )
    : null
  const deltas = lastTurn
    ? getPollDeltas(lastTurn.pollBefore, lastTurn.poll)
    : []
  const deltaLabels: Record<keyof PollState, string> = {
    firmPlayer: `◆ ${t('pollFirm')}`,
    ratherPlayer: `◆ ${t('pollLean')}`,
    undecided: t('pollUndecided'),
    ratherOpponent: `${t('pollLean')} ◆`,
    firmOpponent: `${t('pollFirm')} ◆`,
  }

  return (
    <div
      data-testid="debate-poll"
      aria-label={t('debatePollAria', {
        firmPlayer: poll.firmPlayer,
        ratherPlayer: poll.ratherPlayer,
        undecided: poll.undecided,
        ratherOpponent: poll.ratherOpponent,
        firmOpponent: poll.firmOpponent,
      })}
      style={{
        flex: 'none',
        width: '100%',
        maxWidth: 390,
        padding: '8px 10px 6px',
        borderRadius: 13,
        border: '1px solid rgba(234,242,255,.1)',
        background: 'rgba(11,18,29,.92)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'start', gap: 8 }}>
        <PollSideAction
          side="player"
          label={`◆ ${t('debateYou')}`}
          action={revealed ? playerAction : null}
        />
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.13em', color: '#9FB6D2' }}>
          {t('debateTurn', { current: turn, total: DEBATE_TURN_LIMIT })}
        </span>
        <PollSideAction
          side="opponent"
          label={`${t('opponent')} ◆`}
          action={revealed ? oppAction : null}
        />
      </div>

      <div
        data-testid="poll-track"
        style={{ position: 'relative', display: 'flex', height: 26, marginTop: 6, overflow: 'hidden', borderRadius: 7, background: '#263446' }}
      >
        {POLL_SEGMENTS.map(({ bucket, color }) => (
          <div
            key={bucket}
            data-bucket={bucket}
            style={{
              width: `${poll[bucket]}%`,
              flex: 'none',
              minWidth: 0,
              background: color,
              transition: 'width 1600ms cubic-bezier(.22,.75,.2,1)',
            }}
          />
        ))}
        <div
          data-testid="poll-midpoint"
          aria-hidden="true"
          style={{
            position: 'absolute',
            zIndex: 1,
            top: 0,
            bottom: 0,
            left: '50%',
            width: 2,
            transform: 'translateX(-1px)',
            background: '#F4F8FF',
            boxShadow: '0 0 0 1px rgba(7,12,19,.65),0 0 8px rgba(234,242,255,.7)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', marginTop: 4 }}>
        {POLL_SEGMENTS.map(({ bucket, label, side }) => (
          <div key={bucket} style={{ minWidth: 0, textAlign: 'center' }}>
            <div style={{ fontFamily: AB, fontSize: 8, letterSpacing: '.04em', color: '#91A7C1', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {side === 'player' ? '◆ ' : ''}{t(label)}{side === 'opponent' ? ' ◆' : ''}
            </div>
            <div style={{ marginTop: 1, fontFamily: MONO, fontSize: 11, color: '#EAF2FF' }}>
              {poll[bucket]}
            </div>
          </div>
        ))}
      </div>

      <div
        data-testid="debate-feedback"
        role="status"
        aria-live="polite"
        style={{ minHeight: 54, marginTop: 5, paddingTop: 5, borderTop: '1px solid rgba(234,242,255,.08)', textAlign: 'center' }}
      >
        {feedbackKey ? (
          <>
            <div style={{ fontSize: 11, lineHeight: 1.35, color: '#C9D8EA' }}>{t(feedbackKey)}</div>
            <div data-testid="poll-deltas" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '3px 8px', marginTop: 5 }}>
              {deltas.map(({ bucket, amount }) => (
                <span key={bucket} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '.04em', color: amount > 0 ? '#FFD87A' : '#7890AC' }}>
                  {deltaLabels[bucket]} {amount > 0 ? '+' : ''}{amount}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function PollSideAction({
  side,
  label,
  action,
}: {
  side: 'player' | 'opponent'
  label: string
  action: DebateAction | null
}) {
  const { t } = useI18n()
  return (
    <div style={{ minWidth: 0, textAlign: side === 'player' ? 'left' : 'right' }}>
      <div style={{ fontFamily: AB, fontSize: 9, letterSpacing: '.12em', color: side === 'player' ? '#45D8CB' : '#FF87B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </div>
      <div
        style={{
          minHeight: 10,
          marginTop: 2,
          fontFamily: MONO,
          fontSize: 8,
          letterSpacing: '.08em',
          color: action === 'attack' ? '#FF87B8' : '#72E2D8',
          visibility: action ? 'visible' : 'hidden',
        }}
      >
        {action ? (action === 'attack' ? t('attacked') : t('defended')) : '\u00a0'}
      </div>
    </div>
  )
}

function statFor(action: DebateAction | null): 'atk' | 'def' | null {
  if (action === 'attack') return 'atk'
  if (action === 'defend') return 'def'
  return null
}

function stackedActionButtonStyle(color: string): CSSProperties {
  return {
    width: '100%',
    padding: '11px 8px',
    borderRadius: 10,
    background: `${color}22`,
    border: `1px solid ${color}`,
    color,
    fontFamily: AB,
    fontSize: 12,
    letterSpacing: '.06em',
    textAlign: 'center',
    cursor: 'pointer',
  }
}

function DebateCard({
  side,
  label,
  labelColor,
  member,
  width,
  highlightStat,
  motion,
  dimmed = false,
  own = false,
  actionSlot = null,
}: {
  side: 'player' | 'opponent'
  label: string
  labelColor: string
  member: Member
  width: number
  highlightStat: 'atk' | 'def' | null
  motion: CardMotion | null
  dimmed?: boolean
  own?: boolean
  actionSlot?: ReactNode
}) {
  const tier = TIERS[member.ratings.rarity]
  return (
    <div
      data-testid={`debate-card-${side}`}
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
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: '.16em',
          color: labelColor,
          boxSizing: 'border-box',
          height: 25,
          display: 'flex',
          alignItems: 'center',
          // The own-card badge (pill background + border) is the primary
          // "this one is you" signal — the ring/glow on the card below
          // reinforces it, but the label is what's visible even before
          // you've registered the card art.
          ...(own
            ? {
                padding: '3px 9px',
                borderRadius: 20,
                background: 'rgba(143,237,227,.16)',
                border: '1px solid rgba(143,237,227,.5)',
              }
            : {}),
        }}
      >
        {label}
      </div>
      <div style={motionStyle(motion)}>
        <ScaledCard
          width={width}
          member={member}
          highlightStat={highlightStat}
          style={{
            boxShadow: own
              ? '0 20px 46px -20px rgba(0,0,0,.75), 0 0 0 2px #8FEDE3, 0 0 24px 2px rgba(143,237,227,.4)'
              : `0 20px 46px -20px rgba(0,0,0,.7),0 0 0 1px ${tier.c}8c`,
          }}
        />
      </div>
      {actionSlot}
    </div>
  )
}
