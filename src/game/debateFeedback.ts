import type {
  DebateAction,
  DebateCard,
  PollState,
} from './debate'

export type DebateFeedbackKey =
  | 'debateFeedbackNoMovement'
  | 'debateFeedbackDefendLead'
  | 'debateFeedbackDefendTie'
  | 'debateFeedbackAttackRace'
  | 'debateFeedbackAttackRaceTie'
  | 'debateFeedbackAttackWin'
  | 'debateFeedbackAttackTie'
  | 'debateFeedbackDefenseWin'

export interface PollDelta {
  bucket: keyof PollState
  amount: number
}

const POLL_BUCKETS: (keyof PollState)[] = [
  'firmPlayer',
  'ratherPlayer',
  'undecided',
  'ratherOpponent',
  'firmOpponent',
]

export function getDebateFeedbackKey(
  playerCard: DebateCard,
  playerAction: DebateAction,
  oppCard: DebateCard,
  oppAction: DebateAction,
  before: PollState,
  after: PollState,
): DebateFeedbackKey {
  if (getPollDeltas(before, after).length === 0) {
    return 'debateFeedbackNoMovement'
  }
  if (playerAction === 'defend' && oppAction === 'defend') {
    return playerCard.ratings.def === oppCard.ratings.def
      ? 'debateFeedbackDefendTie'
      : 'debateFeedbackDefendLead'
  }
  if (playerAction === 'attack' && oppAction === 'attack') {
    return playerCard.ratings.atk === oppCard.ratings.atk
      ? 'debateFeedbackAttackRaceTie'
      : 'debateFeedbackAttackRace'
  }

  const playerAttacks = playerAction === 'attack'
  const attacker = playerAttacks ? playerCard : oppCard
  const defender = playerAttacks ? oppCard : playerCard
  const margin = attacker.ratings.atk - defender.ratings.def
  if (margin > 0) return 'debateFeedbackAttackWin'
  if (margin === 0) return 'debateFeedbackAttackTie'
  return 'debateFeedbackDefenseWin'
}

export function getPollDeltas(before: PollState, after: PollState): PollDelta[] {
  return POLL_BUCKETS.flatMap((bucket) => {
    const amount = after[bucket] - before[bucket]
    return amount === 0 ? [] : [{ bucket, amount }]
  })
}
