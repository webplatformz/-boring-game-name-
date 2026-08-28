// Wires live game state into the achievement definitions: evaluates unlocks,
// grants bonus packs, and queues toast notifications. Mounted once in App so
// achievements keep unlocking regardless of which screen is active.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { MEMBERS_BY_ID } from '../data/members'
import type { Member } from '../data/members'
import type { Game } from './useGame'
import {
  ACHIEVEMENTS,
  claimRepeatAchievements,
  getAchievementProgress,
  getAchievementRewardPacks,
  markAchievementsUnlocked,
  recordPackCompletion,
  recordTrade,
  subscribeAchievementProgress,
} from './achievements'
import type { AchievementContext, AchievementDef } from './achievements'

export type AchievementView = AchievementDef & {
  unlocked: boolean
  unlockedAt: number | null
  completions: number
  current: number
  goal: number
}

export interface AchievementToastItem {
  achievement: AchievementDef
  completions: number
  rewardPacks: number
}

export interface AchievementsApi {
  achievements: AchievementView[]
  /** Visible (non-hidden) achievements unlocked so far. */
  unlockedCount: number
  /** Total visible (non-hidden) achievements. */
  totalCount: number
  toast: AchievementToastItem | null
  dismissToast: () => void
}

function resolveOwnedList(owned: Record<number, number>): Member[] {
  return Object.keys(owned)
    .map((id) => MEMBERS_BY_ID.get(Number(id)))
    .filter((m): m is Member => Boolean(m))
}

export function useAchievements(game: Game): AchievementsApi {
  const progress = useSyncExternalStore(subscribeAchievementProgress, getAchievementProgress)
  const [toastQueue, setToastQueue] = useState<AchievementToastItem[]>([])

  const lastPackSeq = useRef(game.state.packCompletionSeq)
  const lastEvaluatedPackSeq = useRef(game.state.packCompletionSeq)
  useEffect(() => {
    if (game.state.packCompletionSeq === lastPackSeq.current) return
    lastPackSeq.current = game.state.packCompletionSeq
    recordPackCompletion(game.state.lastPackMembers, game.state.lastPackWasTrade)
  }, [game.state.packCompletionSeq, game.state.lastPackMembers, game.state.lastPackWasTrade])

  const lastTradeCount = useRef(game.state.tradesExecuted)
  useEffect(() => {
    if (game.state.tradesExecuted === lastTradeCount.current) return
    lastTradeCount.current = game.state.tradesExecuted
    if (game.state.tradeRarity) recordTrade(game.state.tradeRarity)
  }, [game.state.tradesExecuted, game.state.tradeRarity])

  const context = useMemo<AchievementContext>(() => {
    const ownedList = resolveOwnedList(game.state.owned)
    return {
      owned: game.state.owned,
      ownedList,
      totalOwnedCopies: Object.values(game.state.owned).reduce((sum, n) => sum + n, 0),
      packsOpened: game.state.packsOpened,
      regularPacksOpened: game.state.regularPacksOpened,
      tradesCompleted: progress.tradesCompleted,
      tradeSourceRarities: progress.tradeSourceRarities,
      streakCurrent: progress.streakCurrent,
      streakBest: progress.streakBest,
      languagesUsed: progress.languagesUsed,
      legalPagesOpened: progress.legalPagesOpened,
      contactEmailClicked: progress.contactEmailClicked,
      sleeplessTriggered: progress.sleeplessTriggered,
      mythicDirectPull: progress.mythicDirectPull,
      perfectlyMixedTriggered: progress.perfectlyMixedTriggered,
    }
  }, [game.state.owned, game.state.packsOpened, game.state.regularPacksOpened, progress])

  useEffect(() => {
    // Pack completion updates game state and achievement progress in separate
    // stores. Wait for the progress-store render before evaluating the event.
    if (game.state.packCompletionSeq !== lastEvaluatedPackSeq.current) {
      lastEvaluatedPackSeq.current = game.state.packCompletionSeq
      return
    }
    const newly = ACHIEVEMENTS.filter(
      (achievement) =>
        achievement.repeatEvery === undefined &&
        !(achievement.id in progress.unlocked) &&
        achievement.check(context),
    )
    // markAchievementsUnlocked re-checks against the live store and only
    // returns ids it actually applied, so a duplicate effect invocation with
    // the same stale `newly` (e.g. React StrictMode's double-invoke of mount
    // effects) can't grant rewards or queue toasts twice for the same unlock.
    const applied = markAchievementsUnlocked(newly.map((a) => a.id))
    const appliedDefs = newly.filter((a) => applied.includes(a.id))
    const repeatClaims = claimRepeatAchievements(
      ACHIEVEMENTS.flatMap((achievement) =>
        achievement.repeatEvery !== undefined
          ? [{
              id: achievement.id,
              cycleCompletions: Math.floor(achievement.repeatValue(context) / achievement.repeatEvery),
            }]
          : [],
      ),
    )
    const repeatedRewards = repeatClaims.flatMap((claim) => {
      const achievement = ACHIEVEMENTS.find((candidate) => candidate.id === claim.id)
      return achievement
        ? [{
            achievement,
            completions: claim.completions,
            rewardPacks: claim.completions * getAchievementRewardPacks(achievement),
          }]
        : []
    })
    const rewarded: AchievementToastItem[] = [
      ...appliedDefs.map((achievement) => ({
        achievement,
        completions: 1,
        rewardPacks: getAchievementRewardPacks(achievement),
      })),
      ...repeatedRewards,
    ]
    if (rewarded.length === 0) return
    game.grantBonusPacks(rewarded.reduce((total, reward) => total + reward.rewardPacks, 0))
    setToastQueue((q) => [...q, ...rewarded])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context])

  const achievements = useMemo<AchievementView[]>(
    () =>
      ACHIEVEMENTS.map((def) => {
        const unlockedAt = progress.unlocked[def.id] ?? null
        const p = def.progress?.(context)
        const repeatValue = def.repeatEvery === undefined ? null : def.repeatValue(context)
        return {
          ...def,
          unlocked: unlockedAt !== null,
          unlockedAt,
          completions: progress.repeatCompletions[def.id] ?? (unlockedAt !== null ? 1 : 0),
          current: repeatValue === null
            ? (unlockedAt !== null ? (p?.goal ?? 1) : (p?.current ?? 0))
            : repeatValue % def.repeatEvery!,
          goal: def.repeatEvery ?? p?.goal ?? 1,
        }
      }),
    [context, progress.repeatCompletions, progress.unlocked],
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
