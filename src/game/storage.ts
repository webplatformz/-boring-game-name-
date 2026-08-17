// localStorage-backed persistence for the player's packs, collection, and stats.

import type { RarityKey } from '../theme'
import { RARITY_ORDER } from '../theme'
import { MEMBERS, META } from '../data/members'

export interface SaveState {
  /** Unopened packs remaining. */
  packs: number
  /** member id → number of copies owned. */
  owned: Record<number, number>
  /** Total cards received from completed pack-opening flows. */
  cardsRevealed: number
  /** Total regular and trade packs completed. */
  packsOpened: number
  /** Timestamp (ms) when the next batch of packs unlocks, or null if not waiting. */
  refillAt: number | null
}

const KEY = 'bundeshaus-pack-v1'
export const STARTING_PACKS = 10
export const REFILL_COOLDOWN_MS = 15_000

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
      const refillAt = typeof s.refillAt === 'number' ? s.refillAt : null
      const cardsRevealed = isValidCount(s.cardsRevealed) ? s.cardsRevealed : 0
      const packsOpened = isValidCount(s.packsOpened) ? s.packsOpened : 0
      // Cooldown already elapsed (e.g. app was closed) — grant the next batch now.
      if (refillAt !== null && Date.now() >= refillAt) {
        return {
          owned: s.owned ?? {},
          packs: STARTING_PACKS,
          cardsRevealed,
          packsOpened,
          refillAt: null,
        }
      }
      return {
        owned: s.owned ?? {},
        packs: typeof s.packs === 'number' ? s.packs : STARTING_PACKS,
        cardsRevealed,
        packsOpened,
        refillAt,
      }
    }
  } catch {
    /* ignore corrupt / unavailable storage */
  }
  return {
    packs: STARTING_PACKS,
    owned: {},
    cardsRevealed: 0,
    packsOpened: 0,
    refillAt: null,
  }
}

export function persist(state: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private-mode failures */
  }
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

export type SortKey = 'rarity' | 'ovr' | 'atk' | 'def' | 'name'

export interface CollectionPrefs {
  sortKey: SortKey
  /** -1 = descending, 1 = ascending. */
  sortDir: -1 | 1
  /** Rarity chips currently switched on. */
  rarities: RarityKey[]
  /** Selected cantons, empty = no canton filter. */
  cantons: string[]
}

const PREFS_KEY = 'bundeshaus-collection-v1'
const SORT_KEYS: SortKey[] = ['rarity', 'ovr', 'atk', 'def', 'name']

export const DEFAULT_PREFS: CollectionPrefs = {
  sortKey: 'rarity',
  sortDir: -1,
  rarities: [],
  cantons: [],
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

// ── battle mode record ──────────────────────────────────────────────────────
// Kept apart from the save, same reasoning as collection prefs: a corrupt or
// absent value should never cost the player their packs/cards.

export interface BattleRecord {
  wins: number
  losses: number
}

const BATTLE_KEY = 'bundeshaus-battle-v1'

export const DEFAULT_BATTLE_RECORD: BattleRecord = {
  wins: 0,
  losses: 0,
}

export function loadBattleRecord(): BattleRecord {
  try {
    const raw = localStorage.getItem(BATTLE_KEY)
    if (!raw) return DEFAULT_BATTLE_RECORD
    const r = JSON.parse(raw) as Partial<BattleRecord>
    return {
      wins: isValidCount(r.wins) ? r.wins : DEFAULT_BATTLE_RECORD.wins,
      losses: isValidCount(r.losses) ? r.losses : DEFAULT_BATTLE_RECORD.losses,
    }
  } catch {
    return DEFAULT_BATTLE_RECORD
  }
}

export function persistBattleRecord(record: BattleRecord): void {
  try {
    localStorage.setItem(BATTLE_KEY, JSON.stringify(record))
  } catch {
    /* ignore quota / private-mode failures */
  }
}
