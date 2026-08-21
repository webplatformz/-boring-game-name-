export type DebateAction = 'attack' | 'defend'
export type PollSide = 'player' | 'opponent'

export interface DebateCard {
  ratings: {
    atk: number
    def: number
    ovr: number
  }
}

export interface PollState {
  firmPlayer: number
  ratherPlayer: number
  undecided: number
  ratherOpponent: number
  firmOpponent: number
}

export interface PollWinner {
  winner: PollSide
  majority: boolean
}

export interface DebateRules {
  k: number
  defendTrickleMultiplier: number
  repelledRecruitMultiplier: number
}

export interface ResolveTurnOptions extends Partial<DebateRules> {
  random?: () => number
}

export interface CheckWinOptions {
  random?: () => number
}

export const DEBATE_TURN_LIMIT = 5

export const DEFAULT_DEBATE_RULES: Readonly<DebateRules> = {
  k: 4,
  defendTrickleMultiplier: 1.5,
  repelledRecruitMultiplier: 1,
}

const POLL_KEYS: (keyof PollState)[] = [
  'firmPlayer',
  'ratherPlayer',
  'undecided',
  'ratherOpponent',
  'firmOpponent',
]

export function INITIAL_POLL(playerCard: DebateCard, oppCard: DebateCard): PollState {
  const lean = Math.min(
    15,
    Math.round(Math.abs(playerCard.ratings.ovr - oppCard.ratings.ovr) * 0.5),
  )
  return playerCard.ratings.ovr >= oppCard.ratings.ovr
    ? {
        firmPlayer: 0,
        ratherPlayer: lean,
        undecided: 100 - lean,
        ratherOpponent: 0,
        firmOpponent: 0,
      }
    : {
        firmPlayer: 0,
        ratherPlayer: 0,
        undecided: 100 - lean,
        ratherOpponent: lean,
        firmOpponent: 0,
      }
}

export function resolveTurn(
  poll: PollState,
  playerCard: DebateCard,
  playerAction: DebateAction,
  oppCard: DebateCard,
  oppAction: DebateAction,
  options: ResolveTurnOptions = {},
): PollState {
  assertPoll(poll)
  const rules = resolveRules(options)
  const next = { ...poll }

  if (playerAction === 'defend' && oppAction === 'defend') {
    resolveDefendDefend(next, playerCard, oppCard, rules)
  } else if (playerAction === 'attack' && oppAction === 'attack') {
    resolveAttackAttack(
      next,
      playerCard,
      oppCard,
      rules,
      options.random ?? Math.random,
    )
  } else {
    const attacker: PollSide = playerAction === 'attack' ? 'player' : 'opponent'
    resolveAttackDefend(next, poll, playerCard, oppCard, attacker, rules)
  }

  assertPoll(next)
  return next
}

export function checkWin(
  poll: PollState,
  turnsPlayed: number,
  turnLimit: number,
  playerCard: DebateCard,
  oppCard: DebateCard,
  options: CheckWinOptions = {},
): PollWinner | null {
  assertPoll(poll)
  if (!Number.isInteger(turnsPlayed) || turnsPlayed < 0) {
    throw new Error('turnsPlayed must be a non-negative integer')
  }
  if (!Number.isInteger(turnLimit) || turnLimit < 1) {
    throw new Error('turnLimit must be a positive integer')
  }

  const playerSupport = support(poll, 'player')
  const opponentSupport = support(poll, 'opponent')
  if (playerSupport > 50) return { winner: 'player', majority: true }
  if (opponentSupport > 50) return { winner: 'opponent', majority: true }
  if (turnsPlayed < turnLimit) return null

  if (playerSupport !== opponentSupport) {
    return {
      winner: playerSupport > opponentSupport ? 'player' : 'opponent',
      majority: false,
    }
  }
  if (playerCard.ratings.ovr !== oppCard.ratings.ovr) {
    return {
      winner: playerCard.ratings.ovr > oppCard.ratings.ovr ? 'player' : 'opponent',
      majority: false,
    }
  }
  return {
    winner: (options.random ?? Math.random)() < 0.5 ? 'player' : 'opponent',
    majority: false,
  }
}

function resolveRules(options: ResolveTurnOptions): DebateRules {
  const rules = {
    k: options.k ?? DEFAULT_DEBATE_RULES.k,
    defendTrickleMultiplier:
      options.defendTrickleMultiplier ??
      DEFAULT_DEBATE_RULES.defendTrickleMultiplier,
    repelledRecruitMultiplier:
      options.repelledRecruitMultiplier ??
      DEFAULT_DEBATE_RULES.repelledRecruitMultiplier,
  }
  if (!Number.isFinite(rules.k) || rules.k <= 0) {
    throw new Error('Debate rule k must be greater than zero')
  }
  if (
    !Number.isFinite(rules.defendTrickleMultiplier) ||
    rules.defendTrickleMultiplier < 0 ||
    !Number.isFinite(rules.repelledRecruitMultiplier) ||
    rules.repelledRecruitMultiplier < 0
  ) {
    throw new Error('Debate rule multipliers must be finite and non-negative')
  }
  return rules
}

function resolveDefendDefend(
  next: PollState,
  playerCard: DebateCard,
  oppCard: DebateCard,
  rules: DebateRules,
): void {
  const securePlayer = Math.min(
    next.ratherPlayer,
    Math.round(playerCard.ratings.def / rules.k),
  )
  const secureOpponent = Math.min(
    next.ratherOpponent,
    Math.round(oppCard.ratings.def / rules.k),
  )
  next.ratherPlayer -= securePlayer
  next.firmPlayer += securePlayer
  next.ratherOpponent -= secureOpponent
  next.firmOpponent += secureOpponent

  const margin = playerCard.ratings.def - oppCard.ratings.def
  if (margin === 0) return
  const winner: PollSide = margin > 0 ? 'player' : 'opponent'
  const trickle = Math.min(
    next.undecided,
    Math.round(
      marginAmount(Math.abs(margin), next.undecided, rules.k) *
        rules.defendTrickleMultiplier,
    ),
  )
  moveUndecidedToRather(next, winner, trickle)
}

