// Wires live game state into the achievement definitions: evaluates unlocks,
// grants bonus packs, and queues toast notifications. Mounted once in App so
// achievements keep unlocking regardless of which screen is active.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { MEMBERS_BY_ID } from '../data/members'
import type { Member } from '../data/members'
import type { Game } from './useGame'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_REWARD_PACKS,
  getAchievementProgress,
  markAchievementsUnlocked,
  recordPackCompletion,
  recordTrade,
  subscribeAchievementProgress,
} from './achievements'
import type { AchievementContext, AchievementDef } from './achievements'

export interface AchievementView extends AchievementDef {
  unlocked: boolean
  unlockedAt: number | null
  current: number
  goal: number
}

export interface AchievementsApi {
  achievements: AchievementView[]
  /** Visible (non-hidden) achievements unlocked so far. */
  unlockedCount: number
  /** Total visible (non-hidden) achievements. */
  totalCount: number
  toast: AchievementDef | null
  dismissToast: () => void
}

function resolveOwnedList(owned: Record<number, number>): Member[] {
  return Object.keys(owned)
    .map((id) => MEMBERS_BY_ID.get(Number(id)))
    .filter((m): m is Member => Boolean(m))
}

export function useAchievements(game: Game): AchievementsApi {
  const progress = useSyncExternalStore(subscribeAchievementProgress, getAchievementProgress)
  const [toastQueue, setToastQueue] = useState<AchievementDef[]>([])

  const lastPackSeq = useRef(game.state.packCompletionSeq)
  useEffect(() => {
    if (game.state.packCompletionSeq === lastPackSeq.current) return
    lastPackSeq.current = game.state.packCompletionSeq
    recordPackCompletion(game.state.lastPackMembers, game.state.lastPackWasTrade)
  }, [game.state.packCompletionSeq, game.state.lastPackMembers, game.state.lastPackWasTrade])

  const lastTradeCount = useRef(game.state.tradesExecuted)
  useEffect(() => {
    if (game.state.tradesExecuted === lastTradeCount.current) return
    lastTradeCount.current = game.state.tradesExecuted
    recordTrade()
  }, [game.state.tradesExecuted])

  const context = useMemo<AchievementContext>(() => {
    const ownedList = resolveOwnedList(game.state.owned)
    return {
      owned: game.state.owned,
      ownedList,
      totalOwnedCopies: Object.values(game.state.owned).reduce((sum, n) => sum + n, 0),
      cardsRevealed: game.state.cardsRevealed,
      packsOpened: game.state.packsOpened,
      tradesCompleted: progress.tradesCompleted,
      streakBest: progress.streakBest,
      languagesUsed: progress.languagesUsed,
      legalPagesOpened: progress.legalPagesOpened,
      contactEmailClicked: progress.contactEmailClicked,
      sleeplessTriggered: progress.sleeplessTriggered,
      mythicDirectPull: progress.mythicDirectPull,
    }
  }, [game.state.owned, game.state.cardsRevealed, game.state.packsOpened, progress])

  useEffect(() => {
    const newly = ACHIEVEMENTS.filter((a) => !(a.id in progress.unlocked) && a.check(context))
    if (newly.length === 0) return
    // markAchievementsUnlocked re-checks against the live store and only
    // returns ids it actually applied, so a duplicate effect invocation with
    // the same stale `newly` (e.g. React StrictMode's double-invoke of mount
    // effects) can't grant rewards or queue toasts twice for the same unlock.
    const applied = markAchievementsUnlocked(newly.map((a) => a.id))
    if (applied.length === 0) return
    const appliedDefs = newly.filter((a) => applied.includes(a.id))
    game.grantBonusPacks(appliedDefs.length * ACHIEVEMENT_REWARD_PACKS)
    setToastQueue((q) => [...q, ...appliedDefs])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context])

  const achievements = useMemo<AchievementView[]>(
    () =>
      ACHIEVEMENTS.map((def) => {
        const unlockedAt = progress.unlocked[def.id] ?? null
        const p = def.progress?.(context)
        return {
          ...def,
          unlocked: unlockedAt !== null,
          unlockedAt,
          current: unlockedAt !== null ? (p?.goal ?? 1) : (p?.current ?? 0),
          goal: p?.goal ?? 1,
        }
      }),
    [context, progress.unlocked],
  )

  const visible = achievements.filter((a) => !a.hidden)

  return {
    achievements,
    unlockedCount: visible.filter((a) => a.unlocked).length,
    totalCount: visible.length,
    toast: toastQueue[0] ?? null,
    dismissToast: () => setToastQueue((q) => q.slice(1)),
  }
}
