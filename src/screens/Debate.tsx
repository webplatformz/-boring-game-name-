import { useEffect, useMemo, useRef, useState } from 'react'
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
import { CAMPAIGN_RARITIES } from '../game/debateCampaign'
import {
  getDebateFeedbackKey,
  getPollDeltas,
} from '../game/debateFeedback'
import { CardFront } from '../components/CardFront'
import { FixedCardGlow } from '../components/CardGlow'
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
// Everything in the duel besides the card itself: screen padding, header,
// campaign HUD, poll meter, gaps and the action/result slot. App navigation
// and the legal footer are hidden while a duel is active.
const DEBATE_CHROME_H = 340

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
function ScaledCard({ width, className, member, foil = true, highlightStat = null, dimmed = false, style }: {
  width?: number
  className?: string
  member: Member
  foil?: boolean
  highlightStat?: 'atk' | 'def' | null
  dimmed?: boolean
  style?: CSSProperties
}) {
  const scale = width ? width / CARD_MAX_W : undefined
  const height = width ? width * (504 / 336) : undefined
  const anchor = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={anchor}
      className={className}
      data-testid="debate-card-glow-anchor"
      style={{ width, height, position: 'relative' }}
    >
      <FixedCardGlow
        rarity={member.ratings.rarity}
        anchor={anchor}
        opacity={dimmed ? 0.22 : 1}
      />
      <div
        data-testid="scaled-card-surface"
        style={{
          width: CARD_MAX_W,
          height: CARD_MAX_W * (504 / 336),
          position: 'absolute',
          top: 0,
          left: 0,
          filter: dimmed ? 'brightness(.55) saturate(.55)' : 'none',
          transform: scale ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
          transition: 'filter 300ms ease-out',
        }}
      >
        <CardFront member={member} foil={foil} highlightStat={highlightStat} style={style} />
      </div>
    </div>
  )
}

export function Debate({ game, debate }: { game: Game; debate: DebateHook }) {
  const { t } = useI18n()
  const { record } = debate.state
  const [confirmingAbandon, setConfirmingAbandon] = useState(false)

  useEffect(() => {
    debate.enter()
    return debate.reset
  }, [debate.enter, debate.reset])

  const ownedList = useMemo(() => {
    return Object.keys(game.state.owned)
      .map((id) => MEMBERS_BY_ID.get(Number(id)))
      .filter((m): m is Member => Boolean(m))
      .sort((a, b) => b.ratings.ovr - a.ratings.ovr)
  }, [game.state.owned])

  return (
    <div
      className="screen-fill"
      data-testid="debate-screen"
      // Clip horizontal lunge overflow once at the full screen boundary.
      // Vertical content remains in document flow so short phone viewports
      // can scroll to campaign result actions. Card glows are portalled.
      style={{ padding: '10px 20px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflowX: 'clip', animation: 'riseIn 300ms ease-out' }}
    >
      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: AB, fontSize: 26, letterSpacing: '-.03em' }}>{t('debateTitle')}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontFamily: MONO, fontSize: 11, letterSpacing: '.1em' }}>
            <span style={{ color: '#8FEDE3' }}>{t('winsShort', { count: record.wins })}</span>
            <span style={{ color: '#3E5170' }}>·</span>
            <span style={{ color: '#FF9EC4' }}>{t('lossesShort', { count: record.losses })}</span>
          </div>
          {debate.state.view === 'duel' && (
            <button
              onClick={game.goHome}
              aria-label={t('campaignExit')}
              title={t('campaignExit')}
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(234,242,255,.16)', color: '#9FB6D2', fontFamily: MONO, fontSize: 20, lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {debate.state.view === 'pick' && (
        <Picker
          ownedList={ownedList}
          onPick={debate.pickPlayerCard}
          onGoHome={game.goHome}
        />
      )}

      {debate.state.view === 'choose-mode' && (
        <ModeChoice
          playerCard={debate.state.playerCard}
          onStartTraining={debate.startTraining}
          onStartCampaign={debate.startCampaign}
          campaignAvailability={debate.state.campaignAvailability}
          onChooseAnother={debate.chooseAnotherCard}
        />
      )}

      {debate.state.view === 'campaign-loading' && (
        <CampaignPanel
          title={t('campaignResuming')}
          body={t('campaignResumingBody')}
        />
      )}

      {debate.state.view === 'campaign-choice' && (
        <CampaignChoice
          campaign={debate.state.campaign}
          playerCard={debate.state.playerCard}
          onBank={debate.bankCampaign}
          onContinue={debate.continueCampaign}
          onAbandon={() => setConfirmingAbandon(true)}
        />
      )}

      {debate.state.view === 'campaign-result' && (
        <CampaignResult
          result={debate.state.result}
          onDismiss={debate.dismissCampaignResult}
        />
      )}

      {debate.state.view === 'campaign-storage-error' && (
        <CampaignStorageError
          onRetry={debate.retryCampaignWrite}
          onExit={() => {
            debate.reset()
            game.goHome()
          }}
        />
      )}

      {/* fight/reveal/result share one persistent Arena instance so the cards
       * never unmount+remount between them — that full-tree swap was the
       * cause of the jarring instant cut into the result screen. Only the
       * footer content (buttons → status → banner) changes underneath. */}
      {debate.state.view === 'duel' && (
        <>
          {debate.state.mode === 'campaign' && debate.state.campaign && (
            <CampaignHud
              campaign={debate.state.campaign}
              onAbandon={() => setConfirmingAbandon(true)}
            />
          )}
          <Arena
            step={debate.state.step}
            playerCard={debate.state.playerCard}
            oppCard={debate.state.oppCard}
            playerAction={debate.state.playerAction}
            oppAction={debate.state.oppAction}
            poll={debate.state.poll}
            lastTurn={debate.state.lastTurn}
            turn={debate.state.turn}
            winner={debate.state.winner}
            onChoose={debate.chooseAction}
            onFightAgain={
              debate.state.mode === 'training' ? debate.reset : undefined
            }
            resultFooter={
              debate.state.mode === 'campaign' ? (
                <CampaignDuelFooter
                  campaign={debate.state.campaign}
                  result={debate.state.campaignResult}
                  onBank={debate.bankCampaign}
                  onContinue={debate.continueCampaign}
                  onDone={debate.dismissCampaignResult}
                />
              ) : undefined
            }
          />
        </>
      )}

      {confirmingAbandon && (
        <AbandonCampaignDialog
          onConfirm={() => {
            setConfirmingAbandon(false)
            debate.abandonCampaign()
          }}
          onCancel={() => setConfirmingAbandon(false)}
        />
      )}
    </div>
  )
}

