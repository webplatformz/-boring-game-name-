// Achievement definitions, persisted progress tracking and a tiny pub-sub
// store so components outside the game/screen tree (language switcher, legal
// pages, the privacy contact link) can report events without prop-drilling.
// See docs/achievements.md for the source list this file implements.

import type { Member } from '../data/members'
import { MEMBERS } from '../data/members'
import { RARITY_ORDER } from '../theme'
import type { Language } from '../i18n'
import { LANGUAGES } from '../i18n'
import type { TranslationKey } from '../i18n'
import {
  DEFAULT_ACHIEVEMENT_PROGRESS,
  loadAchievementProgress,
  persistAchievementProgress,
} from './storage'
import type { AchievementProgress } from './storage'

export type AchievementCategory = 'collection' | 'packOpening' | 'trading' | 'streaks' | 'hidden'
export type AchievementTier = 'bronze' | 'silver' | 'gold'

export const ACHIEVEMENT_TIER_REWARDS: Record<AchievementTier, number> = {
  bronze: 1,
  silver: 3,
  gold: 5,
}

/** The info pages tracked for the "Law Student" hidden achievement. */
export const LEGAL_PAGES = ['methodology', 'data-methodology', 'privacy', 'photo-credits', 'disclaimer'] as const

export interface AchievementContext {
  owned: Record<number, number>
  ownedList: Member[]
  totalOwnedCopies: number
  packsOpened: number
  regularPacksOpened: number
  tradesCompleted: number
  tradeSourceRarities: string[]
  streakCurrent: number
  streakBest: number
  languagesUsed: string[]
  legalPagesOpened: string[]
  contactEmailClicked: boolean
  sleeplessTriggered: boolean
  mythicDirectPull: boolean
  perfectlyMixedTriggered: boolean
}

interface AchievementBase {
  id: string
  category: AchievementCategory
  tier: AchievementTier
  /** Hidden achievements are omitted from the UI until unlocked. */
  hidden?: boolean
  titleKey: TranslationKey
  descKey: TranslationKey
  /** Current progress value and the goal it needs to reach; used for a progress bar. Omitted for boolean/one-shot achievements. */
  progress?: (ctx: AchievementContext) => { current: number; goal: number }
}

interface OneTimeAchievementDef extends AchievementBase {
  repeatEvery?: undefined
  repeatValue?: undefined
  check: (ctx: AchievementContext) => boolean
}

interface RepeatableAchievementDef extends AchievementBase {
  /** Lifetime interval between rewards. Streak intervals apply within the current uninterrupted streak. */
  repeatEvery: number
  /** Value divided by repeatEvery to determine how many reward cycles have been earned. */
  repeatValue: (ctx: AchievementContext) => number
  check?: never
}

export type AchievementDef = OneTimeAchievementDef | RepeatableAchievementDef

const CANTONS = Array.from(new Set(MEMBERS.map((m) => m.canton)))
const PARTIES = Array.from(new Set(MEMBERS.map((m) => m.partyCode)))
const SR_IDS = MEMBERS.filter((m) => m.chamber === 'SR').map((m) => m.id)
const NR_IDS = MEMBERS.filter((m) => m.chamber === 'NR').map((m) => m.id)
const BR_IDS = MEMBERS.filter((m) => m.chamber === 'BR').map((m) => m.id)
const TRADE_SOURCE_RARITIES = RARITY_ORDER.slice(0, -1)

