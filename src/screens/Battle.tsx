import { useMemo } from 'react'
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

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

/** Width used for the two stacked cards during the fight/reveal steps —
 * smaller than the full-size card so both fit one viewport with the
 * action buttons below. */
const FIGHT_CARD_W = Math.min(0.6 * CARD_MAX_W, 210)
/** Even smaller pair shown side by side on the result screen. */
const RESULT_CARD_W = Math.min(0.5 * CARD_MAX_W, 170)

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
        <CardGlow rarity={member.rarity} />
        <CardFront member={member} foil={foil} highlightStat={highlightStat} style={style} />
      </div>
    </div>
  )
}

export function Battle({ game, battle }: { game: Game; battle: BattleHook }) {
  const { step, record, playerCard, oppCard, playerAction, oppAction, result } = battle.state

  const ownedList = useMemo(() => {
    return Object.keys(game.state.owned)
      .map((id) => MEMBERS_BY_ID.get(Number(id)))
      .filter((m): m is Member => Boolean(m))
      .sort((a, b) => b.ovr - a.ovr)
  }, [game.state.owned])

  return (
    <div
      className="screen-fill"
      // No overflow:hidden here (unlike Collection) — the fight/reveal/result
      // steps render CardGlow directly in the flow, and its bloom is meant to
      // bleed past the card edges (see CardModal/Reveal for the same pattern).
      style={{ padding: '22px 20px 90px', display: 'flex', flexDirection: 'column', gap: 16, animation: 'riseIn 300ms ease-out' }}
    >
      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: AB, fontSize: 26, letterSpacing: '-.03em' }}>BATTLE</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontFamily: MONO, fontSize: 11, letterSpacing: '.1em' }}>
          <span style={{ color: '#8FEDE3' }}>{record.wins}W</span>
          <span style={{ color: '#3E5170' }}>·</span>
          <span style={{ color: '#FF9EC4' }}>{record.losses}L</span>
        </div>
      </div>

      {step === 'pick' && <Picker ownedList={ownedList} onPick={battle.pickPlayerCard} onGoHome={game.goHome} />}

      {(step === 'fight' || step === 'reveal') && playerCard && oppCard && (
        <Fight
          revealed={step === 'reveal'}
          playerCard={playerCard}
          oppCard={oppCard}
          playerAction={playerAction}
          oppAction={oppAction}
          onChoose={battle.chooseAction}
        />
      )}

      {step === 'result' && result && playerCard && oppCard && (
        <Result
          result={result}
          playerCard={playerCard}
          oppCard={oppCard}
          playerAction={playerAction}
          oppAction={oppAction}
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
  if (ownedList.length === 0) {
    return (
      <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', padding: '0 10px' }}>
        <div style={{ fontFamily: AB, fontSize: 19, color: '#3E5170', letterSpacing: '.02em' }}>NO FIGHTERS YET</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#5C7391', maxWidth: 260 }}>
          Rip a pack first — you need at least one card to enter battle.
        </div>
        <button
          onClick={onGoHome}
          style={{ marginTop: 4, padding: '14px 24px', borderRadius: 12, background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 13, letterSpacing: '.06em' }}
        >
          GO GET A PACK
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{ flex: 'none', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: '#5C7391' }}>CHOOSE YOUR FIGHTER</div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(234,242,255,.1)', background: '#0B121D' }}>
        <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: '1fr 40px 40px 44px', gap: 8, padding: '10px 12px', background: 'rgba(234,242,255,.05)', borderBottom: '1px solid rgba(234,242,255,.1)' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#5C7391' }}>MEMBER</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#FF9EC4', textAlign: 'right' }}>ATK</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#8FEDE3', textAlign: 'right' }}>DEF</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#FFD87A', textAlign: 'right' }}>OVR</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {ownedList.map((m) => {
            const t = TIERS[m.rarity]
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
                    <span style={{ padding: '2px 5px', borderRadius: 4, background: pc[0], fontFamily: AB, fontSize: 8, color: pc[1] }}>{m.party}</span>
                    <Flag canton={m.canton} height={10} />
                    <span style={{ fontFamily: MONO, fontSize: 9, color: '#7690AE' }}>{m.cantonName}</span>
                  </div>
                </div>
                <div style={{ fontFamily: AB, fontSize: 15, color: '#FF5FA2', textAlign: 'right', alignSelf: 'center' }}>{m.atk}</div>
                <div style={{ fontFamily: AB, fontSize: 15, color: '#2FD3C4', textAlign: 'right', alignSelf: 'center' }}>{m.def}</div>
                <div style={{ fontFamily: AB, fontSize: 15, textAlign: 'right', alignSelf: 'center', color: t.ovrTint }}>{m.ovr}</div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── fight / reveal: opponent stacked above the player's own card ───────────
// Vertical stacking (rather than side by side) is deliberate — this app is
// mobile-width first, and two full-height cards side by side would be
// cramped. The player's card always anchors the bottom so it's unambiguous
// which one is "yours".

function Fight({
  revealed,
  playerCard,
  oppCard,
  playerAction,
  oppAction,
  onChoose,
}: {
  revealed: boolean
  playerCard: Member
  oppCard: Member
  playerAction: Action | null
  oppAction: Action | null
  onChoose: (action: Action) => void
}) {
  const locked = playerAction !== null

  return (
    // No overflowY:auto here — that would force overflow-x to 'auto' too
    // (per the CSS overflow spec) and clip CardGlow's horizontal bleed.
    // Card sizes are chosen to fit typical viewports without scrolling.
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
      <BattleCard
        label="OPPONENT"
        labelColor="#FF9EC4"
        member={oppCard}
        width={FIGHT_CARD_W}
        highlightStat={revealed ? statFor(oppAction) : null}
        actionLabel={revealed ? oppAction : null}
      />

      <div style={{ flex: 'none', fontFamily: AB, fontSize: 13, letterSpacing: '.1em', color: '#5C7391' }}>VS</div>

      <BattleCard
        label="YOUR CARD"
        labelColor="#8FEDE3"
        member={playerCard}
        width={FIGHT_CARD_W}
        highlightStat={revealed ? statFor(playerAction) : null}
        actionLabel={revealed ? playerAction : null}
      />

      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 320, marginTop: 6, minHeight: 52 }}>
        {!locked ? (
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button onClick={() => onChoose('attack')} style={actionButtonStyle('#FF3D8B')}>
              ATTACK
            </button>
            <button onClick={() => onChoose('defend')} style={actionButtonStyle('#2FD3C4')}>
              DEFEND
            </button>
          </div>
        ) : (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '.16em',
              color: '#9FB6D2',
              animation: 'glowPulse 1000ms ease-in-out infinite',
            }}
          >
            {revealed ? 'RESOLVING…' : 'LOCKING IN…'}
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
}: {
  label: string
  labelColor: string
  member: Member
  width: number
  highlightStat: 'atk' | 'def' | null
  actionLabel: Action | null
}) {
  const t = TIERS[member.rarity]
  return (
    <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: labelColor }}>{label}</div>
      <ScaledCard
        width={width}
        member={member}
        highlightStat={highlightStat}
        style={{ boxShadow: `0 20px 46px -20px rgba(0,0,0,.7),0 0 0 1px ${t.c}8c` }}
      />
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
          {actionLabel === 'attack' ? 'ATTACKED' : 'DEFENDED'}
        </div>
      )}
    </div>
  )
}

