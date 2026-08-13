// localStorage-backed persistence for the player's packs + owned counts.

export interface SaveState {
  /** Unopened packs remaining. */
  packs: number
  /** member id → number of copies owned. */
  owned: Record<number, number>
}

const KEY = 'bundeshaus-pack-v1'
const STARTING_PACKS = 8

export function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<SaveState>
      return {
        owned: s.owned ?? {},
        packs: typeof s.packs === 'number' ? s.packs : STARTING_PACKS,
      }
    }
  } catch {
    /* ignore corrupt / unavailable storage */
  }
  return { packs: STARTING_PACKS, owned: {} }
}

export function persist(state: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private-mode failures */
  }
}
