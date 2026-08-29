import {
  checkWin,
  DEBATE_TURN_LIMIT,
  INITIAL_POLL,
  resolveTurn,
  type CheckWinOptions,
  type DebateAction,
  type DebateCard,
  type PollState,
  type PollWinner,
  type ResolveTurnOptions,
} from './debate.ts'

export type DuelPhase =
  | 'awaiting-action'
  | 'actions-locked'
  | 'revealing'
  | 'settled'

export interface CompletedDebateTurn {
  pollBefore: PollState
  poll: PollState
  playerAction: DebateAction
  oppAction: DebateAction
}

export interface DuelSession {
  phase: DuelPhase
  poll: PollState
  playerAction: DebateAction | null
  oppAction: DebateAction | null
  lastTurn: CompletedDebateTurn | null
  turn: number
  winner: PollWinner | null
}

export interface DuelSnapshot extends DuelSession {
  version: 1
  playerId: number
  opponentId: number
}

export interface IdentifiedDebateCard extends DebateCard {
  id: number
}

export interface DuelContext {
  playerCard: DebateCard
  oppCard: DebateCard
  turnLimit?: number
  resolveTurnOptions?: ResolveTurnOptions
  checkWinOptions?: CheckWinOptions
}

export type DuelEvent =
  | {
      type: 'lock-actions'
      playerAction: DebateAction
      oppAction: DebateAction
    }
  | { type: 'reveal' }
  | { type: 'finish-reveal' }

export function createDuel(
  playerCard: DebateCard,
  oppCard: DebateCard,
): DuelSession {
  return {
    phase: 'awaiting-action',
    poll: INITIAL_POLL(playerCard, oppCard),
    playerAction: null,
    oppAction: null,
    lastTurn: null,
    turn: 1,
    winner: null,
  }
}

export function toDuelSnapshot(
  playerId: number,
  opponentId: number,
  session: DuelSession,
): DuelSnapshot {
  if (!Number.isInteger(playerId) || !Number.isInteger(opponentId)) {
    throw new Error('Duel card IDs must be integers')
  }
  if (playerId === opponentId) {
    throw new Error('Duel requires two distinct cards')
  }
  return {
    ...cloneSession(session),
    version: 1,
    playerId,
    opponentId,
  }
}

export function restoreDuelSnapshot(
  snapshot: DuelSnapshot,
  playerCard: IdentifiedDebateCard,
  opponentCard: IdentifiedDebateCard,
  turnLimit = DEBATE_TURN_LIMIT,
): DuelSession {
  if (
    snapshot.version !== 1 ||
    snapshot.playerId !== playerCard.id ||
    snapshot.opponentId !== opponentCard.id ||
    snapshot.playerId === snapshot.opponentId
  ) {
    throw new Error('Duel snapshot card identity is invalid')
  }
  if (
    !Number.isInteger(snapshot.turn) ||
    snapshot.turn < 1 ||
    snapshot.turn > turnLimit
  ) {
    throw new Error('Duel snapshot turn is invalid')
  }
  assertSnapshotPoll(snapshot.poll)
  assertSnapshotPhase(snapshot)
  if (snapshot.lastTurn) {
    assertSnapshotPoll(snapshot.lastTurn.pollBefore)
    assertSnapshotPoll(snapshot.lastTurn.poll)
    if (!pollsEqual(snapshot.poll, snapshot.lastTurn.poll)) {
      throw new Error('Duel snapshot last turn does not match its poll')
    }
  }
  return cloneSession(snapshot)
}

export function reduceDuel(
  session: DuelSession,
  event: DuelEvent,
  context: DuelContext,
): DuelSession {
  switch (event.type) {
    case 'lock-actions':
      requirePhase(session, 'awaiting-action', event.type)
      return {
        ...session,
        phase: 'actions-locked',
        playerAction: event.playerAction,
        oppAction: event.oppAction,
      }

    case 'reveal': {
      requirePhase(session, 'actions-locked', event.type)
      if (!session.playerAction || !session.oppAction) {
        throw new Error('Locked duel actions are required before reveal')
      }
      const pollBefore = session.poll
      const poll = resolveTurn(
        pollBefore,
        context.playerCard,
        session.playerAction,
        context.oppCard,
        session.oppAction,
        context.resolveTurnOptions,
      )
      const winner = checkWin(
        poll,
        session.turn,
        context.turnLimit ?? DEBATE_TURN_LIMIT,
        context.playerCard,
        context.oppCard,
        context.checkWinOptions,
      )
      return {
        ...session,
        phase: 'revealing',
        poll,
        winner,
        lastTurn: {
          pollBefore,
          poll,
          playerAction: session.playerAction,
          oppAction: session.oppAction,
        },
      }
    }

    case 'finish-reveal':
      requirePhase(session, 'revealing', event.type)
      if (session.winner) {
        return { ...session, phase: 'settled' }
      }
      return {
        ...session,
        phase: 'awaiting-action',
        playerAction: null,
        oppAction: null,
        turn: session.turn + 1,
      }
  }
}

