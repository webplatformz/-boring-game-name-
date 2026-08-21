import assert from 'node:assert/strict'
import test from 'node:test'
import {
  checkWin,
  INITIAL_POLL,
  resolveTurn,
  type DebateAction,
  type DebateCard,
  type PollState,
} from '../src/game/debate.ts'

const card = (atk: number, def: number, ovr: number): DebateCard => ({
  ratings: { atk, def, ovr },
})

const neutral = (
  ratherPlayer: number,
  undecided: number,
  ratherOpponent: number,
): PollState => ({
  firmPlayer: 0,
  ratherPlayer,
  undecided,
  ratherOpponent,
  firmOpponent: 0,
})

const mirrorPoll = (poll: PollState): PollState => ({
  firmPlayer: poll.firmOpponent,
  ratherPlayer: poll.ratherOpponent,
  undecided: poll.undecided,
  ratherOpponent: poll.ratherPlayer,
  firmOpponent: poll.firmPlayer,
})

function assertMirroredTurn(
  poll: PollState,
  playerCard: DebateCard,
  playerAction: DebateAction,
  oppCard: DebateCard,
  oppAction: DebateAction,
): void {
  const result = resolveTurn(
    poll,
    playerCard,
    playerAction,
    oppCard,
    oppAction,
  )
  const mirrored = resolveTurn(
    mirrorPoll(poll),
    oppCard,
    oppAction,
    playerCard,
    playerAction,
  )
  assert.deepEqual(mirrored, mirrorPoll(result))
}

test('INITIAL_POLL starts tied OVR cards fully undecided', () => {
  assert.deepEqual(INITIAL_POLL(card(70, 70, 80), card(60, 60, 80)), neutral(0, 100, 0))
})

test('INITIAL_POLL leans toward either higher-OVR card and caps the lean', () => {
  assert.deepEqual(INITIAL_POLL(card(70, 70, 90), card(70, 70, 70)), neutral(10, 90, 0))
  assert.deepEqual(INITIAL_POLL(card(70, 70, 50), card(70, 70, 90)), neutral(0, 85, 15))
})

test('DEF/DEF secures both sides and gives the higher DEF a boosted trickle', () => {
  const poll = neutral(20, 60, 20)
  const player = card(50, 80, 70)
  const opponent = card(50, 60, 70)
  assert.deepEqual(resolveTurn(poll, player, 'defend', opponent, 'defend'), {
    firmPlayer: 20,
    ratherPlayer: 8,
    undecided: 52,
    ratherOpponent: 5,
    firmOpponent: 15,
  })
  assertMirroredTurn(poll, player, 'defend', opponent, 'defend')
})

test('a successful attack destabilizes, recruits, then allows baseline securing', () => {
  const poll = neutral(10, 60, 30)
  const attacker = card(80, 50, 70)
  const defender = card(50, 60, 70)
  assert.deepEqual(resolveTurn(poll, attacker, 'attack', defender, 'defend'), {
    firmPlayer: 0,
    ratherPlayer: 15,
    undecided: 60,
    ratherOpponent: 10,
    firmOpponent: 15,
  })
  assertMirroredTurn(poll, attacker, 'attack', defender, 'defend')
})

test('a tied attack recruits a smaller flat amount before baseline securing', () => {
  const poll = neutral(0, 80, 20)
  const attacker = card(60, 50, 70)
  const defender = card(50, 60, 70)
  assert.deepEqual(resolveTurn(poll, attacker, 'attack', defender, 'defend'), {
    firmPlayer: 0,
    ratherPlayer: 8,
    undecided: 72,
    ratherOpponent: 5,
    firmOpponent: 15,
  })
})

test('a repelled attack uses pre-turn undecided for recruit strength', () => {
  const poll = neutral(20, 50, 30)
  const attacker = card(50, 50, 70)
  const defender = card(50, 70, 70)
  assert.deepEqual(resolveTurn(poll, attacker, 'attack', defender, 'defend'), {
    firmPlayer: 0,
    ratherPlayer: 15,
    undecided: 50,
    ratherOpponent: 12,
    firmOpponent: 23,
  })
  assertMirroredTurn(poll, attacker, 'attack', defender, 'defend')
})

