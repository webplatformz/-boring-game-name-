import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDebateFeedbackKey,
  getPollDeltas,
} from '../src/game/debateFeedback.ts'
import type { DebateCard, PollState } from '../src/game/debate.ts'

const card = (atk: number, def: number): DebateCard => ({
  ratings: { atk, def, ovr: 70 },
})

test('classifies every Debate action matchup without player-specific copy', () => {
  assert.equal(
    getDebateFeedbackKey(card(50, 80), 'defend', card(50, 60), 'defend'),
    'debateFeedbackDefendLead',
  )
  assert.equal(
    getDebateFeedbackKey(card(50, 60), 'defend', card(50, 60), 'defend'),
    'debateFeedbackDefendTie',
  )
  assert.equal(
    getDebateFeedbackKey(card(80, 50), 'attack', card(60, 50), 'attack'),
    'debateFeedbackAttackRace',
  )
  assert.equal(
    getDebateFeedbackKey(card(60, 50), 'attack', card(60, 50), 'attack'),
    'debateFeedbackAttackRaceTie',
  )
  assert.equal(
    getDebateFeedbackKey(card(80, 50), 'attack', card(50, 60), 'defend'),
    'debateFeedbackAttackWin',
  )
  assert.equal(
    getDebateFeedbackKey(card(60, 50), 'attack', card(50, 60), 'defend'),
    'debateFeedbackAttackTie',
  )
  assert.equal(
    getDebateFeedbackKey(card(50, 50), 'attack', card(50, 70), 'defend'),
    'debateFeedbackDefenseWin',
  )
})

test('reports signed poll changes in visual bucket order', () => {
  const before: PollState = {
    firmPlayer: 0,
    ratherPlayer: 20,
    undecided: 60,
    ratherOpponent: 20,
    firmOpponent: 0,
  }
  const after: PollState = {
    firmPlayer: 10,
    ratherPlayer: 15,
    undecided: 55,
    ratherOpponent: 15,
    firmOpponent: 5,
  }
  assert.deepEqual(getPollDeltas(before, after), [
    { bucket: 'firmPlayer', amount: 10 },
    { bucket: 'ratherPlayer', amount: -5 },
    { bucket: 'undecided', amount: -5 },
    { bucket: 'ratherOpponent', amount: -5 },
    { bucket: 'firmOpponent', amount: 5 },
  ])
})
