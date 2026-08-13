import { MEMBERS, type Member } from '../data/members'
import type { RarityKey } from '../theme'
import { RARITY_ORDER, TIERS } from '../theme'

export const PACK_SIZE = 5

/**
 * Draw a pack: rarity-weighted sampling with no duplicates inside one pack,
 * then ordered common → legendary so the best pulls come last on the reveal.
 * Ported from the design prototype's drawPack().
 */
export function drawPack(size = PACK_SIZE): Member[] {
  const pool = MEMBERS.slice()
  const picked: Member[] = []

  for (let n = 0; n < size && pool.length; n++) {
    let total = 0
    for (const m of pool) total += TIERS[m.rarity].weight
    let roll = Math.random() * total
    let hit = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      roll -= TIERS[pool[i].rarity].weight
      if (roll <= 0) {
        hit = i
        break
      }
    }
    picked.push(pool.splice(hit, 1)[0])
  }

  picked.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))
  return picked
}

export function getNextRarity(rarity: RarityKey): RarityKey | null {
  const idx = RARITY_ORDER.indexOf(rarity)
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null
  return RARITY_ORDER[idx + 1]
}

/**
 * Draw a single random card of the specified target rarity for a trade-in pack.
 */
export function drawTradePackCard(targetRarity: RarityKey): Member[] {
  const pool = MEMBERS.filter((m) => m.rarity === targetRarity)
  if (pool.length === 0) return []
  const hit = Math.floor(Math.random() * pool.length)
  return [pool[hit]]
}