function ModeChoice({
  playerCard,
  onStartTraining,
  onStartCampaign,
  campaignAvailability,
  onChooseAnother,
}: {
  playerCard: Member
  onStartTraining: () => void
  onStartCampaign: () => void
  campaignAvailability: number
  onChooseAnother: () => void
}) {
  const { t } = useI18n()

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        overflowY: 'auto',
        padding: '0 0 6px',
      }}
    >
      <ScaledCard className="mode-choice-card" member={playerCard} />
      <div style={{ width: '100%', maxWidth: 360, display: 'grid', gap: 10 }}>
        <button
          onClick={onStartTraining}
          style={modeButtonStyle('#2FD3C4')}
        >
          <span style={{ fontFamily: AB, fontSize: 15 }}>{t('singleDebateTitle')}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, lineHeight: 1.45, color: '#9FB6D2' }}>
            {t('singleDebateBody')}
          </span>
        </button>
        <button
          disabled={campaignAvailability < 1}
          aria-describedby={
            campaignAvailability < 1 ? 'campaign-mode-unavailable' : undefined
          }
          onClick={onStartCampaign}
          style={{
            ...modeButtonStyle('#FFC53D'),
            cursor: campaignAvailability < 1 ? 'not-allowed' : 'pointer',
            opacity: campaignAvailability < 1 ? 0.55 : 1,
          }}
        >
          <span style={{ fontFamily: AB, fontSize: 15 }}>{t('campaignTitle')}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, lineHeight: 1.45, color: '#9FB6D2' }}>
            {t('campaignBody')}
          </span>
          <span
            id={
              campaignAvailability < 1
                ? 'campaign-mode-unavailable'
                : undefined
            }
            style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: '#FFD87A' }}
          >
            {campaignAvailability < 1
              ? t('campaignUnavailableToday')
              : t('campaignCopiesAvailable', {
                  count: campaignAvailability,
                })}
          </span>
        </button>
      </div>
      <button
        onClick={onChooseAnother}
        style={{ padding: '8px 12px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: '#7690AE' }}
      >
        {t('chooseAnotherCard')}
      </button>
    </div>
  )
}

