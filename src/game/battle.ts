import { MEMBERS, type Member } from '../data/members'
import { RARITY_ORDER } from '../theme'

export type Action = 'attack' | 'defend'

export interface BattleResult {
  winner: 'player' | 'opponent'
  reason: string
}

/**
 * Draw a random opponent matched to the player's card by rarity tier (same
 * tier, or one tier up/down), regardless of ownership. Excludes the
 * player's chosen card so battles never mirror a card against itself.
 * Tier-matching keeps fights meaningful in both directions — a strong card
 * no longer just stomps random weak opponents, and a weak card isn't
 * thrown against something wildly out of its league.
 */
export function pickOpponent(playerCard: Member): Member {
  const idx = RARITY_ORDER.indexOf(playerCard.rarity)
  const nearbyTiers = new Set(RARITY_ORDER.filter((_, i) => Math.abs(i - idx) <= 1))
  let pool = MEMBERS.filter((m) => m.id !== playerCard.id && nearbyTiers.has(m.rarity))
  // Defensive fallback in case a tier window is ever empty (shouldn't happen
  // with the current data, but never leave the AI with no opponent to pick).
  if (pool.length === 0) pool = MEMBERS.filter((m) => m.id !== playerCard.id)
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * AI leans into whichever of its own stats is higher: a card with more
 * ATK than DEF is more likely to attack, and vice versa.
 */
export function chooseAiAction(card: Member): Action {
  const total = card.atk + card.def
  if (total <= 0) return Math.random() < 0.5 ? 'attack' : 'defend'
  return Math.random() < card.atk / total ? 'attack' : 'defend'
}

/**
 * Compares a single stat between the two sides. Ties fall back to OVR,
 * then a coin-flip, so a battle always produces a winner.
 */
function compareStat(
  playerValue: number,
  oppValue: number,
  playerCard: Member,
  oppCard: Member,
): 'player' | 'opponent' {
  if (playerValue !== oppValue) return playerValue > oppValue ? 'player' : 'opponent'
  if (playerCard.ovr !== oppCard.ovr) return playerCard.ovr > oppCard.ovr ? 'player' : 'opponent'
  return Math.random() < 0.5 ? 'player' : 'opponent'
}

/**
 * Resolves a single sudden-death round.
 * - Attack vs Attack: higher ATK wins.
 * - Defend vs Defend: higher DEF wins (no stalemates in sudden death).
 * - Attack vs Defend: attacker wins if their ATK beats the defender's DEF.
 */
export function resolveRound(
  playerCard: Member,
  playerAction: Action,
  oppCard: Member,
  oppAction: Action,
): BattleResult {
  let winner: 'player' | 'opponent'

  if (playerAction === 'attack' && oppAction === 'attack') {
    winner = compareStat(playerCard.atk, oppCard.atk, playerCard, oppCard)
  } else if (playerAction === 'defend' && oppAction === 'defend') {
    winner = compareStat(playerCard.def, oppCard.def, playerCard, oppCard)
  } else {
    // One side attacks, the other defends: attacker wins if their ATK
    // beats the defender's DEF, ties broken the same way as above.
    const playerIsAttacker = playerAction === 'attack'
    const attackerAtk = playerIsAttacker ? playerCard.atk : oppCard.atk
    const defenderDef = playerIsAttacker ? oppCard.def : playerCard.def
    const attackerWins =
      attackerAtk === defenderDef
        ? compareStat(playerCard.ovr, oppCard.ovr, playerCard, oppCard) === (playerIsAttacker ? 'player' : 'opponent')
        : attackerAtk > defenderDef
    winner = attackerWins ? (playerIsAttacker ? 'player' : 'opponent') : playerIsAttacker ? 'opponent' : 'player'
  }

  const reason =
    winner === 'player'
      ? playerAction === 'attack'
        ? 'You attacked and won!'
        : 'You defended and won!'
      : oppAction === 'attack'
        ? 'They attacked and won!'
        : 'They defended and won!'

  return { winner, reason }
}
