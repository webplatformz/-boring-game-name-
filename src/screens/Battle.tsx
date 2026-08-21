import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { MEMBERS_BY_ID } from '../data/members'
import type { Member } from '../data/members'
import { CARD_MAX_W, TIERS, partyColors } from '../theme'
import type { Game } from '../game/useGame'
import type {
  Battle as BattleHook,
  CompletedDebateTurn,
} from '../game/useBattle'
import {
  DEBATE_TURN_LIMIT,
  type Action,
  type PollState,
  type PollWinner,
} from '../game/battle'
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

const DEBATE_CARD_W_MAX = Math.min(0.4 * CARD_MAX_W, 125)
const CARD_ASPECT = 504 / 336
const DEBATE_CHROME_H = 465

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
  const widthFromHeight = heightBudget / 2 / CARD_ASPECT
  const widthFromWidth = vw - 40
  return Math.max(100, Math.min(DEBATE_CARD_W_MAX, widthFromHeight, widthFromWidth))
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

export function Battle({ game, battle }: { game: Game; battle: BattleHook }) {
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
  } = battle.state

  useEffect(() => battle.reset, [battle.reset])

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
  playerAction: Action | null
  oppAction: Action | null
  poll: PollState
  lastTurn: CompletedDebateTurn | null
  turn: number
  winner: PollWinner | null
  onChoose: (action: Action) => void
  onFightAgain: () => void
}) {
  const { t } = useI18n()
  const locked = playerAction !== null
  const revealed = step === 'reveal' || step === 'result'
  const won = winner?.winner === 'player'
  const cardW = useFightCardWidth()

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 9,
        paddingBottom: 4,
      }}
    >
      <BattleCard
        side="opponent"
        label={t('opponent')}
        labelColor="#FF9EC4"
        member={oppCard}
        width={cardW}
        highlightStat={revealed ? statFor(oppAction) : null}
        bump={step === 'reveal' && oppAction === 'attack' ? 'down' : null}
        dimmed={step === 'result' && won}
      />

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

      <BattleCard
        side="player"
        label={t('yourCard')}
        labelColor="#8FEDE3"
        member={playerCard}
        width={cardW}
        highlightStat={revealed ? statFor(playerAction) : null}
        bump={step === 'reveal' && playerAction === 'attack' ? 'up' : null}
        dimmed={step === 'result' && !won}
      />

      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 340, marginTop: 4, minHeight: 82 }}>
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

        {step === 'fight' && locked && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '.16em',
              color: '#9FB6D2',
              animation: 'glowPulse 1000ms ease-in-out infinite',
            }}
          >
            {t('lockingIn')}
          </div>
        )}

        {step === 'result' && winner && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, animation: 'riseIn 320ms ease-out' }}>
            <div style={{ fontFamily: AB, fontSize: 22, letterSpacing: '-.02em', color: won ? '#FFC53D' : '#FF5FA2' }}>
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
              style={{ marginTop: 2, padding: '13px 26px', borderRadius: 12, background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 13, letterSpacing: '.06em' }}
            >
              {t('debateAgain')}
            </button>
          </div>
        )}
      </div>
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
  playerAction: Action | null
  oppAction: Action | null
}) {
  const { t } = useI18n()
  const revealed = step === 'reveal' || step === 'result'
  const feedbackKey = lastTurn
    ? getDebateFeedbackKey(
        playerCard,
        lastTurn.playerAction,
        oppCard,
        lastTurn.oppAction,
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
        padding: '10px 10px 9px',
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
        style={{ position: 'relative', display: 'flex', height: 26, marginTop: 8, overflow: 'hidden', borderRadius: 7, background: '#263446' }}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', marginTop: 5 }}>
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
        style={{ minHeight: 54, marginTop: 7, paddingTop: 7, borderTop: '1px solid rgba(234,242,255,.08)', textAlign: 'center' }}
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
  action: Action | null
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
  side,
  label,
  labelColor,
  member,
  width,
  highlightStat,
  bump,
  dimmed = false,
}: {
  side: 'player' | 'opponent'
  label: string
  labelColor: string
  member: Member
  width: number
  highlightStat: 'atk' | 'def' | null
  bump: 'up' | 'down' | null
  dimmed?: boolean
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
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: labelColor }}>{label}</div>
      <div style={{ animation: bump ? `${bump === 'up' ? 'bumpUp' : 'bumpDown'} 560ms ease-out` : undefined }}>
        <ScaledCard
          width={width}
          member={member}
          highlightStat={highlightStat}
          style={{ boxShadow: `0 20px 46px -20px rgba(0,0,0,.7),0 0 0 1px ${tier.c}8c` }}
        />
      </div>
    </div>
  )
}
