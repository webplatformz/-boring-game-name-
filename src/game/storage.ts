// localStorage-backed persistence for the player's packs, collection, and stats.

import type { RarityKey } from '../theme'
import { RARITY_ORDER } from '../theme'
import { MEMBERS, MEMBERS_BY_ID, META } from '../data/members'
import {
  CAMPAIGN_RARITIES,
  campaignTotalAfterWin,
  type CampaignPhase,
  type CampaignStageIndex,
} from './debateCampaign'
import {
  restoreDuelSnapshot,
  toDuelSnapshot,
  type DuelSnapshot,
} from './debateSession'

export type BankableRarity = Exclude<RarityKey, 'mythic'>

export interface CampaignSnapshot {
  version: 1
  id: string
  playerId: number
  stageIndex: CampaignStageIndex
  phase: CampaignPhase
  unbankedPacks: number
  duel: DuelSnapshot
}

export interface DebateExhaustion {
  count: number
  resetAt: number
}

export interface CampaignRecord {
  campaignsStarted: number
  campaignsBanked: number
  campaignsLost: number
  campaignsAbandoned: number
  campaignsCompleted: number
  packsAwarded: number
  stageWins: Record<RarityKey, number>
  stageLosses: Record<RarityKey, number>
  bankExits: Record<BankableRarity, number>
}

export interface SaveState {
  /** Unopened packs remaining. */
  packs: number
  /** member id → number of copies owned. */
  owned: Record<number, number>
  /** Total cards received from completed pack-opening flows. */
  cardsRevealed: number
  /** Total regular and trade packs completed. */
  packsOpened: number
  /** Total regular packs completed. Older saves seed this from packsOpened. */
  regularPacksOpened: number
  /** Timestamp (ms) when the next automatic pack unlocks, or null if not waiting. */
  refillAt: number | null
  /** The single resumable Debate campaign, if one is active. */
  campaign: CampaignSnapshot | null
  /** member id → copies already used for campaigns until resetAt. */
  debateExhaustion: Record<number, DebateExhaustion>
  /** Aggregate Campaign-only performance. */
  campaignRecord: CampaignRecord
}

const KEY = 'bundeshaus-pack-v1'
export const STARTING_PACKS = 5
export const MAX_AUTOMATIC_PACKS = 5
export const REFILL_BATCH_SIZE = 5
export const REFILL_INTERVAL_MS = import.meta.env.DEV ? 5_000 : 30 * 60 * 1_000

const ZERO_RARITIES: Record<RarityKey, number> = {
  common: 0,
  uncommon: 0,
  rare: 0,
  ultra: 0,
  legend: 0,
  mythic: 0,
}

const ZERO_BANK_EXITS: Record<BankableRarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 0,
  ultra: 0,
  legend: 0,
}

export const DEFAULT_CAMPAIGN_RECORD: CampaignRecord = {
  campaignsStarted: 0,
  campaignsBanked: 0,
  campaignsLost: 0,
  campaignsAbandoned: 0,
  campaignsCompleted: 0,
  packsAwarded: 0,
  stageWins: ZERO_RARITIES,
  stageLosses: ZERO_RARITIES,
  bankExits: ZERO_BANK_EXITS,
}

// A valid count is a finite, non-negative integer — guards against corrupt
// localStorage values like negatives, fractions, NaN or Infinity.
function isValidCount(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0
}

