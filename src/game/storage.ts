// localStorage-backed persistence for the player's packs + owned counts.

import type { RarityKey } from '../theme'
import { RARITY_ORDER } from '../theme'

export interface SaveState {
  /** Unopened packs remaining. */
  packs: number
  /** member id → number of copies owned. */
  owned: Record<number, number>
  /** Timestamp (ms) when the next batch of packs unlocks, or null if not waiting. */
  refillAt: number | null
}

const KEY = 'bundeshaus-pack-v1'
export const STARTING_PACKS = 10
export const REFILL_COOLDOWN_MS = 15_000

export function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<SaveState>
      const refillAt = typeof s.refillAt === 'number' ? s.refillAt : null
      // Cooldown already elapsed (e.g. app was closed) — grant the next batch now.
      if (refillAt !== null && Date.now() >= refillAt) {
        return { owned: s.owned ?? {}, packs: STARTING_PACKS, refillAt: null }
      }
      return {
        owned: s.owned ?? {},
        packs: typeof s.packs === 'number' ? s.packs : STARTING_PACKS,
        refillAt,
      }
    }
  } catch {
    /* ignore corrupt / unavailable storage */
  }
  return { packs: STARTING_PACKS, owned: {}, refillAt: null }
}

export function persist(state: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private-mode failures */
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

// A valid count is a finite, non-negative integer — guards against corrupt
// localStorage values like negatives, fractions, NaN or Infinity.
function isValidCount(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0
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