function CampaignHud({
  campaign,
  onAbandon,
}: {
  campaign: NonNullable<Extract<DebateHook['state'], { view: 'duel' }>['campaign']>
  onAbandon: () => void
}) {
  const { t, rarity } = useI18n()
  return (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderRadius: 9, border: '1px solid rgba(255,197,61,.28)', background: 'rgba(255,197,61,.07)', fontFamily: MONO, fontSize: 9 }}>
      <span style={{ color: '#FFD87A', letterSpacing: '.1em' }}>
        {t('campaignStage', {
          current: campaign.stageIndex + 1,
          total: CAMPAIGN_RARITIES.length,
          rarity: rarity(CAMPAIGN_RARITIES[campaign.stageIndex]),
        })}
      </span>
      <span style={{ color: '#9FB6D2' }}>
        {t('campaignPacksAtRisk', { count: campaign.unbankedPacks })}
      </span>
      <button onClick={onAbandon} style={{ color: '#FF9EC4', letterSpacing: '.08em' }}>
        {t('campaignAbandon')}
      </button>
    </div>
  )
}

function CampaignChoice({
  campaign,
  playerCard,
  onBank,
  onContinue,
  onAbandon,
}: {
  campaign: Extract<DebateHook['state'], { view: 'campaign-choice' }>['campaign']
  playerCard: Member
  onBank: () => void
  onContinue: () => void
  onAbandon: () => void
}) {
  const { t, rarity } = useI18n()
  const nextRarity = CAMPAIGN_RARITIES[campaign.stageIndex + 1]
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
      <div style={{ fontFamily: AB, fontSize: 22, color: '#FFC53D' }}>{t('campaignStageWon')}</div>
      <ScaledCard width={130} member={playerCard} />
      <div style={{ fontFamily: MONO, fontSize: 12, color: '#EAF2FF' }}>
        {t('campaignPacksSecured', { count: campaign.unbankedPacks })}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#7690AE', maxWidth: 300, lineHeight: 1.5 }}>
        {t('campaignNextRisk', { rarity: rarity(nextRarity) })}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBank} style={campaignActionStyle('#2FD3C4')}>
          {t('campaignBank')}
        </button>
        <button onClick={onContinue} style={campaignActionStyle('#FFC53D')}>
          {t('campaignContinue')}
        </button>
      </div>
      <button onClick={onAbandon} style={{ fontFamily: MONO, fontSize: 10, color: '#FF9EC4' }}>
        {t('campaignAbandon')}
      </button>
    </div>
  )
}

function CampaignResult({
  result,
  onDismiss,
}: {
  result: Extract<DebateHook['state'], { view: 'campaign-result' }>['result']
  onDismiss: () => void
}) {
  const { t } = useI18n()
  const wonPacks = result.packs > 0
  return (
    <CampaignPanel
      title={
        result.outcome === 'completed'
          ? t('campaignCompleted')
          : result.outcome === 'banked'
            ? t('campaignBanked')
            : result.outcome === 'abandoned'
              ? t('campaignAbandoned')
              : t('campaignLost')
      }

      body={
        wonPacks
          ? t('campaignRewarded', { count: result.packs })
          : t('campaignRewardForfeited')
      }
    >
      <button onClick={onDismiss} style={campaignActionStyle('#FFC53D')}>
        {t('campaignDone')}
      </button>
    </CampaignPanel>
  )
}