function ownsAll(owned: Record<number, number>, ids: number[]): boolean {
  return ids.length > 0 && ids.every((id) => (owned[id] ?? 0) > 0)
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── collection ──
  {
    id: 'first-pull',
    category: 'collection',
    tier: 'bronze',
    titleKey: 'achFirstPullTitle',
    descKey: 'achFirstPullDesc',
    check: (ctx) => ctx.packsOpened >= 1,
  },
  {
    id: 'collector-50',
    category: 'collection',
    tier: 'bronze',
    titleKey: 'achCollector50Title',
    descKey: 'achCollector50Desc',
    progress: (ctx) => ({ current: ctx.ownedList.length, goal: 50 }),
    check: (ctx) => ctx.ownedList.length >= 50,
  },
  {
    id: 'collector-100',
    category: 'collection',
    tier: 'silver',
    titleKey: 'achCollector100Title',
    descKey: 'achCollector100Desc',
    progress: (ctx) => ({ current: ctx.ownedList.length, goal: 100 }),
    check: (ctx) => ctx.ownedList.length >= 100,
  },
  {
    id: 'collector-all',
    category: 'collection',
    tier: 'gold',
    titleKey: 'achCollectorAllTitle',
    descKey: 'achCollectorAllDesc',
    progress: (ctx) => ({ current: ctx.ownedList.length, goal: MEMBERS.length }),
    check: (ctx) => ctx.ownedList.length >= MEMBERS.length,
  },
  {
    id: 'state-council-complete',
    category: 'collection',
    tier: 'silver',
    titleKey: 'achStateCouncilTitle',
    descKey: 'achStateCouncilDesc',
    progress: (ctx) => ({ current: SR_IDS.filter((id) => (ctx.owned[id] ?? 0) > 0).length, goal: SR_IDS.length }),
    check: (ctx) => ownsAll(ctx.owned, SR_IDS),
  },
  {
    id: 'national-council-complete',
    category: 'collection',
    tier: 'gold',
    titleKey: 'achNationalCouncilTitle',
    descKey: 'achNationalCouncilDesc',
    progress: (ctx) => ({ current: NR_IDS.filter((id) => (ctx.owned[id] ?? 0) > 0).length, goal: NR_IDS.length }),
    check: (ctx) => ownsAll(ctx.owned, NR_IDS),
  },
  {
    id: 'federal-council-complete',
    category: 'collection',
    tier: 'gold',
    titleKey: 'achFederalCouncilTitle',
    descKey: 'achFederalCouncilDesc',
    progress: (ctx) => ({ current: BR_IDS.filter((id) => (ctx.owned[id] ?? 0) > 0).length, goal: BR_IDS.length }),
    check: (ctx) => ownsAll(ctx.owned, BR_IDS),
  },
  {
    id: 'rainbow',
    category: 'collection',
    tier: 'gold',
    titleKey: 'achRainbowTitle',
    descKey: 'achRainbowDesc',
    progress: (ctx) => ({ current: new Set(ctx.ownedList.map((m) => m.ratings.rarity)).size, goal: RARITY_ORDER.length }),
    check: (ctx) => RARITY_ORDER.every((r) => ctx.ownedList.some((m) => m.ratings.rarity === r)),
  },
  {
    id: 'cantonal-coverage',
    category: 'collection',
    tier: 'silver',
    titleKey: 'achCantonalCoverageTitle',
    descKey: 'achCantonalCoverageDesc',
    progress: (ctx) => ({ current: new Set(ctx.ownedList.map((m) => m.canton)).size, goal: CANTONS.length }),
    check: (ctx) => CANTONS.every((c) => ctx.ownedList.some((m) => m.canton === c)),
  },
  {
    id: 'party-party',
    category: 'collection',
    tier: 'silver',
    titleKey: 'achPartyPartyTitle',
    descKey: 'achPartyPartyDesc',
    progress: (ctx) => ({ current: new Set(ctx.ownedList.map((m) => m.partyCode)).size, goal: PARTIES.length }),
    check: (ctx) => PARTIES.every((p) => ctx.ownedList.some((m) => m.partyCode === p)),
  },
  {
    id: 'bottomless',
    category: 'collection',
    tier: 'silver',
    titleKey: 'achBottomlessTitle',
    descKey: 'achBottomlessDesc',
    progress: (ctx) => ({ current: ctx.totalOwnedCopies, goal: 1000 }),
    check: (ctx) => ctx.totalOwnedCopies >= 1000,
  },

  // ── pack opening ──
  {
    id: 'pack-opener-10',
    category: 'packOpening',
    tier: 'bronze',
    titleKey: 'achPackOpener10Title',
    descKey: 'achPackOpener10Desc',
    progress: (ctx) => ({ current: ctx.regularPacksOpened, goal: 10 }),
    check: (ctx) => ctx.regularPacksOpened >= 10,
  },
  {
    id: 'pack-opener-100',
    category: 'packOpening',
    tier: 'silver',
    repeatEvery: 100,
    repeatValue: (ctx) => ctx.regularPacksOpened,
    titleKey: 'achPackOpener100Title',
    descKey: 'achPackOpener100Desc',
    progress: (ctx) => ({ current: ctx.regularPacksOpened, goal: 100 }),
  },
  {
    id: 'pack-opener-1000',
    category: 'packOpening',
    tier: 'gold',
    titleKey: 'achPackOpener1000Title',
    descKey: 'achPackOpener1000Desc',
    progress: (ctx) => ({ current: ctx.regularPacksOpened, goal: 1000 }),
    check: (ctx) => ctx.regularPacksOpened >= 1000,
  },
  // ── trading ──
  {
    id: 'first-trade',
    category: 'trading',
    tier: 'bronze',
    titleKey: 'achFirstTradeTitle',
    descKey: 'achFirstTradeDesc',
    check: (ctx) => ctx.tradesCompleted >= 1,
  },
  {
    id: 'trade-expert',
    category: 'trading',
    tier: 'bronze',
    titleKey: 'achTradeExpertTitle',
    descKey: 'achTradeExpertDesc',
    progress: (ctx) => ({ current: ctx.tradesCompleted, goal: 10 }),
    check: (ctx) => ctx.tradesCompleted >= 10,
  },
  {
    id: 'trade-veteran',
    category: 'trading',
    tier: 'silver',
    repeatEvery: 100,
    repeatValue: (ctx) => ctx.tradesCompleted,
    titleKey: 'achTradeVeteranTitle',
    descKey: 'achTradeVeteranDesc',
    progress: (ctx) => ({ current: ctx.tradesCompleted, goal: 100 }),
  },
  {
    id: 'across-the-aisle',
    category: 'trading',
    tier: 'gold',
    titleKey: 'achAcrossTheAisleTitle',
    descKey: 'achAcrossTheAisleDesc',
    progress: (ctx) => ({
      current: TRADE_SOURCE_RARITIES.filter((rarity) => ctx.tradeSourceRarities.includes(rarity)).length,
      goal: TRADE_SOURCE_RARITIES.length,
    }),
    check: (ctx) => TRADE_SOURCE_RARITIES.every((rarity) => ctx.tradeSourceRarities.includes(rarity)),
  },
  {
    id: 'trade-master',
    category: 'trading',
    tier: 'gold',
    titleKey: 'achTradeMasterTitle',
    descKey: 'achTradeMasterDesc',
    progress: (ctx) => ({ current: ctx.tradesCompleted, goal: 1000 }),
    check: (ctx) => ctx.tradesCompleted >= 1000,
  },

  // ── streaks ──
  {
    id: 'daily-login-7',
    category: 'streaks',
    tier: 'bronze',
    repeatEvery: 7,
    repeatValue: (ctx) => ctx.streakCurrent,
    titleKey: 'achDailyLogin7Title',
    descKey: 'achDailyLogin7Desc',
    progress: (ctx) => ({ current: ctx.streakCurrent, goal: 7 }),
  },
  {
    id: 'daily-login-30',
    category: 'streaks',
    tier: 'silver',
    titleKey: 'achDailyLogin30Title',
    descKey: 'achDailyLogin30Desc',
    progress: (ctx) => ({ current: ctx.streakBest, goal: 30 }),
    check: (ctx) => ctx.streakBest >= 30,
  },
  {
    id: 'daily-login-100',
    category: 'streaks',
    tier: 'gold',
    titleKey: 'achDailyLogin100Title',
    descKey: 'achDailyLogin100Desc',
    progress: (ctx) => ({ current: ctx.streakBest, goal: 100 }),
    check: (ctx) => ctx.streakBest >= 100,
  },

  // ── hidden ──
  {
    id: 'law-student',
    category: 'hidden',
    tier: 'bronze',
    hidden: true,
    titleKey: 'achLawStudentTitle',
    descKey: 'achLawStudentDesc',
    check: (ctx) => LEGAL_PAGES.every((p) => ctx.legalPagesOpened.includes(p)),
  },
  {
    id: 'killjoy',
    category: 'hidden',
    tier: 'bronze',
    hidden: true,
    titleKey: 'achKilljoyTitle',
    descKey: 'achKilljoyDesc',
    check: (ctx) => ctx.contactEmailClicked,
  },
  {
    id: 'multilingual',
    category: 'hidden',
    tier: 'bronze',
    hidden: true,
    titleKey: 'achMultilingualTitle',
    descKey: 'achMultilingualDesc',
    check: (ctx) => LANGUAGES.every((l) => ctx.languagesUsed.includes(l)),
  },
  {
    id: 'sleepless',
    category: 'hidden',
    tier: 'silver',
    hidden: true,
    titleKey: 'achSleeplessTitle',
    descKey: 'achSleeplessDesc',
    check: (ctx) => ctx.sleeplessTriggered,
  },
  {
    id: 'copy-room-accident',
    category: 'hidden',
    tier: 'gold',
    hidden: true,
    titleKey: 'achCopyRoomAccidentTitle',
    descKey: 'achCopyRoomAccidentDesc',
    check: (ctx) => Object.values(ctx.owned).some((n) => n >= 26),
  },
  {
    id: 'perfectly-mixed',
    category: 'hidden',
    tier: 'gold',
    hidden: true,
    titleKey: 'achPerfectlyMixedTitle',
    descKey: 'achPerfectlyMixedDesc',
    check: (ctx) => ctx.perfectlyMixedTriggered,
  },
  {
    id: 'mythic-hunter',
    category: 'hidden',
    tier: 'gold',
    hidden: true,
    titleKey: 'achMythicHunterTitle',
    descKey: 'achMythicHunterDesc',
    check: (ctx) => ctx.mythicDirectPull,
  },
]

