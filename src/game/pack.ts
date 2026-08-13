import { MEMBERS, type Member } from '../data/members'
import { RARITY_ORDER, TIERS } from '../theme'

export const PACK_SIZE = 10

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
