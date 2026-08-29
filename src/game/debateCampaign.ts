import type { PollWinner } from './debate'
import type { DuelSnapshot } from './debateSession'
import type { RarityKey } from '../theme'

export const CAMPAIGN_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'ultra',
  'legend',
  'mythic',
] as const satisfies readonly RarityKey[]

export type CampaignStageIndex = 0 | 1 | 2 | 3 | 4 | 5
export type CampaignPhase = 'in-duel' | 'awaiting-choice'
export type CampaignOutcome = 'banked' | 'lost' | 'abandoned' | 'completed'

export interface CampaignState {
  playerId: number
  stageIndex: CampaignStageIndex
  phase: CampaignPhase
  unbankedPacks: number
  duel: DuelSnapshot
}

export interface CampaignCompletion {
  outcome: CampaignOutcome
  playerId: number
  stageIndex: CampaignStageIndex
  rarity: RarityKey
  packs: number
  stageWinner: PollWinner['winner'] | null
}

export type CampaignTransition =
  | { status: 'active'; state: CampaignState }
  | { status: 'complete'; completion: CampaignCompletion }

export function campaignStagePacks(stageIndex: CampaignStageIndex): number {
  return stageIndex + 1
}

export function campaignTotalAfterWin(
  stageIndex: CampaignStageIndex,
): number {
  return ((stageIndex + 1) * (stageIndex + 2)) / 2
}

export function startCampaign(
  playerId: number,
  duel: DuelSnapshot,
): CampaignState {
  if (duel.playerId !== playerId) {
    throw new Error('Campaign duel must use the selected player card')
  }
  assertDuelStage(duel, 0)
  return {
    playerId,
    stageIndex: 0,
    phase: 'in-duel',
    unbankedPacks: 0,
    duel,
  }
}

export function settleCampaignStage(
  state: CampaignState,
): CampaignTransition {
  assertCampaignState(state)
  if (state.phase !== 'in-duel' || state.duel.phase !== 'settled') {
    throw new Error('Campaign stage must be settled before applying its result')
  }
  const winner = state.duel.winner
  if (!winner) {
    throw new Error('Settled campaign duel requires a winner')
  }
  if (winner.winner === 'opponent') {
    return {
      status: 'complete',
      completion: completion(state, 'lost', 0, 'opponent'),
    }
  }

  const unbankedPacks = campaignTotalAfterWin(state.stageIndex)
  if (state.stageIndex === CAMPAIGN_RARITIES.length - 1) {
    return {
      status: 'complete',
      completion: completion(
        state,
        'completed',
        unbankedPacks,
        'player',
      ),
    }
  }
  return {
    status: 'active',
    state: {
      ...state,
      phase: 'awaiting-choice',
      unbankedPacks,
    },
  }
}

export function continueCampaign(
  state: CampaignState,
  duel: DuelSnapshot,
): CampaignState {
  assertCampaignState(state)
  if (state.phase !== 'awaiting-choice') {
    throw new Error('Campaign can only continue after a stage win')
  }
  const stageIndex = (state.stageIndex + 1) as CampaignStageIndex
  if (stageIndex >= CAMPAIGN_RARITIES.length) {
    throw new Error('Campaign cannot continue beyond mythic')
  }
  if (duel.playerId !== state.playerId) {
    throw new Error('Campaign must retain the selected player card')
  }
  assertDuelStage(duel, stageIndex)
  return {
    ...state,
    stageIndex,
    phase: 'in-duel',
    duel,
  }
}

export function bankCampaign(state: CampaignState): CampaignCompletion {
  assertCampaignState(state)
  if (state.phase !== 'awaiting-choice') {
    throw new Error('Campaign rewards can only be banked after a stage win')
  }
  return completion(state, 'banked', state.unbankedPacks, 'player')
}

export function abandonCampaign(state: CampaignState): CampaignCompletion {
  assertCampaignState(state)
  return completion(state, 'abandoned', 0, null)
}

export function campaignAllowance(
  ownedCopies: number,
  exhaustedCopies: number,
  activeReservation: boolean,
): number {
  assertCount(ownedCopies, 'owned copies')
  assertCount(exhaustedCopies, 'exhausted copies')
  return Math.max(
    0,
    ownedCopies - exhaustedCopies - (activeReservation ? 1 : 0),
  )
}

export function nextLocalMidnight(now: Date): number {
  if (Number.isNaN(now.getTime())) {
    throw new Error('A valid date is required')
  }
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime()
}

function assertCampaignState(state: CampaignState): void {
  if (
    !Number.isInteger(state.stageIndex) ||
    state.stageIndex < 0 ||
    state.stageIndex >= CAMPAIGN_RARITIES.length
  ) {
    throw new Error('Campaign stage is invalid')
  }
  if (state.duel.playerId !== state.playerId) {
    throw new Error('Campaign duel must use the selected player card')
  }
  if (
    state.phase === 'awaiting-choice' &&
    (state.duel.phase !== 'settled' ||
      state.duel.winner?.winner !== 'player')
  ) {
    throw new Error('Campaign choice requires a settled stage win')
  }
  const expectedPacks =
    state.phase === 'awaiting-choice'
      ? campaignTotalAfterWin(state.stageIndex)
      : state.stageIndex === 0
        ? 0
        : campaignTotalAfterWin(
            (state.stageIndex - 1) as CampaignStageIndex,
          )
  if (state.unbankedPacks !== expectedPacks) {
    throw new Error('Campaign reward total does not match its stage')
  }
}

function assertDuelStage(
  duel: DuelSnapshot,
  stageIndex: CampaignStageIndex,
): void {
  if (duel.phase !== 'awaiting-action') {
    throw new Error('A new campaign stage requires a fresh duel')
  }
  if (
    duel.turn !== 1 ||
    duel.playerAction !== null ||
    duel.oppAction !== null ||
    duel.lastTurn !== null ||
    duel.winner !== null
  ) {
    throw new Error('A new campaign stage requires an untouched duel')
  }
  if (stageIndex < 0 || stageIndex >= CAMPAIGN_RARITIES.length) {
    throw new Error('Campaign stage is invalid')
  }
}

function completion(
  state: CampaignState,
  outcome: CampaignOutcome,
  packs: number,
  stageWinner: PollWinner['winner'] | null,
): CampaignCompletion {
  return {
    outcome,
    playerId: state.playerId,
    stageIndex: state.stageIndex,
    rarity: CAMPAIGN_RARITIES[state.stageIndex],
    packs,
    stageWinner,
  }
}

function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`)
  }
}