export function getAchievementRewardPacks(achievement: AchievementDef): number {
  return ACHIEVEMENT_TIER_REWARDS[achievement.tier]
}

// ── persisted progress store ────────────────────────────────────────────────
// A minimal pub-sub so events reported from anywhere in the tree (language
// switch, legal-page navigation, the privacy contact link) reach the
// achievements hook without prop-drilling. Every mutation re-persists the
// full snapshot immediately, same as the rest of this module's storage.

type Listener = () => void

function loadCurrentAchievementProgress(): AchievementProgress {
  const loaded = loadAchievementProgress()
  const today = todayLocalDate()
  const streakStillActive =
    loaded.streakLastDate === today ||
    (loaded.streakLastDate !== null && isYesterday(loaded.streakLastDate, today))
  if (streakStillActive || (loaded.streakCurrent === 0 && (loaded.repeatCycleCompletions['daily-login-7'] ?? 0) === 0)) {
    return loaded
  }
  const normalized = {
    ...loaded,
    streakCurrent: 0,
    repeatCycleCompletions: { ...loaded.repeatCycleCompletions, 'daily-login-7': 0 },
  }
  persistAchievementProgress(normalized)
  return normalized
}

let progress: AchievementProgress = loadCurrentAchievementProgress()
let listeners: Listener[] = []

