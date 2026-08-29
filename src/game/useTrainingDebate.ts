import { useCallback, useRef, useState } from 'react'
import { MEMBERS, type Member } from '../data/members'
import { RARITY_ORDER } from '../theme'
import type { DebateAction } from './debate'
import { pickOpponentFrom } from './debateMatch'
import type { DebateRecord } from './storage'
import { loadDebateRecord, persistDebateRecord } from './storage'
import {
  useDuelSession,
  type DuelSessionController,
  type SettledDuel,
} from './useDuelSession'

export interface TrainingDebateController {
  record: DebateRecord
  duel: DuelSessionController
  pickPlayerCard: (member: Member) => void
  chooseAction: (action: DebateAction) => void
  reset: () => void
}

export function useTrainingDebate(): TrainingDebateController {
  const [record, setRecord] = useState<DebateRecord>(() =>
    loadDebateRecord(),
  )
  const recordRef = useRef(record)
  recordRef.current = record

  const handleSettled = useCallback((duel: SettledDuel) => {
    const current = recordRef.current
    const majorityWins =
      current.majorityWins +
      (duel.winner.winner === 'player' && duel.winner.majority ? 1 : 0)
    const turnLimitWins =
      current.turnLimitWins +
      (duel.winner.winner === 'player' && !duel.winner.majority ? 1 : 0)
    const next: DebateRecord = {
      wins: majorityWins + turnLimitWins,
      losses:
        current.losses + (duel.winner.winner === 'opponent' ? 1 : 0),
      majorityWins,
      turnLimitWins,
    }
    persistDebateRecord(next)
    recordRef.current = next
    setRecord(next)
  }, [])

  const duel = useDuelSession({ onSettled: handleSettled })
  const startDuel = duel.start

  const pickPlayerCard = useCallback(
    (member: Member) => {
      const oppCard = pickOpponentFrom(MEMBERS, member, RARITY_ORDER)
      startDuel(member, oppCard)
    },
    [startDuel],
  )

  return {
    record,
    duel,
    pickPlayerCard,
    chooseAction: duel.chooseAction,
    reset: duel.clear,
  }
}