function resolveAttackAttack(
  next: PollState,
  playerCard: DebateCard,
  oppCard: DebateCard,
  rules: DebateRules,
  random: () => number,
): void {
  const desiredPlayer = Math.round(playerCard.ratings.atk / rules.k)
  const desiredOpponent = Math.round(oppCard.ratings.atk / rules.k)
  const desiredTotal = desiredPlayer + desiredOpponent
  if (desiredTotal === 0) return

  let recruitPlayer = desiredPlayer
  let recruitOpponent = desiredOpponent
  if (desiredTotal > next.undecided) {
    const exactPlayer = (next.undecided * desiredPlayer) / desiredTotal
    const exactOpponent = (next.undecided * desiredOpponent) / desiredTotal
    recruitPlayer = Math.floor(exactPlayer)
    recruitOpponent = Math.floor(exactOpponent)
    if (recruitPlayer + recruitOpponent < next.undecided) {
      const playerFraction = exactPlayer - recruitPlayer
      const opponentFraction = exactOpponent - recruitOpponent
      if (playerFraction !== opponentFraction) {
        if (playerFraction > opponentFraction) recruitPlayer += 1
        else recruitOpponent += 1
      } else {
        const remainderWinner =
          playerCard.ratings.ovr !== oppCard.ratings.ovr
            ? playerCard.ratings.ovr > oppCard.ratings.ovr
              ? 'player'
              : 'opponent'
            : random() < 0.5
              ? 'player'
              : 'opponent'
        if (remainderWinner === 'player') recruitPlayer += 1
        else recruitOpponent += 1
      }
    }
  }
  moveUndecidedToRather(next, 'player', recruitPlayer)
  moveUndecidedToRather(next, 'opponent', recruitOpponent)
}

function resolveAttackDefend(
  next: PollState,
  before: PollState,
  playerCard: DebateCard,
  oppCard: DebateCard,
  attacker: PollSide,
  rules: DebateRules,
): void {
  const defender = otherSide(attacker)
  const attackerCard = attacker === 'player' ? playerCard : oppCard
  const defenderCard = defender === 'player' ? playerCard : oppCard
  const margin = attackerCard.ratings.atk - defenderCard.ratings.def

  if (margin > 0) {
    const destabilize = marginAmount(margin, rather(before, defender), rules.k)
    const recruit = marginAmount(margin, before.undecided, rules.k)
    moveRatherToUndecided(next, defender, destabilize)
    moveUndecidedToRather(next, attacker, recruit)
  } else if (margin === 0) {
    const recruit = Math.min(
      before.undecided,
      Math.max(1, Math.round(attackerCard.ratings.atk / (rules.k * 2))),
    )
    moveUndecidedToRather(next, attacker, recruit)
  } else {
    const defendedMargin = -margin
    const secureBonus = marginAmount(
      defendedMargin,
      rather(before, defender),
      rules.k,
    )
    const backlash = marginAmount(
      defendedMargin,
      rather(before, attacker),
      rules.k,
    )
    moveRatherToFirm(next, defender, secureBonus)
    moveRatherToUndecided(next, attacker, backlash)

    const recruit = Math.min(
      before.undecided,
      Math.round(
        marginAmount(defendedMargin, before.undecided, rules.k) *
          rules.repelledRecruitMultiplier,
      ),
    )
    moveUndecidedToRather(next, defender, recruit)
  }

  const baselineSecure = Math.min(
    rather(next, defender),
    Math.round(defenderCard.ratings.def / rules.k),
  )
  moveRatherToFirm(next, defender, baselineSecure)
}

function marginAmount(margin: number, pool: number, k: number): number {
  return margin > 0 ? Math.min(pool, Math.max(1, Math.round(margin / k))) : 0
}

function support(poll: PollState, side: PollSide): number {
  return side === 'player'
    ? poll.firmPlayer + poll.ratherPlayer
    : poll.firmOpponent + poll.ratherOpponent
}

function rather(poll: PollState, side: PollSide): number {
  return side === 'player' ? poll.ratherPlayer : poll.ratherOpponent
}

function otherSide(side: PollSide): PollSide {
  return side === 'player' ? 'opponent' : 'player'
}

function moveUndecidedToRather(poll: PollState, side: PollSide, amount: number): void {
  const moved = Math.min(poll.undecided, amount)
  poll.undecided -= moved
  if (side === 'player') poll.ratherPlayer += moved
  else poll.ratherOpponent += moved
}

function moveRatherToUndecided(poll: PollState, side: PollSide, amount: number): void {
  const moved = Math.min(rather(poll, side), amount)
  if (side === 'player') poll.ratherPlayer -= moved
  else poll.ratherOpponent -= moved
  poll.undecided += moved
}

function moveRatherToFirm(poll: PollState, side: PollSide, amount: number): void {
  const moved = Math.min(rather(poll, side), amount)
  if (side === 'player') {
    poll.ratherPlayer -= moved
    poll.firmPlayer += moved
  } else {
    poll.ratherOpponent -= moved
    poll.firmOpponent += moved
  }
}

function assertPoll(poll: PollState): void {
  const values = POLL_KEYS.map((key) => poll[key])
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error('Poll buckets must be non-negative integers')
  }
  if (values.reduce((total, value) => total + value, 0) !== 100) {
    throw new Error('Poll buckets must total 100')
  }
}
