import type { DebateAction, DebateCard } from './debate'
import type { RarityKey } from '../theme'

export interface DebateMatchCard extends DebateCard {
  id: number
  partyCode: string
  ratings: DebateCard['ratings'] & {
    rarity: string
  }
}

export function pickOpponentFrom<T extends DebateMatchCard>(
  members: readonly T[],
  playerCard: T,
  rarityOrder: readonly string[],
  random: () => number = Math.random,
): T {
  const playerTier = rarityOrder.indexOf(playerCard.ratings.rarity)
  const nearbyTiers = new Set(
    rarityOrder.filter((_, index) => Math.abs(index - playerTier) <= 1),
  )
  const eligible = members.filter(
    (member) =>
      member.id !== playerCard.id && nearbyTiers.has(member.ratings.rarity),
  )
  const preferred = preferredOpponentPool(eligible, playerCard)
  const pool =
    preferred.length > 0
      ? preferred
      : eligible.length > 0
        ? eligible
        : members.filter((member) => member.id !== playerCard.id)

  return pickFromPool(
    pool,
    random,
    'Debate requires at least two distinct cards',
  )
}

export function pickOpponentAtRarity<T extends DebateMatchCard>(
  members: readonly T[],
  playerCard: T,
  rarity: RarityKey,
  random: () => number = Math.random,
): T {
  const eligible = members.filter(
    (member) =>
      member.id !== playerCard.id && member.ratings.rarity === rarity,
  )
  const preferred = preferredOpponentPool(eligible, playerCard)
  return pickFromPool(
    preferred.length > 0 ? preferred : eligible,
    random,
    `Campaign requires an eligible ${rarity} opponent`,
  )
}

export function chooseAiAction(
  card: DebateCard,
  random: () => number = Math.random,
): DebateAction {
  const total = card.ratings.atk + card.ratings.def
  if (total <= 0) return random() < 0.5 ? 'attack' : 'defend'
  return random() < card.ratings.atk / total ? 'attack' : 'defend'
}

function preferredOpponentPool<T extends DebateMatchCard>(
  eligible: readonly T[],
  playerCard: T,
): T[] {
  return eligible.filter((member) => member.partyCode !== playerCard.partyCode)
}

function pickFromPool<T>(
  pool: readonly T[],
  random: () => number,
  emptyMessage: string,
): T {
  if (pool.length === 0) {
    throw new Error(emptyMessage)
  }
  return pool[Math.floor(random() * pool.length)]
}
