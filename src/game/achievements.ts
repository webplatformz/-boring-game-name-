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

/** The info pages tracked for the "Law Student" hidden achievement. */
export const LEGAL_PAGES = ['methodology', 'data-methodology', 'privacy', 'photo-credits', 'disclaimer'] as const

export interface AchievementContext {
  owned: Record<number, number>
  ownedList: Member[]
  totalOwnedCopies: number
  cardsRevealed: number
  packsOpened: number
  tradesCompleted: number
  streakBest: number
  languagesUsed: string[]
  legalPagesOpened: string[]
  contactEmailClicked: boolean
  sleeplessTriggered: boolean
  mythicDirectPull: boolean
}

export interface AchievementDef {
  id: string
  category: AchievementCategory
  /** Hidden achievements are omitted from the UI until unlocked. */
  hidden?: boolean
  titleKey: TranslationKey
  descKey: TranslationKey
  /** Current progress value and the goal it needs to reach; used for a progress bar. Omitted for boolean/one-shot achievements. */
  progress?: (ctx: AchievementContext) => { current: number; goal: number }
  check: (ctx: AchievementContext) => boolean
}

const CANTONS = Array.from(new Set(MEMBERS.map((m) => m.canton)))
const PARTIES = Array.from(new Set(MEMBERS.map((m) => m.partyCode)))
const SR_IDS = MEMBERS.filter((m) => m.chamber === 'SR').map((m) => m.id)
const NR_IDS = MEMBERS.filter((m) => m.chamber === 'NR').map((m) => m.id)
const BR_IDS = MEMBERS.filter((m) => m.chamber === 'BR').map((m) => m.id)