function setProgress(next: AchievementProgress): void {
  progress = next
  persistAchievementProgress(next)
  for (const listener of listeners) listener()
}

export function getAchievementProgress(): AchievementProgress {
  return progress
}

export function subscribeAchievementProgress(listener: Listener): () => void {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

/**
 * Marks the given ids as unlocked (skipping any already unlocked) and returns
 * the subset that was actually newly applied. Callers should only grant
 * rewards/toasts for the returned ids — this keeps the operation idempotent
 * when called twice with the same list (e.g. React StrictMode's double-invoke
 * of mount effects), rather than trusting the caller's own "is this new"
 * check against a closure snapshot that can go stale between calls.
 */
export function markAchievementsUnlocked(ids: string[]): string[] {
  const fresh = ids.filter((id) => !(id in progress.unlocked))
  if (fresh.length === 0) return []
  const now = Date.now()
  const unlocked = { ...progress.unlocked }
  for (const id of fresh) unlocked[id] = now
  setProgress({ ...progress, unlocked })
  return fresh
}

export interface RepeatAchievementTarget {
  id: string
  cycleCompletions: number
}

export interface RepeatAchievementClaim {
  id: string
  completions: number
}

export function claimRepeatAchievements(targets: RepeatAchievementTarget[]): RepeatAchievementClaim[] {
  const claims = targets.flatMap(({ id, cycleCompletions }) => {
    const alreadyClaimed = progress.repeatCycleCompletions[id] ?? 0
    return cycleCompletions > alreadyClaimed
      ? [{ id, completions: cycleCompletions - alreadyClaimed }]
      : []
  })
  if (claims.length === 0) return []

  const now = Date.now()
  const unlocked = { ...progress.unlocked }
  const repeatCompletions = { ...progress.repeatCompletions }
  const repeatCycleCompletions = { ...progress.repeatCycleCompletions }
  for (const claim of claims) {
    const target = targets.find(({ id }) => id === claim.id)
    if (!target) continue
    unlocked[claim.id] ??= now
    repeatCompletions[claim.id] = (repeatCompletions[claim.id] ?? 0) + claim.completions
    repeatCycleCompletions[claim.id] = target.cycleCompletions
  }
  setProgress({ ...progress, unlocked, repeatCompletions, repeatCycleCompletions })
  return claims
}

export function recordTrade(sourceRarity: string): void {
  const tradeSourceRarities = progress.tradeSourceRarities.includes(sourceRarity)
    ? progress.tradeSourceRarities
    : [...progress.tradeSourceRarities, sourceRarity]
  setProgress({ ...progress, tradesCompleted: progress.tradesCompleted + 1, tradeSourceRarities })
}

export function recordLanguageUsed(language: Language): void {
  if (progress.languagesUsed.includes(language)) return
  setProgress({ ...progress, languagesUsed: [...progress.languagesUsed, language] })
}

export function recordLegalPageOpened(page: string): void {
  if (progress.legalPagesOpened.includes(page)) return
  setProgress({ ...progress, legalPagesOpened: [...progress.legalPagesOpened, page] })
}

export function recordContactEmailClicked(): void {
  if (progress.contactEmailClicked) return
  setProgress({ ...progress, contactEmailClicked: true })
}

function todayLocalDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isYesterday(dateStr: string, today: string): boolean {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + 1)
  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return next === today
}