export function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<SaveState>
      const now = Date.now()
      let packs = isValidCount(s.packs) ? s.packs : STARTING_PACKS
      let refillAt = typeof s.refillAt === 'number' ? s.refillAt : null
      const cardsRevealed = isValidCount(s.cardsRevealed) ? s.cardsRevealed : 0
      const packsOpened = isValidCount(s.packsOpened) ? s.packsOpened : 0
      const regularPacksOpened = isValidCount(s.regularPacksOpened) ? s.regularPacksOpened : packsOpened
      if (refillAt !== null && now >= refillAt && packs < MAX_AUTOMATIC_PACKS) {
        const elapsedIntervals = Math.floor((now - refillAt) / REFILL_INTERVAL_MS) + 1
        const granted = Math.min(MAX_AUTOMATIC_PACKS - packs, elapsedIntervals * REFILL_BATCH_SIZE)
        const intervalsUsed = Math.ceil(granted / REFILL_BATCH_SIZE)
        packs += granted
        refillAt = packs < MAX_AUTOMATIC_PACKS ? refillAt + intervalsUsed * REFILL_INTERVAL_MS : null
      } else if (packs >= MAX_AUTOMATIC_PACKS) {
        refillAt = null
      } else if (refillAt === null) {
        refillAt = now + REFILL_INTERVAL_MS
      }
      const normalized: SaveState = {
        owned: s.owned ?? {},
        packs,
        cardsRevealed,
        packsOpened,
        regularPacksOpened,
        refillAt,
        campaign: normalizeCampaign(s.campaign, s.owned ?? {}),
        debateExhaustion: normalizeDebateExhaustion(
          s.debateExhaustion,
          now,
        ),
        campaignRecord: normalizeCampaignRecord(s.campaignRecord),
      }
      persist(normalized)
      return normalized
    }
  } catch {
    /* ignore corrupt / unavailable storage */
  }
  return {
    packs: STARTING_PACKS,
    owned: {},
    cardsRevealed: 0,
    packsOpened: 0,
    regularPacksOpened: 0,
    refillAt: null,
    campaign: null,
    debateExhaustion: {},
    campaignRecord: cloneCampaignRecord(DEFAULT_CAMPAIGN_RECORD),
  }
}