function CampaignDuelFooter({
  campaign,
  result,
  onBank,
  onContinue,
  onDone,
}: {
  campaign: Extract<DebateHook['state'], { view: 'duel' }>['campaign']
  result: Extract<DebateHook['state'], { view: 'duel' }>['campaignResult']
  onBank: () => void
  onContinue: () => void
  onDone: () => void
}) {
  const { t, rarity } = useI18n()

  if (campaign?.phase === 'awaiting-choice') {
    const nextRarity = CAMPAIGN_RARITIES[campaign.stageIndex + 1]
    return (
      <>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#EAF2FF' }}>
          {t('campaignPacksSecured', { count: campaign.unbankedPacks })}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#7690AE', textAlign: 'center', lineHeight: 1.4 }}>
          {t('campaignNextRisk', { rarity: rarity(nextRarity) })}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBank} style={campaignActionStyle('#2FD3C4')}>
            {t('campaignBank')}
          </button>
          <button onClick={onContinue} style={campaignActionStyle('#FFC53D')}>
            {t('campaignContinue')}
          </button>
        </div>
      </>
    )
  }

  if (!result) return null
  const wonPacks = result.packs > 0
  const title =
    result.outcome === 'completed'
      ? t('campaignCompleted')
      : result.outcome === 'banked'
        ? t('campaignBanked')
        : result.outcome === 'abandoned'
          ? t('campaignAbandoned')
          : t('campaignLost')

  return (
    <>
      <div style={{ fontFamily: AB, fontSize: 13, color: '#FFC53D' }}>{title}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#9FB6D2', textAlign: 'center' }}>
        {wonPacks
          ? t('campaignRewarded', { count: result.packs })
          : t('campaignRewardForfeited')}
      </div>
      <button onClick={onDone} style={campaignActionStyle('#FFC53D')}>
        {t('campaignDone')}
      </button>
    </>
  )
}

function CampaignStorageError({
  onRetry,
  onExit,
}: {
  onRetry: () => void
  onExit: () => void
}) {
  const { t } = useI18n()
  return (
    <CampaignPanel
      title={t('campaignStorageError')}
      body={t('campaignStorageErrorBody')}
    >
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onRetry} style={campaignActionStyle('#FFC53D')}>
          {t('campaignRetry')}
        </button>
        <button onClick={onExit} style={campaignActionStyle('#7690AE')}>
          {t('campaignExit')}
        </button>
      </div>
    </CampaignPanel>
  )
}

function CampaignPanel({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center', padding: 20 }}>
      <div style={{ fontFamily: AB, fontSize: 22, color: '#FFC53D' }}>{title}</div>
      <div style={{ maxWidth: 320, fontFamily: MONO, fontSize: 11, lineHeight: 1.55, color: '#9FB6D2' }}>{body}</div>
      {children}
    </div>
  )
}

function AbandonCampaignDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef(onCancel)
  cancelRef.current = onCancel

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const controls = Array.from(
        dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
      )
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [])

  return (
    <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(4,8,14,.82)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="abandon-campaign-title" style={{ width: 'min(340px, 100%)', display: 'flex', flexDirection: 'column', gap: 14, padding: 20, borderRadius: 14, border: '1px solid rgba(255,95,162,.4)', background: '#0B121D', textAlign: 'center' }}>
        <div id="abandon-campaign-title" style={{ fontFamily: AB, fontSize: 20, color: '#FF9EC4' }}>{t('campaignAbandonTitle')}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.5, color: '#9FB6D2' }}>{t('campaignAbandonBody')}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button autoFocus onClick={onCancel} style={campaignActionStyle('#7690AE')}>{t('campaignCancel')}</button>
          <button onClick={onConfirm} style={campaignActionStyle('#FF5FA2')}>{t('campaignAbandonConfirm')}</button>
        </div>
      </div>
    </div>
  )
}

function campaignActionStyle(accent: string): CSSProperties {
  return {
    padding: '11px 18px',
    borderRadius: 10,
    border: `1px solid ${accent}88`,
    background: `${accent}18`,
    color: accent,
    fontFamily: AB,
    fontSize: 12,
    letterSpacing: '.05em',
  }
}

function modeButtonStyle(accent: string): CSSProperties {
  return {
    minHeight: 88,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 7,
    padding: '13px 16px',
    borderRadius: 12,
    border: `1px solid ${accent}55`,
    borderLeft: `4px solid ${accent}`,
    background: '#0B121D',
    color: '#EAF2FF',
    textAlign: 'left',
  }
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
  resultFooter,
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
  onFightAgain?: () => void
  resultFooter?: ReactNode
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
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        paddingBottom: 4,
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
            {onFightAgain && (
              <button
                onClick={onFightAgain}
                style={{ marginTop: 0, padding: '11px 24px', borderRadius: 12, background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 13, letterSpacing: '.06em' }}
              >
                {t('debateAgain')}
              </button>
            )}
            {resultFooter}
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
      data-testid="debate-vs"
      aria-hidden="true"
      style={{
        flex: 'none',
        width: 40,
        height: 28,
        marginTop: 25 + 6 + width * CARD_ASPECT / 2 - 14,
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
      }}
    >
      <div
        data-testid={`debate-card-label-${side}`}
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
          dimmed={dimmed}
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
