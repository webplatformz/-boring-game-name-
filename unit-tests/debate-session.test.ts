import assert from 'node:assert/strict'
import test from 'node:test'
import type { DebateCard } from '../src/game/debate.ts'
import {
  createDuel,
  reduceDuel,
  restoreDuelSnapshot,
  toDuelSnapshot,
  type DuelContext,
} from '../src/game/debateSession.ts'

const card = (atk: number, def: number, ovr: number): DebateCard => ({
  ratings: { atk, def, ovr },
})

const player = card(4, 4, 70)
const opponent = card(4, 4, 70)
const context: DuelContext = {
  playerCard: player,
  oppCard: opponent,
  checkWinOptions: { random: () => 0.25 },
}

test('a duel turn moves through lock, reveal, and advance phases', () => {
  const initial = createDuel(player, opponent)
  const locked = reduceDuel(
    initial,
    {
      type: 'lock-actions',
      playerAction: 'attack',
      oppAction: 'defend',
    },
    context,
  )
  assert.equal(locked.phase, 'actions-locked')
  assert.equal(locked.playerAction, 'attack')
  assert.equal(locked.oppAction, 'defend')

  const revealed = reduceDuel(locked, { type: 'reveal' }, context)
  assert.equal(revealed.phase, 'revealing')
  assert.equal(revealed.turn, 1)
  assert.ok(revealed.lastTurn)
  assert.equal(revealed.winner, null)

  const advanced = reduceDuel(
    revealed,
    { type: 'finish-reveal' },
    context,
  )
  assert.equal(advanced.phase, 'awaiting-action')
  assert.equal(advanced.turn, 2)
  assert.equal(advanced.playerAction, null)
  assert.equal(advanced.oppAction, null)
  assert.deepEqual(advanced.lastTurn, revealed.lastTurn)
})

test('a winning reveal remains visible before the duel settles', () => {
  let session = createDuel(player, opponent)
  for (let turn = 1; turn <= 5; turn++) {
    session = reduceDuel(
      session,
      {
        type: 'lock-actions',
        playerAction: 'attack',
        oppAction: 'attack',
      },
      context,
    )
    session = reduceDuel(session, { type: 'reveal' }, context)
    assert.equal(session.phase, 'revealing')
    if (turn < 5) {
      assert.equal(session.winner, null)
    } else {
      assert.deepEqual(session.winner, {
        winner: 'player',
        majority: false,
      })
    }
    session = reduceDuel(session, { type: 'finish-reveal' }, context)
  }

  assert.equal(session.phase, 'settled')
  assert.equal(session.turn, 5)
  assert.deepEqual(session.winner, {
    winner: 'player',
    majority: false,
  })
})

test('duel transitions reject events from the wrong phase', () => {
  const initial = createDuel(player, opponent)
  assert.throws(
    () => reduceDuel(initial, { type: 'reveal' }, context),
    /expected actions-locked/,
  )

  const locked = reduceDuel(
    initial,
    {
      type: 'lock-actions',
      playerAction: 'defend',
      oppAction: 'defend',
    },
    context,
  )
  assert.throws(
    () =>
      reduceDuel(
        locked,
        {
          type: 'lock-actions',
          playerAction: 'attack',
          oppAction: 'attack',
        },
        context,
      ),
    /expected awaiting-action/,
  )
})

test('duel snapshots round-trip an action lock after an earlier turn', () => {
  let session = createDuel(player, opponent)
  session = reduceDuel(
    session,
    {
      type: 'lock-actions',
      playerAction: 'attack',
      oppAction: 'defend',
    },
    context,
  )
  session = reduceDuel(session, { type: 'reveal' }, context)
  session = reduceDuel(session, { type: 'finish-reveal' }, context)
  session = reduceDuel(
    session,
    {
      type: 'lock-actions',
      playerAction: 'defend',
      oppAction: 'attack',
    },
    context,
  )

  const snapshot = toDuelSnapshot(1, 2, session)
  const restored = restoreDuelSnapshot(
    snapshot,
    { id: 1, ...player },
    { id: 2, ...opponent },
  )
  assert.deepEqual(restored, session)
  assert.equal(toDuelSnapshot(1, 3, restored).opponentId, 3)
})

test('duel snapshot restoration rejects corrupt state', () => {
  const snapshot = toDuelSnapshot(1, 2, createDuel(player, opponent))
  const invalidPhase = structuredClone(snapshot)
  Object.defineProperty(invalidPhase, 'phase', { value: 'paused' })
  assert.throws(
    () =>
      restoreDuelSnapshot(
        invalidPhase,
        { id: 1, ...player },
        { id: 2, ...opponent },
      ),
    /phase is invalid/,
  )
  const invalidAction = structuredClone(snapshot)
  Object.defineProperty(invalidAction, 'playerAction', { value: 'wait' })
  assert.throws(
    () =>
      restoreDuelSnapshot(
        invalidAction,
        { id: 1, ...player },
        { id: 2, ...opponent },
      ),
    /action is invalid/,
  )
  assert.throws(
    () =>
      restoreDuelSnapshot(
        { ...snapshot, poll: { ...snapshot.poll, undecided: 99 } },
        { id: 1, ...player },
        { id: 2, ...opponent },
      ),
    /poll is invalid/,
  )
  assert.throws(
    () =>
      restoreDuelSnapshot(
        { ...snapshot, phase: 'settled' },
        { id: 1, ...player },
        { id: 2, ...opponent },
      ),
    /requires locked actions/,
  )
})
