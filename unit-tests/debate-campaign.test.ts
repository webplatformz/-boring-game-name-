import assert from 'node:assert/strict'
import test from 'node:test'
import {
  abandonCampaign,
  bankCampaign,
  CAMPAIGN_RARITIES,
  campaignAllowance,
  campaignStagePacks,
  campaignTotalAfterWin,
  continueCampaign,
  nextLocalMidnight,
  settleCampaignStage,
  startCampaign,
  type CampaignStageIndex,
  type CampaignState,
} from '../src/game/debateCampaign.ts'
import {
  createDuel,
  toDuelSnapshot,
  type DuelSnapshot,
} from '../src/game/debateSession.ts'
import type { DebateCard, PollWinner } from '../src/game/debate.ts'

const player: DebateCard = { ratings: { atk: 70, def: 70, ovr: 70 } }
const opponent: DebateCard = { ratings: { atk: 60, def: 60, ovr: 60 } }

function freshDuel(stageIndex: CampaignStageIndex): DuelSnapshot {
  return toDuelSnapshot(
    1,
    stageIndex + 10,
    createDuel(player, opponent),
  )
}

function settled(
  state: CampaignState,
  winner: PollWinner['winner'],
): CampaignState {
  const result: PollWinner = { winner, majority: true }
  return {
    ...state,
    duel: {
      ...state.duel,
      phase: 'settled',
      playerAction: 'attack',
      oppAction: 'defend',
      lastTurn: {
        pollBefore: state.duel.poll,
        poll: state.duel.poll,
        playerAction: 'attack',
        oppAction: 'defend',
      },
      winner: result,
    },
  }
}

test('campaign reward table produces 1, 3, 6, 10, 15, and 21 packs', () => {
  assert.deepEqual(
    CAMPAIGN_RARITIES.map((_, index) =>
      campaignStagePacks(index as CampaignStageIndex),
    ),
    [1, 2, 3, 4, 5, 6],
  )
  assert.deepEqual(
    CAMPAIGN_RARITIES.map((_, index) =>
      campaignTotalAfterWin(index as CampaignStageIndex),
    ),
    [1, 3, 6, 10, 15, 21],
  )
})

test('campaign progresses through every rarity and auto-completes at mythic', () => {
  let state = startCampaign(1, freshDuel(0))

  for (let stage = 0; stage < CAMPAIGN_RARITIES.length; stage++) {
    const transition = settleCampaignStage(settled(state, 'player'))
    if (stage === CAMPAIGN_RARITIES.length - 1) {
      assert.equal(transition.status, 'complete')
      if (transition.status === 'complete') {
        assert.deepEqual(transition.completion, {
          outcome: 'completed',
          playerId: 1,
          stageIndex: 5,
          rarity: 'mythic',
          packs: 21,
          stageWinner: 'player',
        })
      }
      return
    }

    assert.equal(transition.status, 'active')
    if (transition.status !== 'active') return
    assert.equal(transition.state.phase, 'awaiting-choice')
    assert.equal(
      transition.state.unbankedPacks,
      campaignTotalAfterWin(stage as CampaignStageIndex),
    )
    state = continueCampaign(
      transition.state,
      freshDuel((stage + 1) as CampaignStageIndex),
    )
  }
})

test('bank pays the accumulated total while loss and abandon pay zero', () => {
  const commonWin = settleCampaignStage(
    settled(startCampaign(1, freshDuel(0)), 'player'),
  )
  assert.equal(commonWin.status, 'active')
  if (commonWin.status !== 'active') return

  assert.equal(bankCampaign(commonWin.state).packs, 1)
  const loss = settleCampaignStage(
    settled(continueCampaign(commonWin.state, freshDuel(1)), 'opponent'),
  )
  assert.equal(loss.status, 'complete')
  if (loss.status === 'complete') {
    assert.deepEqual(loss.completion, {
      outcome: 'lost',
      playerId: 1,
      stageIndex: 1,
      rarity: 'uncommon',
      packs: 0,
      stageWinner: 'opponent',
    })
  }
  assert.equal(abandonCampaign(commonWin.state).packs, 0)
})

test('campaign rejects invalid transitions and reward totals', () => {
  const started = startCampaign(1, freshDuel(0))
  assert.throws(() => bankCampaign(started), /only be banked/)
  assert.throws(
    () => continueCampaign(started, freshDuel(1)),
    /only continue after a stage win/,
  )
  assert.throws(
    () =>
      bankCampaign({
        ...settled(started, 'player'),
        phase: 'awaiting-choice',
        unbankedPacks: 2,
      }),
    /reward total/,
  )
})

test('campaign allowance accounts for exhausted copies and one reservation', () => {
  assert.equal(campaignAllowance(3, 1, false), 2)
  assert.equal(campaignAllowance(3, 1, true), 1)
  assert.equal(campaignAllowance(1, 3, false), 0)
  assert.throws(() => campaignAllowance(-1, 0, false), /non-negative/)
})

test('nextLocalMidnight returns the next local calendar boundary', () => {
  const now = new Date(2026, 7, 29, 23, 59, 30, 500)
  const expected = new Date(2026, 7, 30, 0, 0, 0, 0)
  assert.equal(nextLocalMidnight(now), expected.getTime())
  assert.throws(() => nextLocalMidnight(new Date(Number.NaN)), /valid date/)
})