function ownsAll(owned: Record<number, number>, ids: number[]): boolean {
  return ids.length > 0 && ids.every((id) => (owned[id] ?? 0) > 0)
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── collection ──
  {
    id: 'first-pull',
    category: 'collection',
    titleKey: 'achFirstPullTitle',
    descKey: 'achFirstPullDesc',
    check: (ctx) => ctx.packsOpened >= 1,
  },
  {
    id: 'collector-50',
    category: 'collection',
    titleKey: 'achCollector50Title',
    descKey: 'achCollector50Desc',
    progress: (ctx) => ({ current: ctx.ownedList.length, goal: 50 }),
    check: (ctx) => ctx.ownedList.length >= 50,
  },
  {
    id: 'collector-100',
    category: 'collection',
    titleKey: 'achCollector100Title',
    descKey: 'achCollector100Desc',
    progress: (ctx) => ({ current: ctx.ownedList.length, goal: 100 }),
    check: (ctx) => ctx.ownedList.length >= 100,
  },
  {
    id: 'collector-all',
    category: 'collection',
    titleKey: 'achCollectorAllTitle',
    descKey: 'achCollectorAllDesc',
    progress: (ctx) => ({ current: ctx.ownedList.length, goal: MEMBERS.length }),
    check: (ctx) => ctx.ownedList.length >= MEMBERS.length,
  },
  {
    id: 'state-council-complete',
    category: 'collection',
    titleKey: 'achStateCouncilTitle',
    descKey: 'achStateCouncilDesc',
    progress: (ctx) => ({ current: SR_IDS.filter((id) => (ctx.owned[id] ?? 0) > 0).length, goal: SR_IDS.length }),
    check: (ctx) => ownsAll(ctx.owned, SR_IDS),
  },
  {
    id: 'national-council-complete',
    category: 'collection',
    titleKey: 'achNationalCouncilTitle',
    descKey: 'achNationalCouncilDesc',
    progress: (ctx) => ({ current: NR_IDS.filter((id) => (ctx.owned[id] ?? 0) > 0).length, goal: NR_IDS.length }),
    check: (ctx) => ownsAll(ctx.owned, NR_IDS),
  },
  {
    id: 'federal-council-complete',
    category: 'collection',
    titleKey: 'achFederalCouncilTitle',
    descKey: 'achFederalCouncilDesc',
    progress: (ctx) => ({ current: BR_IDS.filter((id) => (ctx.owned[id] ?? 0) > 0).length, goal: BR_IDS.length }),
    check: (ctx) => ownsAll(ctx.owned, BR_IDS),
  },
  {
    id: 'rainbow',
    category: 'collection',
    titleKey: 'achRainbowTitle',
    descKey: 'achRainbowDesc',
    progress: (ctx) => ({ current: new Set(ctx.ownedList.map((m) => m.ratings.rarity)).size, goal: RARITY_ORDER.length }),
    check: (ctx) => RARITY_ORDER.every((r) => ctx.ownedList.some((m) => m.ratings.rarity === r)),
  },
  {
    id: 'cantonal-coverage',
    category: 'collection',
    titleKey: 'achCantonalCoverageTitle',
    descKey: 'achCantonalCoverageDesc',
    progress: (ctx) => ({ current: new Set(ctx.ownedList.map((m) => m.canton)).size, goal: CANTONS.length }),
    check: (ctx) => CANTONS.every((c) => ctx.ownedList.some((m) => m.canton === c)),
  },
  {
    id: 'party-party',
    category: 'collection',
    titleKey: 'achPartyPartyTitle',
    descKey: 'achPartyPartyDesc',
    progress: (ctx) => ({ current: new Set(ctx.ownedList.map((m) => m.partyCode)).size, goal: PARTIES.length }),
    check: (ctx) => PARTIES.every((p) => ctx.ownedList.some((m) => m.partyCode === p)),
  },
  {
    id: 'bottomless',
    category: 'collection',
    titleKey: 'achBottomlessTitle',
    descKey: 'achBottomlessDesc',
    progress: (ctx) => ({ current: ctx.totalOwnedCopies, goal: 1000 }),
    check: (ctx) => ctx.totalOwnedCopies >= 1000,
  },

  // ── pack opening ──
  {
    id: 'pack-opener-10',
    category: 'packOpening',
    titleKey: 'achPackOpener10Title',
    descKey: 'achPackOpener10Desc',
    progress: (ctx) => ({ current: ctx.packsOpened, goal: 10 }),
    check: (ctx) => ctx.packsOpened >= 10,
  },
  {
    id: 'pack-opener-100',
    category: 'packOpening',
    titleKey: 'achPackOpener100Title',
    descKey: 'achPackOpener100Desc',
    progress: (ctx) => ({ current: ctx.packsOpened, goal: 100 }),
    check: (ctx) => ctx.packsOpened >= 100,
  },
  {
    id: 'pack-opener-1000',
    category: 'packOpening',
    titleKey: 'achPackOpener1000Title',
    descKey: 'achPackOpener1000Desc',
    progress: (ctx) => ({ current: ctx.packsOpened, goal: 1000 }),
    check: (ctx) => ctx.packsOpened >= 1000,
  },
  {
    id: 'card-collector-500',
    category: 'packOpening',
    titleKey: 'achCardCollector500Title',
    descKey: 'achCardCollector500Desc',
    progress: (ctx) => ({ current: ctx.cardsRevealed, goal: 500 }),
    check: (ctx) => ctx.cardsRevealed >= 500,
  },
  {
    id: 'card-collector-1000',
    category: 'packOpening',
    titleKey: 'achCardCollector1000Title',
    descKey: 'achCardCollector1000Desc',
    progress: (ctx) => ({ current: ctx.cardsRevealed, goal: 1000 }),
    check: (ctx) => ctx.cardsRevealed >= 1000,
  },
  {
    id: 'card-collector-5000',
    category: 'packOpening',
    titleKey: 'achCardCollector5000Title',
    descKey: 'achCardCollector5000Desc',
    progress: (ctx) => ({ current: ctx.cardsRevealed, goal: 5000 }),
    check: (ctx) => ctx.cardsRevealed >= 5000,
  },
  {
    id: 'card-collector-10000',
    category: 'packOpening',
    titleKey: 'achCardCollector10000Title',
    descKey: 'achCardCollector10000Desc',
    progress: (ctx) => ({ current: ctx.cardsRevealed, goal: 10000 }),
    check: (ctx) => ctx.cardsRevealed >= 10000,
  },

  // ── trading ──
  {
    id: 'first-trade',
    category: 'trading',
    titleKey: 'achFirstTradeTitle',
    descKey: 'achFirstTradeDesc',
    check: (ctx) => ctx.tradesCompleted >= 1,
  },
  {
    id: 'trade-expert',
    category: 'trading',
    titleKey: 'achTradeExpertTitle',
    descKey: 'achTradeExpertDesc',
    progress: (ctx) => ({ current: ctx.tradesCompleted, goal: 10 }),
    check: (ctx) => ctx.tradesCompleted >= 10,
  },
  {
    id: 'trade-veteran',
    category: 'trading',
    titleKey: 'achTradeVeteranTitle',
    descKey: 'achTradeVeteranDesc',
    progress: (ctx) => ({ current: ctx.tradesCompleted, goal: 100 }),
    check: (ctx) => ctx.tradesCompleted >= 100,
  },
  {
    id: 'trade-master',
    category: 'trading',
    titleKey: 'achTradeMasterTitle',
    descKey: 'achTradeMasterDesc',
    progress: (ctx) => ({ current: ctx.tradesCompleted, goal: 1000 }),
    check: (ctx) => ctx.tradesCompleted >= 1000,
  },

  // ── streaks ──
  {
    id: 'daily-login-7',
    category: 'streaks',
    titleKey: 'achDailyLogin7Title',
    descKey: 'achDailyLogin7Desc',
    progress: (ctx) => ({ current: ctx.streakBest, goal: 7 }),
    check: (ctx) => ctx.streakBest >= 7,
  },
  {
    id: 'daily-login-30',
    category: 'streaks',
    titleKey: 'achDailyLogin30Title',
    descKey: 'achDailyLogin30Desc',
    progress: (ctx) => ({ current: ctx.streakBest, goal: 30 }),
    check: (ctx) => ctx.streakBest >= 30,
  },
  {
    id: 'daily-login-100',
    category: 'streaks',
    titleKey: 'achDailyLogin100Title',
    descKey: 'achDailyLogin100Desc',
    progress: (ctx) => ({ current: ctx.streakBest, goal: 100 }),
    check: (ctx) => ctx.streakBest >= 100,
  },

  // ── hidden ──
  {
    id: 'law-student',
    category: 'hidden',
    hidden: true,
    titleKey: 'achLawStudentTitle',
    descKey: 'achLawStudentDesc',
    check: (ctx) => LEGAL_PAGES.every((p) => ctx.legalPagesOpened.includes(p)),
  },
  {
    id: 'killjoy',
    category: 'hidden',
    hidden: true,
    titleKey: 'achKilljoyTitle',
    descKey: 'achKilljoyDesc',
    check: (ctx) => ctx.contactEmailClicked,
  },
  {
    id: 'multilingual',
    category: 'hidden',
    hidden: true,
    titleKey: 'achMultilingualTitle',
    descKey: 'achMultilingualDesc',
    check: (ctx) => LANGUAGES.every((l) => ctx.languagesUsed.includes(l)),
  },
  {
    id: 'sleepless',
    category: 'hidden',
    hidden: true,
    titleKey: 'achSleeplessTitle',
    descKey: 'achSleeplessDesc',
    check: (ctx) => ctx.sleeplessTriggered,
  },
  {
    id: 'copy-room-accident',
    category: 'hidden',
    hidden: true,
    titleKey: 'achCopyRoomAccidentTitle',
    descKey: 'achCopyRoomAccidentDesc',
    check: (ctx) => Object.values(ctx.owned).some((n) => n >= 26),
  },
  {
    id: 'mythic-hunter',
    category: 'hidden',
    hidden: true,
    titleKey: 'achMythicHunterTitle',
    descKey: 'achMythicHunterDesc',
    check: (ctx) => ctx.mythicDirectPull,
  },
]