export function persist(state: SaveState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

function normalizeCampaign(
  value: unknown,
  owned: Record<number, number>,
): CampaignSnapshot | null {
  if (!isObject(value)) return null
  if (
    value.version !== 1 ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    !isMemberId(value.playerId) ||
    !isCampaignStageIndex(value.stageIndex) ||
    (value.phase !== 'in-duel' && value.phase !== 'awaiting-choice') ||
    (value.phase === 'awaiting-choice' &&
      value.stageIndex === CAMPAIGN_RARITIES.length - 1) ||
    !isValidCount(value.unbankedPacks) ||
    !isObject(value.duel) ||
    (owned[value.playerId] ?? 0) < 1
  ) {
    return null
  }

  const playerCard = MEMBERS_BY_ID.get(value.playerId)
  const opponentId = value.duel.opponentId
  if (!isMemberId(opponentId)) return null
  const opponentCard = MEMBERS_BY_ID.get(opponentId)
  if (
    !playerCard ||
    !opponentCard ||
    opponentCard.ratings.rarity !== CAMPAIGN_RARITIES[value.stageIndex]
  ) {
    return null
  }

  const expectedPacks =
    value.phase === 'awaiting-choice'
      ? campaignTotalAfterWin(value.stageIndex)
      : value.stageIndex === 0
        ? 0
        : campaignTotalAfterWin(
            (value.stageIndex - 1) as CampaignStageIndex,
          )
  if (value.unbankedPacks !== expectedPacks) return null

  try {
    const duel = restoreDuelSnapshot(
      value.duel as unknown as DuelSnapshot,
      playerCard,
      opponentCard,
    )
    if (
      value.phase === 'awaiting-choice' &&
      (duel.phase !== 'settled' || duel.winner?.winner !== 'player')
    ) {
      return null
    }
    return {
      version: 1,
      id: value.id,
      playerId: value.playerId,
      stageIndex: value.stageIndex,
      phase: value.phase,
      unbankedPacks: value.unbankedPacks,
      duel: toDuelSnapshot(value.playerId, opponentId, duel),
    }
  } catch {
    return null
  }
}

export function validateCampaignSnapshot(
  value: unknown,
  owned: Record<number, number>,
): CampaignSnapshot | null {
  return normalizeCampaign(value, owned)
}

function normalizeDebateExhaustion(
  value: unknown,
  now: number,
): Record<number, DebateExhaustion> {
  if (!isObject(value)) return {}
  const normalized: Record<number, DebateExhaustion> = {}
  for (const [rawId, rawEntry] of Object.entries(value)) {
    const id = Number(rawId)
    if (
      !isMemberId(id) ||
      !MEMBERS_BY_ID.has(id) ||
      !isObject(rawEntry) ||
      !isValidCount(rawEntry.count) ||
      typeof rawEntry.resetAt !== 'number' ||
      !Number.isFinite(rawEntry.resetAt) ||
      rawEntry.resetAt <= now
    ) {
      continue
    }
    normalized[id] = { count: rawEntry.count, resetAt: rawEntry.resetAt }
  }
  return normalized
}

function normalizeCampaignRecord(value: unknown): CampaignRecord {
  const record = isObject(value) ? value : {}
  return {
    campaignsStarted: validCountOrZero(record.campaignsStarted),
    campaignsBanked: validCountOrZero(record.campaignsBanked),
    campaignsLost: validCountOrZero(record.campaignsLost),
    campaignsAbandoned: validCountOrZero(record.campaignsAbandoned),
    campaignsCompleted: validCountOrZero(record.campaignsCompleted),
    packsAwarded: validCountOrZero(record.packsAwarded),
    stageWins: normalizeRarityCounts(record.stageWins),
    stageLosses: normalizeRarityCounts(record.stageLosses),
    bankExits: normalizeBankExitCounts(record.bankExits),
  }
}

function normalizeRarityCounts(value: unknown): Record<RarityKey, number> {
  const counts = isObject(value) ? value : {}
  return {
    common: validCountOrZero(counts.common),
    uncommon: validCountOrZero(counts.uncommon),
    rare: validCountOrZero(counts.rare),
    ultra: validCountOrZero(counts.ultra),
    legend: validCountOrZero(counts.legend),
    mythic: validCountOrZero(counts.mythic),
  }
}

function normalizeBankExitCounts(
  value: unknown,
): Record<BankableRarity, number> {
  const counts = isObject(value) ? value : {}
  return {
    common: validCountOrZero(counts.common),
    uncommon: validCountOrZero(counts.uncommon),
    rare: validCountOrZero(counts.rare),
    ultra: validCountOrZero(counts.ultra),
    legend: validCountOrZero(counts.legend),
  }
}

function cloneCampaignRecord(record: CampaignRecord): CampaignRecord {
  return {
    ...record,
    stageWins: { ...record.stageWins },
    stageLosses: { ...record.stageLosses },
    bankExits: { ...record.bankExits },
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isMemberId(value: unknown): value is number {
  return Number.isInteger(value)
}

function isCampaignStageIndex(
  value: unknown,
): value is CampaignStageIndex {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) < CAMPAIGN_RARITIES.length
  )
}

function validCountOrZero(value: unknown): number {
  return isValidCount(value) ? value : 0
}

// ── derived member score cache ──────────────────────────────────────────────
// Collections only persist member ids/counts, so they already resolve against
// the latest bundled member data. This separate cache gives other local/offline
// consumers the same guarantee: whenever any ATK/DEF/OVR value changes, the
// signature changes and the full cache is replaced atomically on app startup.

interface CachedMemberScore {
  atk: number
  def: number
  ovr: number
  rarity: RarityKey
}

interface MemberScoreCache {
  format: 3
  algorithmVersion: number
  revision: string
  dataRetrievedAt: string
  updatedAt: string
  scores: Record<number, CachedMemberScore>
}

const SCORE_CACHE_KEY = 'bundeshaus-member-scores-v1'

function currentScoreRevision(): string {
  // Compact deterministic FNV-1a fingerprint of exactly the values consumers
  // cache. It updates even if the data date stays unchanged during development.
  let hash = 0x811c9dc5
  const input = `${META.algorithmVersion}|${MEMBERS.map(
    (m) =>
      `${m.id}:${m.ratings.atk}:${m.ratings.def}:${m.ratings.ovr}:${m.ratings.rarity}`,
  ).join('|')}`
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${META.datasetVersion}-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

/** Refresh the local score cache when the bundled score dataset changes. */
export function syncMemberScoreCache(): void {
  try {
    const revision = currentScoreRevision()
    const raw = localStorage.getItem(SCORE_CACHE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as Partial<MemberScoreCache>
      if (cached.format === 3 && cached.revision === revision) return
    }

    const scores = Object.fromEntries(
      MEMBERS.map((m) => [
        m.id,
        {
          atk: m.ratings.atk,
          def: m.ratings.def,
          ovr: m.ratings.ovr,
          rarity: m.ratings.rarity,
        },
      ]),
    ) as Record<number, CachedMemberScore>
    const next: MemberScoreCache = {
      format: 3,
      algorithmVersion: META.algorithmVersion,
      revision,
      dataRetrievedAt: META.dataRetrievedAt,
      updatedAt: new Date().toISOString(),
      scores,
    }
    localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(next))
  } catch {
    /* ignore corrupt values, quota errors, SSR, and private-mode failures */
  }
}

// ── collection view preferences ─────────────────────────────────────────────
// Kept apart from the save so a corrupt/absent value never costs the player
// their cards.

export type SortKey = 'rarity' | 'ovr' | 'atk' | 'def' | 'name' | 'ties' | 'finance'

export interface CollectionPrefs {
  sortKey: SortKey
  /** -1 = descending, 1 = ascending. */
  sortDir: -1 | 1
  /** Rarity chips currently switched on. */
  rarities: RarityKey[]
  /** Selected cantons, empty = no canton filter. */
  cantons: string[]
  /** Selected party codes, empty = no party filter. */
  parties: string[]
}

const PREFS_KEY = 'bundeshaus-collection-v1'
const SORT_KEYS: SortKey[] = ['rarity', 'ovr', 'atk', 'def', 'name', 'ties', 'finance']

export const DEFAULT_PREFS: CollectionPrefs = {
  sortKey: 'rarity',
  sortDir: -1,
  rarities: [],
  cantons: [],
  parties: [],
}

export function loadPrefs(): CollectionPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const p = JSON.parse(raw) as Partial<CollectionPrefs>
    return {
      sortKey: SORT_KEYS.includes(p.sortKey as SortKey) ? (p.sortKey as SortKey) : DEFAULT_PREFS.sortKey,
      sortDir: p.sortDir === 1 ? 1 : -1,
      rarities: Array.isArray(p.rarities)
        ? p.rarities.filter((r): r is RarityKey => RARITY_ORDER.includes(r as RarityKey))
        : DEFAULT_PREFS.rarities,
      cantons: Array.isArray(p.cantons) ? p.cantons.filter((c): c is string => typeof c === 'string') : [],
      parties: Array.isArray(p.parties) ? p.parties.filter((p): p is string => typeof p === 'string') : [],
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function persistPrefs(prefs: CollectionPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore quota / private-mode failures */
  }
}

// ── Debate record ───────────────────────────────────────────────────────────
// Kept apart from the save, same reasoning as collection prefs: a corrupt or
// absent value should never cost the player their packs/cards.

export interface DebateRecord {
  wins: number
  losses: number
  majorityWins: number
  turnLimitWins: number
}

// Keep the selected v2 key stable across the internal Battle-to-Debate rename.
const DEBATE_KEY = 'bundeshaus-battle-v2'

export const DEFAULT_DEBATE_RECORD: DebateRecord = {
  wins: 0,
  losses: 0,
  majorityWins: 0,
  turnLimitWins: 0,
}

export function loadDebateRecord(): DebateRecord {
  try {
    const raw = localStorage.getItem(DEBATE_KEY)
    if (!raw) return DEFAULT_DEBATE_RECORD
    const r = JSON.parse(raw) as Partial<DebateRecord>
    const majorityWins = isValidCount(r.majorityWins) ? r.majorityWins : 0
    const turnLimitWins = isValidCount(r.turnLimitWins) ? r.turnLimitWins : 0
    return {
      wins: majorityWins + turnLimitWins,
      losses: isValidCount(r.losses) ? r.losses : DEFAULT_DEBATE_RECORD.losses,
      majorityWins,
      turnLimitWins,
    }
  } catch {
    return DEFAULT_DEBATE_RECORD
  }
}

export function persistDebateRecord(record: DebateRecord): void {
  try {
    localStorage.setItem(
      DEBATE_KEY,
      JSON.stringify({
        ...record,
        wins: record.majorityWins + record.turnLimitWins,
      }),
    )
  } catch {
    /* ignore quota / private-mode failures */
  }
}

// ── achievement progress ────────────────────────────────────────────────────
// Kept apart from the save, same reasoning as collection prefs and the Debate
// record: a corrupt or absent value should never cost the player their
// packs/cards, and unlocked achievements should never regress.

export interface AchievementProgress {
  schemaVersion: 2
  /** Achievement id → the timestamp (ms) it was unlocked at. */
  unlocked: Record<string, number>
  /** Repeatable achievement id → number of reward cycles already granted. */
  repeatCompletions: Record<string, number>
  /** Repeatable achievement id → rewarded cycles in its current progress cycle. */
  repeatCycleCompletions: Record<string, number>
  tradesCompleted: number
  /** Source rarities used in successful trade-ins. */
  tradeSourceRarities: string[]
  /** Current consecutive-day pack-opening streak. */
  streakCurrent: number
  /** Longest streak ever reached — achievements never regress once earned. */
  streakBest: number
  /** Local date (YYYY-MM-DD) a pack was last completed on, or null. */
  streakLastDate: string | null
  /** Language codes the player has actively switched to at least once. */
  languagesUsed: string[]
  /** Info-page hashes the player has opened at least once. */
  legalPagesOpened: string[]
  contactEmailClicked: boolean
  /** A pack was torn open between 3am and 4am local time. */
  sleeplessTriggered: boolean
  /** A Mythic card was pulled straight from a regular (non trade-in) pack. */
  mythicDirectPull: boolean
  /** A regular pack contained five distinct rarities. */
  perfectlyMixedTriggered: boolean
}

const ACHIEVEMENTS_KEY = 'bundeshaus-achievements-v1'

export const DEFAULT_ACHIEVEMENT_PROGRESS: AchievementProgress = {
  schemaVersion: 2,
  unlocked: {},
  repeatCompletions: {},
  repeatCycleCompletions: {},
  tradesCompleted: 0,
  tradeSourceRarities: [],
  streakCurrent: 0,
  streakBest: 0,
  streakLastDate: null,
  languagesUsed: [],
  legalPagesOpened: [],
  contactEmailClicked: false,
  sleeplessTriggered: false,
  mythicDirectPull: false,
  perfectlyMixedTriggered: false,
}

function isValidUnlocked(value: unknown): value is Record<string, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value as Record<string, unknown>).every((v) => isValidCount(v))
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

