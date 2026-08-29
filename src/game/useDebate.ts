import { useCallback, useState } from 'react'
import { MEMBERS_BY_ID, type Member } from '../data/members'
import type { DebateAction, PollState, PollWinner } from './debate'
import type {
  CompletedDebateTurn,
  DuelPhase,
} from './debateSession'
import type { CampaignCompletion } from './debateCampaign'
import type { CampaignSnapshot, DebateRecord } from './storage'
import {
  DEBATE_RESULT_MS,
  DEBATE_SUSPENSE_MS,
} from './useDuelSession'
import {
  useDebateCampaign,
  type CampaignCommand,
} from './useDebateCampaign'
import type { DebateCampaignGateway } from './useGame'
import { useTrainingDebate } from './useTrainingDebate'

export { DEBATE_RESULT_MS, DEBATE_SUSPENSE_MS }
export type { CompletedDebateTurn }

export type DebateStep = 'pick' | 'fight' | 'reveal' | 'result'

interface DebateViewBase {
  record: DebateRecord
}

export type DebateViewState =
  | (DebateViewBase & { view: 'pick' })
  | (DebateViewBase & {
      view: 'choose-mode'
      playerCard: Member
      campaignAvailability: number
    })
  | (DebateViewBase & {
      view: 'duel'
      mode: 'training' | 'campaign'
      campaign: CampaignSnapshot | null
      campaignResult: CampaignCompletion | null
      step: Exclude<DebateStep, 'pick'>
      playerCard: Member
      oppCard: Member
      playerAction: DebateAction | null
      oppAction: DebateAction | null
      poll: PollState
      lastTurn: CompletedDebateTurn | null
      turn: number
      winner: PollWinner | null
    })
  | (DebateViewBase & {
      view: 'campaign-loading'
      campaign: CampaignSnapshot
    })
  | (DebateViewBase & {
      view: 'campaign-choice'
      campaign: CampaignSnapshot
      playerCard: Member
    })
  | (DebateViewBase & {
      view: 'campaign-result'
      result: CampaignCompletion
    })
  | (DebateViewBase & {
      view: 'campaign-storage-error'
      command: CampaignCommand
    })

export interface DuelViewModel {
  step: Exclude<DebateStep, 'pick'>
  playerCard: Member
  oppCard: Member
  playerAction: DebateAction | null
  oppAction: DebateAction | null
  poll: PollState
  lastTurn: CompletedDebateTurn | null
  turn: number
  winner: PollWinner | null
}

export interface Debate {
  state: DebateViewState
  campaignUpsetVictorySeq: number
  pickPlayerCard: (member: Member) => void
  startTraining: () => void
  startCampaign: () => void
  chooseAnotherCard: () => void
  chooseAction: (action: DebateAction) => void
  bankCampaign: () => void
  continueCampaign: () => void
  abandonCampaign: () => void
  retryCampaignWrite: () => void
  dismissCampaignResult: () => void
  enter: () => void
  reset: () => void
}

function stepFromPhase(
  phase: DuelPhase,
): Exclude<DebateStep, 'pick'> {
  if (phase === 'revealing') return 'reveal'
  if (phase === 'settled') return 'result'
  return 'fight'
}