/** Reported once per completed pack (regular or trade-in); updates the daily
 * streak, and the sleepless / mythic-hunter hidden triggers. */
export function recordPackCompletion(members: Member[], isTradePack: boolean): void {
  const today = todayLocalDate()
  let streakCurrent = progress.streakCurrent
  let repeatCycleCompletions = progress.repeatCycleCompletions
  if (progress.streakLastDate === today) {
    // Already counted today.
  } else if (progress.streakLastDate && isYesterday(progress.streakLastDate, today)) {
    streakCurrent += 1
  } else {
    streakCurrent = 1
    repeatCycleCompletions = { ...repeatCycleCompletions, 'daily-login-7': 0 }
  }
  const streakBest = Math.max(progress.streakBest, streakCurrent)

  const hour = new Date().getHours()
  const sleeplessTriggered = progress.sleeplessTriggered || hour === 3

  const mythicDirectPull = progress.mythicDirectPull || (!isTradePack && members.some((m) => m.ratings.rarity === 'mythic'))
  const perfectlyMixedTriggered =
    progress.perfectlyMixedTriggered ||
    (!isTradePack && members.length === 5 && new Set(members.map((m) => m.ratings.rarity)).size === 5)

  setProgress({
    ...progress,
    streakCurrent,
    streakBest,
    streakLastDate: today,
    repeatCycleCompletions,
    sleeplessTriggered,
    mythicDirectPull,
    perfectlyMixedTriggered,
  })
}

/** Resets everything back to defaults — exposed for tests/dev tooling only. */
export function resetAchievementProgress(): void {
  setProgress(DEFAULT_ACHIEVEMENT_PROGRESS)
}