// ── result: win/lose banner + both cards, then rematch ──────────────────────

function Result({
  result,
  playerCard,
  oppCard,
  playerAction,
  oppAction,
  onFightAgain,
}: {
  result: BattleResult
  playerCard: Member
  oppCard: Member
  playerAction: Action | null
  oppAction: Action | null
  onFightAgain: () => void
}) {
  const won = result.winner === 'player'

  return (
    // Same reasoning as Fight: no overflowY:auto, so CardGlow's bleed isn't
    // clipped by a forced overflow-x:auto. riseIn plays on mount, i.e. right
    // when the step switches from 'reveal' to 'result'.
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '10px 0', animation: 'riseIn 360ms ease-out' }}>
      <div style={{ fontFamily: AB, fontSize: 28, letterSpacing: '-.02em', color: won ? '#FFC53D' : '#FF5FA2', textAlign: 'center' }}>
        {won ? 'YOU WON!' : 'YOU LOST'}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.08em', color: '#9FB6D2', textAlign: 'center' }}>{result.reason}</div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ opacity: won ? 1 : 0.55 }}>
          <ScaledCard width={RESULT_CARD_W} member={playerCard} highlightStat={statFor(playerAction)} />
        </div>
        <div style={{ fontFamily: AB, fontSize: 13, color: '#5C7391' }}>VS</div>
        <div style={{ opacity: won ? 0.55 : 1 }}>
          <ScaledCard width={RESULT_CARD_W} member={oppCard} highlightStat={statFor(oppAction)} />
        </div>
      </div>

      <button
        onClick={onFightAgain}
        style={{ marginTop: 6, padding: '14px 28px', borderRadius: 12, background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 13, letterSpacing: '.06em' }}
      >
        FIGHT AGAIN
      </button>
    </div>
  )
}