export function loadAchievementProgress(): AchievementProgress {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY)
    if (!raw) return DEFAULT_ACHIEVEMENT_PROGRESS
    const p = JSON.parse(raw) as Partial<AchievementProgress>
    const normalized: AchievementProgress = {
      schemaVersion: 2,
      unlocked: isValidUnlocked(p.unlocked) ? p.unlocked : {},
      repeatCompletions: isValidUnlocked(p.repeatCompletions) ? p.repeatCompletions : {},
      repeatCycleCompletions: isValidUnlocked(p.repeatCycleCompletions)
        ? p.repeatCycleCompletions
        : (isValidUnlocked(p.repeatCompletions) ? p.repeatCompletions : {}),
      tradesCompleted: isValidCount(p.tradesCompleted) ? p.tradesCompleted : 0,
      tradeSourceRarities: isStringArray(p.tradeSourceRarities) ? p.tradeSourceRarities : [],
      streakCurrent: isValidCount(p.streakCurrent) ? p.streakCurrent : 0,
      streakBest: isValidCount(p.streakBest) ? p.streakBest : 0,
      streakLastDate: typeof p.streakLastDate === 'string' ? p.streakLastDate : null,
      languagesUsed: isStringArray(p.languagesUsed) ? p.languagesUsed : [],
      legalPagesOpened: isStringArray(p.legalPagesOpened) ? p.legalPagesOpened : [],
      contactEmailClicked: p.contactEmailClicked === true,
      sleeplessTriggered: p.sleeplessTriggered === true,
      mythicDirectPull: p.mythicDirectPull === true,
      perfectlyMixedTriggered: p.perfectlyMixedTriggered === true,
    }
    persistAchievementProgress(normalized)
    return normalized
  } catch {
    return DEFAULT_ACHIEVEMENT_PROGRESS
  }
}

export function persistAchievementProgress(progress: AchievementProgress): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(progress))
  } catch {
    /* ignore quota / private-mode failures */
  }
}

// ── redeemed vouchers ───────────────────────────────────────────────────────
// Kept apart from the save, same reasoning as collection prefs: a corrupt or
// absent value should never cost the player their packs/cards. There is no
// backend, so this only stops a code being redeemed twice *on this device* —
// see the file-level note in game/vouchers.ts for that tradeoff.

const VOUCHERS_KEY = 'bundeshaus-vouchers-v1'

export function loadRedeemedVouchers(): Set<string> {
  try {
    const raw = localStorage.getItem(VOUCHERS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [])
  } catch {
    return new Set()
  }
}

export function persistRedeemedVouchers(redeemed: Set<string>): void {
  try {
    localStorage.setItem(VOUCHERS_KEY, JSON.stringify([...redeemed]))
  } catch {
    /* ignore quota / private-mode failures */
  }
}
