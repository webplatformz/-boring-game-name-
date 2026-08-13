import { useCallback, useEffect, useRef, useState } from 'react'
import type { Member } from '../data/members'
import { drawPack } from './pack'
import { loadSave, persist, REFILL_COOLDOWN_MS, STARTING_PACKS } from './storage'

export type Screen = 'home' | 'tear' | 'reveal' | 'collection'

export interface GameState {
  screen: Screen
  packs: number
  refillAt: number | null
  owned: Record<number, number>
  pack: Member[]
  revealIdx: number
  drag: number
  dragging: boolean
  faceUp: boolean
  outgoing: Member | null
  tear: number
  tearing: boolean
  ripped: boolean
}

const save = loadSave()

const INITIAL: GameState = {
  screen: 'home',
  packs: save.packs,
  refillAt: save.refillAt,
  owned: save.owned,
  pack: [],
  revealIdx: 0,
  drag: 0,
  dragging: false,
  faceUp: false,
  outgoing: null,
  tear: 0,
  tearing: false,
  ripped: false,
}

export interface Game {
  state: GameState
  ripNow: () => void
  advance: () => void
  finishPack: () => void
  goHome: () => void
  goCollection: () => void
  cardHandlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}

export function useGame(): Game {
  const [state, setState] = useState<GameState>(INITIAL)

  // Merge-style updater mirroring the prototype's this.setState.
  const patch = useCallback(
    (p: Partial<GameState> | ((s: GameState) => Partial<GameState>)) =>
      setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })),
    [],
  )

  // Timers + gesture scratch state, all in refs so re-renders don't disturb them.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const auto = useRef(false)
  const x0 = useRef(0)
  const moved = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  // ── the rip sequence: tap → strip pulls → rips → cards deal in ──
  const rip = useCallback(() => {
    const pack = drawPack()
    patch({ tearing: false, ripped: true, tear: 150, pack, revealIdx: 0, faceUp: false, outgoing: null })
    after(540, () => {
      auto.current = false
      patch({ screen: 'reveal', ripped: false, tear: 0 })
      after(340, () => patch({ faceUp: true }))
    })
  }, [patch, after])

  const autoTear = useCallback(() => {
    if (auto.current) return
    auto.current = true
    patch({ tearing: false, tear: 74 })
    after(420, rip)
  }, [patch, after, rip])

  const ripNow = useCallback(() => {
    if (stateRef.current.packs <= 0) return
    patch({ screen: 'tear', tear: 0, ripped: false })
    after(260, autoTear)
  }, [patch, after, autoTear])

  const finishPack = useCallback(() => {
    setState((s) => {
      const owned = { ...s.owned }
      for (const m of s.pack) owned[m.id] = (owned[m.id] || 0) + 1
      const packs = Math.max(0, s.packs - 1)
      const refillAt = packs <= 0 ? Date.now() + REFILL_COOLDOWN_MS : s.refillAt
      persist({ owned, packs, refillAt })
      return { ...s, owned, packs, refillAt, screen: 'home', pack: [], revealIdx: 0, outgoing: null, faceUp: false }
    })
  }, [])

  // While waiting on the refill cooldown, tick once a second so the UI countdown
  // stays live, and grant the next batch of packs once it elapses.
  useEffect(() => {
    if (state.refillAt == null) return
    const id = setInterval(() => {
      setState((s) => {
        if (s.refillAt == null) return s
        if (Date.now() >= s.refillAt) {
          persist({ owned: s.owned, packs: STARTING_PACKS, refillAt: null })
          return { ...s, packs: STARTING_PACKS, refillAt: null }
        }
        return { ...s }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [state.refillAt])

  const advance = useCallback(() => {
    const s = stateRef.current
    const next = s.revealIdx + 1
    if (next >= s.pack.length) {
      finishPack()
      return
    }
    // Deal the current card off the deck (tinder-style swipe out), then flip the next one face-up.
    patch({ outgoing: s.pack[s.revealIdx], revealIdx: next, faceUp: false })
    after(450, () => patch({ faceUp: true }))
    after(470, () => patch({ outgoing: null }))
  }, [patch, after, finishPack])

  const goHome = useCallback(() => patch({ screen: 'home' }), [patch])
  const goCollection = useCallback(() => patch({ screen: 'collection' }), [patch])

  // ── swipe / tap on the top reveal card ──
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      x0.current = e.clientX
      moved.current = 0
      patch({ dragging: true })
    },
    [patch],
  )
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!stateRef.current.dragging) return
      const dx = e.clientX - x0.current
      moved.current = Math.abs(dx)
      patch({ drag: dx })
    },
    [patch],
  )
  const onPointerUp = useCallback(() => {
    if (!stateRef.current.dragging) return
    const past = Math.abs(stateRef.current.drag) > 70 || moved.current < 6
    patch({ dragging: false, drag: 0 })
    if (past) advance()
  }, [patch, advance])

  return {
    state,
    ripNow,
    advance,
    finishPack,
    goHome,
    goCollection,
    cardHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}