export function useDebate(gateway: DebateCampaignGateway): Debate {
  const training = useTrainingDebate()
  const campaign = useDebateCampaign(gateway)
  const {
    pickPlayerCard: startTrainingDuel,
    chooseAction: chooseTrainingAction,
    reset: resetTraining,
  } = training
  const {
    start: startCampaignDuel,
    chooseAction: chooseCampaignAction,
    clearTransientState,
  } = campaign
  const [pendingPlayerCard, setPendingPlayerCard] = useState<Member | null>(null)
  const session = training.duel.state.session
  const playerCard = training.duel.state.playerCard
  const oppCard = training.duel.state.oppCard

  const pickPlayerCard = useCallback((member: Member) => {
    setPendingPlayerCard(member)
  }, [])

  const chooseAnotherCard = useCallback(() => {
    setPendingPlayerCard(null)
  }, [])

  const startTraining = useCallback(() => {
    if (!pendingPlayerCard || campaign.activeCampaign) return
    startTrainingDuel(pendingPlayerCard)
    setPendingPlayerCard(null)
  }, [campaign.activeCampaign, pendingPlayerCard, startTrainingDuel])

  const startCampaign = useCallback(() => {
    if (!pendingPlayerCard || campaign.activeCampaign) return
    startCampaignDuel(pendingPlayerCard)
    setPendingPlayerCard(null)
  }, [campaign.activeCampaign, pendingPlayerCard, startCampaignDuel])

  const chooseAction = useCallback(
    (action: DebateAction) => {
      if (campaign.activeCampaign?.phase === 'in-duel') {
        chooseCampaignAction(action)
      } else {
        chooseTrainingAction(action)
      }
    },
    [
      campaign.activeCampaign?.phase,
      chooseCampaignAction,
      chooseTrainingAction,
    ],
  )

  const reset = useCallback(() => {
    setPendingPlayerCard(null)
    resetTraining()
    clearTransientState()
  }, [clearTransientState, resetTraining])

  let state: DebateViewState
  const campaignSession = campaign.duel.state.session
  const campaignPlayerCard = campaign.duel.state.playerCard
  const campaignOpponentCard = campaign.duel.state.oppCard
  if (campaign.failedCommand) {
    state = {
      view: 'campaign-storage-error',
      record: training.record,
      command: campaign.failedCommand,
    }
  } else if (
    (campaign.activeCampaign || campaign.result) &&
    campaignSession &&
    campaignPlayerCard &&
    campaignOpponentCard
  ) {
    state = {
      view: 'duel',
      mode: 'campaign',
      campaign: campaign.activeCampaign,
      campaignResult: campaign.result,
      step: stepFromPhase(campaignSession.phase),
      record: training.record,
      playerCard: campaignPlayerCard,
      oppCard: campaignOpponentCard,
      playerAction: campaignSession.playerAction,
      oppAction: campaignSession.oppAction,
      poll: campaignSession.poll,
      lastTurn: campaignSession.lastTurn,
      turn: campaignSession.turn,
      winner: campaignSession.winner,
    }
  } else if (campaign.result) {
    state = {
      view: 'campaign-result',
      record: training.record,
      result: campaign.result,
    }
  } else if (campaign.activeCampaign?.phase === 'awaiting-choice') {
    const resolvedPlayer = MEMBERS_BY_ID.get(
      campaign.activeCampaign.playerId,
    )
    if (!resolvedPlayer) {
      state = {
        view: 'campaign-loading',
        record: training.record,
        campaign: campaign.activeCampaign,
      }
    } else {
      state = {
        view: 'campaign-choice',
        record: training.record,
        campaign: campaign.activeCampaign,
        playerCard: resolvedPlayer,
      }
    }
  } else if (
    campaign.activeCampaign &&
    campaignSession &&
    campaignPlayerCard &&
    campaignOpponentCard
  ) {
    state = {
      view: 'duel',
      mode: 'campaign',
      campaign: campaign.activeCampaign,
      campaignResult: null,
      step: stepFromPhase(campaignSession.phase),
      record: training.record,
      playerCard: campaignPlayerCard,
      oppCard: campaignOpponentCard,
      playerAction: campaignSession.playerAction,
      oppAction: campaignSession.oppAction,
      poll: campaignSession.poll,
      lastTurn: campaignSession.lastTurn,
      turn: campaignSession.turn,
      winner: campaignSession.winner,
    }
  } else if (campaign.activeCampaign) {
    state = {
      view: 'campaign-loading',
      record: training.record,
      campaign: campaign.activeCampaign,
    }
  } else if (session && playerCard && oppCard) {
    state = {
      view: 'duel',
      mode: 'training',
      campaign: null,
      campaignResult: null,
      step: stepFromPhase(session.phase),
      record: training.record,
      playerCard,
      oppCard,
      playerAction: session.playerAction,
      oppAction: session.oppAction,
      poll: session.poll,
      lastTurn: session.lastTurn,
      turn: session.turn,
      winner: session.winner,
    }
  } else if (pendingPlayerCard) {
    state = {
      view: 'choose-mode',
      record: training.record,
      playerCard: pendingPlayerCard,
      campaignAvailability: gateway.campaignAvailability(
        pendingPlayerCard.id,
      ),
    }
  } else {
    state = { view: 'pick', record: training.record }
  }

  return {
    state,
    campaignUpsetVictorySeq: campaign.upsetVictorySeq,
    pickPlayerCard,
    startTraining,
    startCampaign,
    chooseAnotherCard,
    chooseAction,
    bankCampaign: campaign.bank,
    continueCampaign: campaign.continue,
    abandonCampaign: campaign.abandon,
    retryCampaignWrite: campaign.retry,
    dismissCampaignResult: campaign.dismissResult,
    enter: campaign.resume,
    reset,
  }
}
