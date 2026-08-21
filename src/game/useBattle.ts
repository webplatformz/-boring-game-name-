import { useCallback, useEffect, useRef, useState } from 'react'
import type { Member } from '../data/members'
import type { Action, PollState, PollWinner } from './battle'
import {
  checkWin,
  chooseAiAction,
  DEBATE_TURN_LIMIT,
  INITIAL_POLL,
  pickOpponent,
  resolveTurn,
} from './battle'
import type { BattleRecord } from './storage'
import { loadBattleRecord, persistBattleRecord } from './storage'

export type BattleStep = 'pick' | 'fight' | 'reveal' | 'result'

/** Delay between the player's tap and both actions being revealed, so the
 * choice lands with some suspense instead of resolving instantly. */
export const BATTLE_SUSPENSE_MS = 900
/** Delay between the reveal (stat highlight + action labels appearing) and
 * the result banner — kept long enough to actually read what was chosen. */
export const BATTLE_RESULT_MS = 1800

export interface CompletedDebateTurn {
  pollBefore: PollState
  poll: PollState
  playerAction: Action
  oppAction: Action
}

export interface BattleState {
  step: BattleStep
  record: BattleRecord
  playerCard: Member | null
  oppCard: Member | null
  playerAction: Action | null
  oppAction: Action | null
  poll: PollState | null
  lastTurn: CompletedDebateTurn | null
  turn: number
  winner: PollWinner | null
}

export interface Battle {
  state: BattleState
  pickPlayerCard: (member: Member) => void
  chooseAction: (action: Action) => void
  reset: () => void
}

const PICK_STATE: Omit<BattleState, 'record'> = {
  step: 'pick',
  playerCard: null,
  oppCard: null,
  playerAction: null,
  oppAction: null,
  poll: null,
  lastTurn: null,
  turn: 1,
  winner: null,
}

const INITIAL: BattleState = {
  record: loadBattleRecord(),
  ...PICK_STATE,
}

/**
 * Standalone battle-mode state machine, kept separate from useGame's
 * pack-opening flow since the two are unrelated. Screen-level transition
 * into/out of 'battle' still lives in useGame/App.
 */
export function useBattle(): Battle {
  const [state, setState] = useState<BattleState>(INITIAL)

  const patch = useCallback(
    (p: Partial<BattleState> | ((s: BattleState) => Partial<BattleState>)) =>
      setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })),
    [],
  )

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const actionLocked = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.current = timers.current.filter((timer) => timer !== id)
      fn()
    }, ms)
    timers.current.push(id)
    return id
  }, [])

  // Cancels any in-flight suspense/reveal timers so a reset (or a new pick)
  // can never be clobbered by a stale callback still resolving a previous round.
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const pickPlayerCard = useCallback(
    (member: Member) => {
      clearTimers()
      actionLocked.current = false
      const oppCard = pickOpponent(member)
      const poll = INITIAL_POLL(member, oppCard)
      patch({
        step: 'fight',
        playerCard: member,
        oppCard,
        playerAction: null,
        oppAction: null,
        poll,
        lastTurn: null,
        turn: 1,
        winner: null,
      })
    },
    [patch, clearTimers],
  )

  const chooseAction = useCallback(
    (action: Action) => {
      const s = stateRef.current
      if (
        actionLocked.current ||
        s.step !== 'fight' ||
        s.playerAction !== null ||
        !s.playerCard ||
        !s.oppCard ||
        !s.poll
      ) {
        return
      }
      actionLocked.current = true
      const oppAction = chooseAiAction(s.oppCard)
      patch({ playerAction: action, oppAction })
      after(BATTLE_SUSPENSE_MS, () => {
        const cur = stateRef.current
        if (
          !cur.playerCard ||
          !cur.oppCard ||
          !cur.playerAction ||
          !cur.oppAction ||
          !cur.poll
        ) {
          console.error('Debate turn lost required state before reveal')
          clearTimers()
          actionLocked.current = false
          patch(PICK_STATE)
          return
        }
        const pollBefore = cur.poll
        const poll = resolveTurn(
          pollBefore,
          cur.playerCard,
          cur.playerAction,
          cur.oppCard,
          cur.oppAction,
        )
        const winner = checkWin(
          poll,
          cur.turn,
          DEBATE_TURN_LIMIT,
          cur.playerCard,
          cur.oppCard,
        )
        patch({
          step: 'reveal',
          poll,
          winner,
          lastTurn: {
            pollBefore,
            poll,
            playerAction: cur.playerAction,
            oppAction: cur.oppAction,
          },
        })

        after(BATTLE_RESULT_MS, () => {
          if (winner) {
            clearTimers()
            const record: BattleRecord = {
              wins: cur.record.wins + (winner.winner === 'player' ? 1 : 0),
              losses: cur.record.losses + (winner.winner === 'opponent' ? 1 : 0),
            }
            persistBattleRecord(record)
            patch({ step: 'result', record })
            return
          }

          actionLocked.current = false
          patch({
            step: 'fight',
            turn: cur.turn + 1,
            playerAction: null,
            oppAction: null,
            winner: null,
          })
        })
      })
    },
    [after, clearTimers, patch],
  )

  const reset = useCallback(() => {
    clearTimers()
    actionLocked.current = false
    patch(PICK_STATE)
  }, [patch, clearTimers])

  return { state, pickPlayerCard, chooseAction, reset }
}
