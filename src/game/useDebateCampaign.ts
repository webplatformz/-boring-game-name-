import { useCallback, useEffect, useRef, useState } from 'react'
import { MEMBERS, MEMBERS_BY_ID, type Member } from '../data/members'
import { RARITY_ORDER } from '../theme'
import type { DebateAction } from './debate'
import {
  abandonCampaign,
  bankCampaign,
  CAMPAIGN_RARITIES,
  continueCampaign,
  settleCampaignStage,
  startCampaign,
  type CampaignCompletion,
  type CampaignState,
} from './debateCampaign'
import { createDuel, toDuelSnapshot, type DuelSnapshot } from './debateSession'
import { pickOpponentAtRarity } from './debateMatch'
import type { CampaignSnapshot } from './storage'
import {
  useDuelSession,
  type DuelSessionController,
  type SettledDuel,
} from './useDuelSession'
import type {
  CampaignWriteResult,
  DebateCampaignGateway,
} from './useGame'

export type CampaignCommand =
  | 'start'
  | 'checkpoint'
  | 'progress'
  | 'bank'
  | 'continue'
  | 'abandon'
  | 'outcome'

export interface DebateCampaignController {
  activeCampaign: CampaignSnapshot | null
  upsetVictorySeq: number
  result: CampaignCompletion | null
  failedCommand: CampaignCommand | null
  duel: DuelSessionController
  start: (playerCard: Member) => void
  chooseAction: (action: DebateAction) => void
  bank: () => void
  continue: () => void
  abandon: () => void
  retry: () => void
  dismissResult: () => void
  resume: () => void
  clearTransientState: () => void
}

interface PendingWrite {
  command: CampaignCommand
  retry: () => void
}