test('ATK/ATK splits scarce undecided proportionally and symmetrically', () => {
  const poll = neutral(45, 10, 45)
  const player = card(80, 50, 70)
  const opponent = card(60, 50, 70)
  assert.deepEqual(resolveTurn(poll, player, 'attack', opponent, 'attack'), {
    firmPlayer: 0,
    ratherPlayer: 51,
    undecided: 0,
    ratherOpponent: 49,
    firmOpponent: 0,
  })
  assertMirroredTurn(poll, player, 'attack', opponent, 'attack')
})

test('ATK/ATK assigns an exact proportional remainder by OVR', () => {
  const poll = neutral(45, 10, 45)
  const player = card(60, 50, 80)
  const opponent = card(20, 50, 70)
  assert.deepEqual(resolveTurn(poll, player, 'attack', opponent, 'attack'), {
    firmPlayer: 0,
    ratherPlayer: 53,
    undecided: 0,
    ratherOpponent: 47,
    firmOpponent: 0,
  })
  assertMirroredTurn(poll, player, 'attack', opponent, 'attack')
})

test('ATK/ATK assigns an OVR-tied proportional remainder by injected coin flip', () => {
  const poll = neutral(47, 5, 48)
  const player = card(60, 50, 70)
  const opponent = card(60, 50, 70)
  assert.deepEqual(
    resolveTurn(poll, player, 'attack', opponent, 'attack', {
      random: () => 0.25,
    }),
    {
      firmPlayer: 0,
      ratherPlayer: 50,
      undecided: 0,
      ratherOpponent: 50,
      firmOpponent: 0,
    },
  )
  assert.deepEqual(
    resolveTurn(poll, player, 'attack', opponent, 'attack', {
      random: () => 0.75,
    }),
    {
      firmPlayer: 0,
      ratherPlayer: 49,
      undecided: 0,
      ratherOpponent: 51,
      firmOpponent: 0,
    },
  )
})

test('checkWin ends immediately on a majority', () => {
  const poll = neutral(51, 40, 9)
  assert.deepEqual(checkWin(poll, 2, 5, card(50, 50, 50), card(50, 50, 50)), {
    winner: 'player',
    majority: true,
  })
})

test('checkWin waits until the limit, then uses total support', () => {
  const poll = neutral(45, 20, 35)
  const player = card(50, 50, 50)
  const opponent = card(50, 50, 50)
  assert.equal(checkWin(poll, 4, 5, player, opponent), null)
  assert.deepEqual(checkWin(poll, 5, 5, player, opponent), {
    winner: 'player',
    majority: false,
  })
})

test('checkWin breaks a support tie by OVR, then injected randomness', () => {
  const poll = neutral(40, 20, 40)
  assert.deepEqual(checkWin(poll, 5, 5, card(50, 50, 80), card(50, 50, 70)), {
    winner: 'player',
    majority: false,
  })
  assert.deepEqual(
    checkWin(poll, 5, 5, card(50, 50, 70), card(50, 50, 70), {
      random: () => 0.75,
    }),
    { winner: 'opponent', majority: false },
  )
})

test('resolves a full five-turn debate chain before applying the final tie-break', () => {
  const player = card(4, 4, 70)
  const opponent = card(4, 4, 70)
  let poll = INITIAL_POLL(player, opponent)

  for (let turn = 1; turn <= 5; turn++) {
    poll = resolveTurn(poll, player, 'attack', opponent, 'attack')
    const winner = checkWin(poll, turn, 5, player, opponent, {
      random: () => 0.25,
    })
    if (turn < 5) assert.equal(winner, null)
    else assert.deepEqual(winner, { winner: 'player', majority: false })
  }

  assert.deepEqual(poll, neutral(5, 90, 5))
})

test('resolveTurn rejects malformed polls instead of hiding arithmetic errors', () => {
  const malformed = { ...neutral(0, 100, 0), undecided: 99 }
  assert.throws(
    () => resolveTurn(malformed, card(50, 50, 50), 'attack', card(50, 50, 50), 'attack'),
    /total 100/,
  )
})
