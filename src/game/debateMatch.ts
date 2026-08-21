import type { DebateAction, DebateCard } from './debate'

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
  const crossParty = eligible.filter(
    (member) => member.partyCode !== playerCard.partyCode,
  )
  const pool =
    crossParty.length > 0
      ? crossParty
      : eligible.length > 0
        ? eligible
        : members.filter((member) => member.id !== playerCard.id)

  if (pool.length === 0) {
    throw new Error('Debate requires at least two distinct cards')
  }
  return pool[Math.floor(random() * pool.length)]
}

export function chooseAiAction(
  card: DebateCard,
  random: () => number = Math.random,
): DebateAction {
  const total = card.ratings.atk + card.ratings.def
  if (total <= 0) return random() < 0.5 ? 'attack' : 'defend'
  return random() < card.ratings.atk / total ? 'attack' : 'defend'
}
