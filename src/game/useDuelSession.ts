import { useCallback, useEffect, useRef, useState } from 'react'
import type { Member } from '../data/members'
import type { DebateAction, PollWinner } from './debate'
import {
  createDuel,
  reduceDuel,
  restoreDuelSnapshot,
  toDuelSnapshot,
  type DuelContext,
  type DuelSession,
  type DuelSnapshot,
} from './debateSession'
import { chooseAiAction } from './debateMatch'

/** Delay before both selected actions are revealed. */
export const DEBATE_SUSPENSE_MS = 900
/** Delay between revealing the turn and advancing or showing the result. */
export const DEBATE_RESULT_MS = 1800

export interface DuelSessionState {
  playerCard: Member | null
  oppCard: Member | null
  session: DuelSession | null
}

export interface SettledDuel {
  playerCard: Member
  oppCard: Member
  session: DuelSession
  winner: PollWinner
}

interface UseDuelSessionOptions {
  chooseOpponentAction?: (card: Member) => DebateAction
  onCheckpoint?: (snapshot: DuelSnapshot) => boolean
  onSettled?: (duel: SettledDuel) => void
}

export interface DuelSessionController {
  state: DuelSessionState
  checkpointError: boolean
  start: (playerCard: Member, oppCard: Member) => void
  restore: (
    playerCard: Member,
    oppCard: Member,
    snapshot: DuelSnapshot,
    options?: { notifySettled?: boolean },
  ) => void
  chooseAction: (action: DebateAction) => void
  retryCheckpoint: () => void
  clear: () => void
}

const EMPTY_STATE: DuelSessionState = {
  playerCard: null,
  oppCard: null,
  session: null,
}