/** Bonus packs granted for each newly unlocked achievement. */
export const ACHIEVEMENT_REWARD_PACKS = 1

// ── persisted progress store ────────────────────────────────────────────────
// A minimal pub-sub so events reported from anywhere in the tree (language
// switch, legal-page navigation, the privacy contact link) reach the
// achievements hook without prop-drilling. Every mutation re-persists the
// full snapshot immediately, same as the rest of this module's storage.

type Listener = () => void

let progress: AchievementProgress = loadAchievementProgress()
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

export function recordTrade(): void {
  setProgress({ ...progress, tradesCompleted: progress.tradesCompleted + 1 })
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
  if (progress.streakLastDate === today) {
    // Already counted today.
  } else if (progress.streakLastDate && isYesterday(progress.streakLastDate, today)) {
    streakCurrent += 1
  } else {
    streakCurrent = 1
  }
  const streakBest = Math.max(progress.streakBest, streakCurrent)

  const hour = new Date().getHours()
  const sleeplessTriggered = progress.sleeplessTriggered || hour === 3

  const mythicDirectPull = progress.mythicDirectPull || (!isTradePack && members.some((m) => m.ratings.rarity === 'mythic'))

  setProgress({
    ...progress,
    streakCurrent,
    streakBest,
    streakLastDate: today,
    sleeplessTriggered,
    mythicDirectPull,
  })
}

/** Resets everything back to defaults — exposed for tests/dev tooling only. */
export function resetAchievementProgress(): void {
  setProgress(DEFAULT_ACHIEVEMENT_PROGRESS)
}
