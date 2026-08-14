import { useCallback, useEffect, useRef, useState } from 'react'
import type { Member } from '../data/members'
import type { Action, BattleResult } from './battle'
import { chooseAiAction, pickOpponent, resolveRound } from './battle'
import type { BattleRecord } from './storage'
import { loadBattleRecord, persistBattleRecord } from './storage'

export type BattleStep = 'pick' | 'fight' | 'reveal' | 'result'

/** Delay between the player's tap and both actions being revealed, so the
 * choice lands with some suspense instead of resolving instantly. */
export const BATTLE_SUSPENSE_MS = 900
/** Delay between the reveal (stat highlight + action labels appearing) and
 * the result banner — kept long enough to actually read what was chosen. */
export const BATTLE_RESULT_MS = 1800

export interface BattleState {
  step: BattleStep
  record: BattleRecord
  playerCard: Member | null
  oppCard: Member | null
  playerAction: Action | null
  oppAction: Action | null
  result: BattleResult | null
}

export interface Battle {
  state: BattleState
  pickPlayerCard: (member: Member) => void
  chooseAction: (action: Action) => void
  reset: () => void
}

const INITIAL: BattleState = {
  step: 'pick',
  record: loadBattleRecord(),
  playerCard: null,
  oppCard: null,
  playerAction: null,
  oppAction: null,
  result: null,
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
  const stateRef = useRef(state)
  stateRef.current = state

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms)
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
      patch({
        step: 'fight',
        playerCard: member,
        oppCard: pickOpponent(member),
        playerAction: null,
        oppAction: null,
        result: null,
      })
    },
    [patch, clearTimers],
  )

  const chooseAction = useCallback(
    (action: Action) => {
      const s = stateRef.current
      // Guard against double-submits: once an action is chosen the step stays
      // 'fight' throughout the suspense delay, so also require playerAction
      // to still be unset.
      if (s.step !== 'fight' || s.playerAction !== null || !s.playerCard || !s.oppCard) return
      const oppAction = chooseAiAction(s.oppCard)
      patch({ playerAction: action, oppAction })
      after(BATTLE_SUSPENSE_MS, () => {
        patch({ step: 'reveal' })
        after(BATTLE_RESULT_MS, () => {
          const cur = stateRef.current
          if (!cur.playerCard || !cur.oppCard || !cur.playerAction || !cur.oppAction) return
          const result = resolveRound(cur.playerCard, cur.playerAction, cur.oppCard, cur.oppAction)
          const record: BattleRecord = {
            wins: cur.record.wins + (result.winner === 'player' ? 1 : 0),
            losses: cur.record.losses + (result.winner === 'opponent' ? 1 : 0),
          }
          persistBattleRecord(record)
          patch({ step: 'result', result, record })
        })
      })
    },
    [patch, after],
  )

  const reset = useCallback(() => {
    clearTimers()
    patch({
      step: 'pick',
      playerCard: null,
      oppCard: null,
      playerAction: null,
      oppAction: null,
      result: null,
    })
  }, [patch, clearTimers])

  return { state, pickPlayerCard, chooseAction, reset }
}