export function useDuelSession(
  options: UseDuelSessionOptions = {},
): DuelSessionController {
  const [state, setState] = useState<DuelSessionState>(EMPTY_STATE)
  const [checkpointError, setCheckpointError] = useState(false)
  const stateRef = useRef(state)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const generation = useRef(0)
  const actionLocked = useRef(false)
  const pendingCheckpoint = useRef<{
    next: DuelSessionState
    onSuccess: () => void
  } | null>(null)
  const onCheckpointRef = useRef(options.onCheckpoint)
  const onSettledRef = useRef(options.onSettled)
  const chooseOpponentActionRef = useRef(
    options.chooseOpponentAction ?? chooseAiAction,
  )
  onCheckpointRef.current = options.onCheckpoint
  onSettledRef.current = options.onSettled
  chooseOpponentActionRef.current =
    options.chooseOpponentAction ?? chooseAiAction

  const replace = useCallback((next: DuelSessionState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const cancelTimers = useCallback(() => {
    generation.current += 1
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const after = useCallback((ms: number, fn: () => void) => {
    const scheduledGeneration = generation.current
    const id = setTimeout(() => {
      timers.current = timers.current.filter((timer) => timer !== id)
      if (generation.current !== scheduledGeneration) return
      fn()
    }, ms)
    timers.current.push(id)
  }, [])

  useEffect(() => cancelTimers, [cancelTimers])

  const clear = useCallback(() => {
    cancelTimers()
    actionLocked.current = false
    pendingCheckpoint.current = null
    setCheckpointError(false)
    replace(EMPTY_STATE)
  }, [cancelTimers, replace])

  const start = useCallback(
    (playerCard: Member, oppCard: Member) => {
      cancelTimers()
      actionLocked.current = false
      pendingCheckpoint.current = null
      setCheckpointError(false)
      replace({
        playerCard,
        oppCard,
        session: createDuel(playerCard, oppCard),
      })
    },
    [cancelTimers, replace],
  )

  const commitTransition = useCallback(
    (next: DuelSessionState, onSuccess: () => void): boolean => {
      if (!next.playerCard || !next.oppCard || !next.session) return false
      const checkpoint = toDuelSnapshot(
        next.playerCard.id,
        next.oppCard.id,
        next.session,
      )
      if (onCheckpointRef.current?.(checkpoint) === false) {
        cancelTimers()
        actionLocked.current = true
        pendingCheckpoint.current = { next, onSuccess }
        setCheckpointError(true)
        return false
      }
      pendingCheckpoint.current = null
      setCheckpointError(false)
      replace(next)
      onSuccess()
      return true
    },
    [cancelTimers, replace],
  )

  const retryCheckpoint = useCallback(() => {
    const pending = pendingCheckpoint.current
    if (!pending) return
    commitTransition(pending.next, pending.onSuccess)
  }, [commitTransition])

  const finishTransition = useCallback(
    (finishedState: DuelSessionState) => {
      const { playerCard, oppCard, session } = finishedState
      if (!playerCard || !oppCard || !session) return
      if (session.phase === 'settled' && session.winner) {
        cancelTimers()
        onSettledRef.current?.({
          playerCard,
          oppCard,
          session,
          winner: session.winner,
        })
        return
      }
      actionLocked.current = false
    },
    [cancelTimers],
  )

  const chooseAction = useCallback(
    (action: DebateAction) => {
      const current = stateRef.current
      if (
        actionLocked.current ||
        !current.playerCard ||
        !current.oppCard ||
        !current.session ||
        current.session.phase !== 'awaiting-action'
      ) {
        return
      }

      actionLocked.current = true
      const context: DuelContext = {
        playerCard: current.playerCard,
        oppCard: current.oppCard,
      }
      const locked = reduceDuel(
        current.session,
        {
          type: 'lock-actions',
          playerAction: action,
          oppAction: chooseOpponentActionRef.current(current.oppCard),
        },
        context,
      )
      const reveal = () => after(DEBATE_SUSPENSE_MS, () => {
        const beforeReveal = stateRef.current
        if (
          !beforeReveal.playerCard ||
          !beforeReveal.oppCard ||
          !beforeReveal.session
        ) {
          return
        }
        const revealContext: DuelContext = {
          playerCard: beforeReveal.playerCard,
          oppCard: beforeReveal.oppCard,
        }
        const revealed = reduceDuel(
          beforeReveal.session,
          { type: 'reveal' },
          revealContext,
        )
        const finish = () => after(DEBATE_RESULT_MS, () => {
          const beforeFinish = stateRef.current
          if (
            !beforeFinish.playerCard ||
            !beforeFinish.oppCard ||
            !beforeFinish.session
          ) {
            return
          }
          const finishContext: DuelContext = {
            playerCard: beforeFinish.playerCard,
            oppCard: beforeFinish.oppCard,
          }
          const finished = reduceDuel(
            beforeFinish.session,
            { type: 'finish-reveal' },
            finishContext,
          )
          const finishedState = { ...beforeFinish, session: finished }
          commitTransition(finishedState, () =>
            finishTransition(finishedState),
          )
        })
        commitTransition({ ...beforeReveal, session: revealed }, finish)
      })
      commitTransition({ ...current, session: locked }, reveal)
    },
    [after, commitTransition, finishTransition],
  )

  const restore = useCallback(
    (
      playerCard: Member,
      oppCard: Member,
      snapshot: DuelSnapshot,
      options?: { notifySettled?: boolean },
    ) => {
      cancelTimers()
      pendingCheckpoint.current = null
      setCheckpointError(false)
      const restored = restoreDuelSnapshot(snapshot, playerCard, oppCard)
      const restoredState = { playerCard, oppCard, session: restored }
      replace(restoredState)

      const normalize = (current: DuelSessionState) => {
        if (!current.session) return
        if (current.session.phase === 'awaiting-action') {
          actionLocked.current = false
          return
        }
        if (current.session.phase === 'settled') {
          actionLocked.current = true
          if (options?.notifySettled !== false) finishTransition(current)
          return
        }

        actionLocked.current = true
        const context: DuelContext = { playerCard, oppCard }
        const event =
          current.session.phase === 'actions-locked'
            ? { type: 'reveal' as const }
            : { type: 'finish-reveal' as const }
        const session = reduceDuel(current.session, event, context)
        const next = { ...current, session }
        commitTransition(next, () => normalize(next))
      }

      normalize(restoredState)
    },
    [cancelTimers, commitTransition, finishTransition, replace],
  )

  return {
    state,
    checkpointError,
    start,
    restore,
    chooseAction,
    retryCheckpoint,
    clear,
  }
}
