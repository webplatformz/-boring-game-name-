// localStorage-backed persistence for the player's packs + owned counts.

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