export function useDebateCampaign(
  gateway: DebateCampaignGateway,
): DebateCampaignController {
  const campaignRef = useRef(gateway.activeCampaign)
  const gatewayRef = useRef(gateway)
  const restoredId = useRef<string | null>(null)
  const pendingWrite = useRef<PendingWrite | null>(null)
  const [failedCommand, setFailedCommand] =
    useState<CampaignCommand | null>(null)
  const [result, setResult] = useState<CampaignCompletion | null>(null)
  const [upsetVictorySeq, setUpsetVictorySeq] = useState(0)

  gatewayRef.current = gateway
  if (gateway.activeCampaign) {
    campaignRef.current = gateway.activeCampaign
  } else if (!result && !pendingWrite.current) {
    campaignRef.current = null
  }

  const runWrite = useCallback(
    (
      command: CampaignCommand,
      write: () => CampaignWriteResult,
      onSuccess: () => void,
    ) => {
      const attempt = () => {
        const writeResult = write()
        if (!writeResult.ok) {
          pendingWrite.current = { command, retry: attempt }
          setFailedCommand(command)
          return
        }
        pendingWrite.current = null
        setFailedCommand(null)
        onSuccess()
      }
      attempt()
    },
    [],
  )

  const handleCheckpoint = useCallback((duel: DuelSnapshot): boolean => {
    const active = campaignRef.current
    if (!active) return false
    const next = { ...active, duel }
    const writeResult = gatewayRef.current.checkpointCampaign(next)
    if (!writeResult.ok) {
      setFailedCommand('checkpoint')
      return false
    }
    campaignRef.current = next
    setFailedCommand(null)
    return true
  }, [])

  const completeCampaign = useCallback(
    (
      completion: CampaignCompletion,
      stageResult: 'win' | 'loss' | null,
      upsetVictory = false,
    ) => {
      const active = campaignRef.current
      if (!active) return
      runWrite(
        completion.outcome === 'banked' ? 'bank' : 'outcome',
        () =>
          gatewayRef.current.commitCampaignOutcome({
            campaignId: active.id,
            expectedStageIndex: active.stageIndex,
            outcome: completion.outcome,
            stageResult,
            packs: completion.packs,
          }),
          () => {
            campaignRef.current = null
            if (completion.outcome === 'abandoned') duelRef.current?.clear()
            if (upsetVictory) setUpsetVictorySeq((value) => value + 1)
            setResult(completion)
          },
      )
    },
    [runWrite],
  )

  const handleSettled = useCallback(
    (settled: SettledDuel) => {
      const active = campaignRef.current
      if (!active) return
      const settledSnapshot: CampaignSnapshot = {
        ...active,
        duel: toDuelSnapshot(
          settled.playerCard.id,
          settled.oppCard.id,
          settled.session,
        ),
      }
      campaignRef.current = settledSnapshot
      const transition = settleCampaignStage(toCampaignState(settledSnapshot))
      const upsetVictory =
        settled.winner.winner === 'player' &&
        RARITY_ORDER.indexOf(settled.oppCard.ratings.rarity) >
          RARITY_ORDER.indexOf(settled.playerCard.ratings.rarity)
      if (transition.status === 'complete') {
        completeCampaign(
          transition.completion,
          transition.completion.outcome === 'completed' ? 'win' : 'loss',
          upsetVictory,
        )
        return
      }

      const next = toCampaignSnapshot(active.id, transition.state)
      runWrite(
        'progress',
        () =>
          gatewayRef.current.commitCampaignProgress({
            campaignId: active.id,
            expectedStageIndex: active.stageIndex,
            next,
            stageWin: CAMPAIGN_RARITIES[active.stageIndex],
          }),
          () => {
            campaignRef.current = next
            if (upsetVictory) setUpsetVictorySeq((value) => value + 1)
          },
      )
    },
    [completeCampaign, runWrite],
  )

  const duel = useDuelSession({
    onCheckpoint: handleCheckpoint,
    onSettled: handleSettled,
  })
  const duelRef = useRef<DuelSessionController | null>(null)
  duelRef.current = duel

  const restoreActiveCampaign = useCallback(() => {
    const active = gatewayRef.current.activeCampaign
    if (
      active &&
      restoredId.current === active.id &&
      (active.phase === 'awaiting-choice' ||
        duelRef.current?.state.session !== null)
    ) {
      return
    }
    campaignRef.current = active
    setResult(null)
    pendingWrite.current = null
    setFailedCommand(null)
    if (!active) {
      restoredId.current = null
      duelRef.current?.clear()
      return
    }
    restoredId.current = active.id
    const playerCard = MEMBERS_BY_ID.get(active.playerId)
    const opponentCard = MEMBERS_BY_ID.get(active.duel.opponentId)
    if (!playerCard || !opponentCard) return
    duelRef.current?.restore(playerCard, opponentCard, active.duel, {
      notifySettled: active.phase !== 'awaiting-choice',
    })
  }, [])

  useEffect(() => {
    const active = gateway.activeCampaign
    if (!active || restoredId.current === active.id) return
    restoreActiveCampaign()
  }, [gateway.activeCampaign, restoreActiveCampaign])

  const start = useCallback(
    (playerCard: Member) => {
      if (campaignRef.current || pendingWrite.current) return
      const opponent = pickOpponentAtRarity(
        MEMBERS,
        playerCard,
        CAMPAIGN_RARITIES[0],
      )
      const duelSession = createDuel(playerCard, opponent)
      const domain = startCampaign(
        playerCard.id,
        toDuelSnapshot(playerCard.id, opponent.id, duelSession),
      )
      const snapshot = toCampaignSnapshot(crypto.randomUUID(), domain)
      runWrite(
        'start',
        () => gatewayRef.current.startCampaign(snapshot),
        () => {
          campaignRef.current = snapshot
          restoredId.current = snapshot.id
          setResult(null)
          duel.start(playerCard, opponent)
        },
      )
    },
    [duel, runWrite],
  )

  const bank = useCallback(() => {
    const active = campaignRef.current
    if (!active || pendingWrite.current) return
    completeCampaign(bankCampaign(toCampaignState(active)), null)
  }, [completeCampaign])

  const continueToNextStage = useCallback(() => {
    const active = campaignRef.current
    if (
      !active ||
      active.phase !== 'awaiting-choice' ||
      pendingWrite.current
    ) {
      return
    }
    const playerCard = MEMBERS_BY_ID.get(active.playerId)
    if (!playerCard) return
    const nextStageIndex = active.stageIndex + 1
    const opponent = pickOpponentAtRarity(
      MEMBERS,
      playerCard,
      CAMPAIGN_RARITIES[nextStageIndex],
    )
    const duelSession = createDuel(playerCard, opponent)
    const nextState = continueCampaign(
      toCampaignState(active),
      toDuelSnapshot(playerCard.id, opponent.id, duelSession),
    )
    const next = toCampaignSnapshot(active.id, nextState)
    runWrite(
      'continue',
      () => gatewayRef.current.checkpointCampaign(next),
      () => {
        campaignRef.current = next
        duel.start(playerCard, opponent)
      },
    )
  }, [duel, runWrite])

  const abandon = useCallback(() => {
    const active = campaignRef.current
    if (!active || pendingWrite.current || duel.checkpointError) return
    completeCampaign(abandonCampaign(toCampaignState(active)), null)
  }, [completeCampaign, duel.checkpointError])

  const retry = useCallback(() => {
    if (duel.checkpointError) {
      duel.retryCheckpoint()
      return
    }
    pendingWrite.current?.retry()
  }, [duel])

  const dismissResult = useCallback(() => {
    duelRef.current?.clear()
    setResult(null)
  }, [])

  const clearTransientState = useCallback(() => {
    duelRef.current?.clear()
    pendingWrite.current = null
    setFailedCommand(null)
    setResult(null)
    restoredId.current = null
  }, [])

  return {
    activeCampaign: gateway.activeCampaign,
    upsetVictorySeq,
    result,
    failedCommand:
      failedCommand ?? (duel.checkpointError ? 'checkpoint' : null),
    duel,
    start,
    chooseAction: duel.chooseAction,
    bank,
    continue: continueToNextStage,
    abandon,
    retry,
    dismissResult,
    resume: restoreActiveCampaign,
    clearTransientState,
  }
}

function toCampaignState(snapshot: CampaignSnapshot): CampaignState {
  return {
    playerId: snapshot.playerId,
    stageIndex: snapshot.stageIndex,
    phase: snapshot.phase,
    unbankedPacks: snapshot.unbankedPacks,
    duel: snapshot.duel,
  }
}

function toCampaignSnapshot(
  id: string,
  state: CampaignState,
): CampaignSnapshot {
  return {
    version: 1,
    id,
    ...state,
  }
}