function cloneSession(session: DuelSession): DuelSession {
  return {
    phase: session.phase,
    poll: { ...session.poll },
    playerAction: session.playerAction,
    oppAction: session.oppAction,
    lastTurn: session.lastTurn
      ? {
          ...session.lastTurn,
          pollBefore: { ...session.lastTurn.pollBefore },
          poll: { ...session.lastTurn.poll },
        }
      : null,
    turn: session.turn,
    winner: session.winner ? { ...session.winner } : null,
  }
}

function assertSnapshotPhase(snapshot: DuelSnapshot): void {
  if (
    snapshot.phase !== 'awaiting-action' &&
    snapshot.phase !== 'actions-locked' &&
    snapshot.phase !== 'revealing' &&
    snapshot.phase !== 'settled'
  ) {
    throw new Error('Duel snapshot phase is invalid')
  }
  assertSnapshotAction(snapshot.playerAction)
  assertSnapshotAction(snapshot.oppAction)
  if (snapshot.winner) {
    if (
      (snapshot.winner.winner !== 'player' &&
        snapshot.winner.winner !== 'opponent') ||
      typeof snapshot.winner.majority !== 'boolean'
    ) {
      throw new Error('Duel snapshot winner is invalid')
    }
  }
  if (snapshot.lastTurn) {
    assertSnapshotAction(snapshot.lastTurn.playerAction, false)
    assertSnapshotAction(snapshot.lastTurn.oppAction, false)
  }
  const hasActions =
    snapshot.playerAction !== null && snapshot.oppAction !== null
  const hasNoActions =
    snapshot.playerAction === null && snapshot.oppAction === null

  if (snapshot.phase === 'awaiting-action') {
    if (!hasNoActions || snapshot.winner !== null) {
      throw new Error('Awaiting-action duel snapshot is inconsistent')
    }
    return
  }
  if (!hasActions) {
    throw new Error('Duel snapshot phase requires locked actions')
  }
  if (snapshot.phase === 'actions-locked') {
    if (snapshot.winner !== null) {
      throw new Error('Actions-locked duel snapshot is inconsistent')
    }
    return
  }
  if (!snapshot.lastTurn) {
    throw new Error('Revealed duel snapshot requires a completed turn')
  }
  if (snapshot.phase === 'settled' && snapshot.winner === null) {
    throw new Error('Settled duel snapshot requires a winner')
  }
}

function assertSnapshotAction(
  action: DebateAction | null,
  nullable = true,
): void {
  if (
    action !== 'attack' &&
    action !== 'defend' &&
    !(nullable && action === null)
  ) {
    throw new Error('Duel snapshot action is invalid')
  }
}

function assertSnapshotPoll(poll: PollState): void {
  const values = [
    poll.firmPlayer,
    poll.ratherPlayer,
    poll.undecided,
    poll.ratherOpponent,
    poll.firmOpponent,
  ]
  if (
    values.some((value) => !Number.isInteger(value) || value < 0) ||
    values.reduce((total, value) => total + value, 0) !== 100
  ) {
    throw new Error('Duel snapshot poll is invalid')
  }
}

function pollsEqual(left: PollState, right: PollState): boolean {
  return (
    left.firmPlayer === right.firmPlayer &&
    left.ratherPlayer === right.ratherPlayer &&
    left.undecided === right.undecided &&
    left.ratherOpponent === right.ratherOpponent &&
    left.firmOpponent === right.firmOpponent
  )
}

function requirePhase(
  session: DuelSession,
  expected: DuelPhase,
  event: DuelEvent['type'],
): void {
  if (session.phase !== expected) {
    throw new Error(
      `Cannot ${event} while duel is ${session.phase}; expected ${expected}`,
    )
  }
}
