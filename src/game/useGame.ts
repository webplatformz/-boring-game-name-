import { useCallback, useEffect, useRef, useState } from 'react'
import type { Member } from '../data/members'
import type { RarityKey } from '../theme'
import { PACK_GROW_MS, PACK_RIP_MS } from '../theme'
import { drawPack, drawRarityPack, drawTradePackCard, getNextRarity } from './pack'
import {
  loadRedeemedVouchers,
  loadSave,
  MAX_AUTOMATIC_PACKS,
  persist,
  persistRedeemedVouchers,
  REFILL_BATCH_SIZE,
  REFILL_INTERVAL_MS,
  syncMemberScoreCache,
} from './storage'
import { verifyVoucherCode } from './vouchers'

export type Screen = 'home' | 'tear' | 'reveal' | 'collection' | 'trade' | 'debate'

export interface GameState {
  screen: Screen
  packs: number
  refillAt: number | null
  owned: Record<number, number>
  cardsRevealed: number
  packsOpened: number
  regularPacksOpened: number
  pack: Member[]
  revealIdx: number
  drag: number
  dragging: boolean
  faceUp: boolean
  outgoing: Member | null
  outgoingDrag: number
  ripped: boolean
  /** Pack has zoomed up from its Home size to card size; gates the tear. */
  grown: boolean
  /** True if currently opening a trade-in pack. */
  isTradePack?: boolean
  /** Rarity of cards traded in to create this special pack. */
  tradeRarity?: RarityKey | null
  /** True if currently opening a rarity-voucher pack. */
  isVoucherPack?: boolean
  /** Target rarity of the voucher pack being opened. */
  voucherRarity?: RarityKey | null
  /** Increments every time a pack finishes; achievement tracking watches this to react once per completion. */
  packCompletionSeq: number
  /** Members from the most recently completed pack (regular or trade-in). */
  lastPackMembers: Member[]
  /** Whether the most recently completed pack was a trade-in pack. */
  lastPackWasTrade: boolean
  /** Successful trade-ins executed this session; achievement tracking watches this. */
  tradesExecuted: number
}

const save = loadSave()

const INITIAL: GameState = {
  screen: 'home',
  packs: save.packs,
  refillAt: save.refillAt,
  owned: save.owned,
  cardsRevealed: save.cardsRevealed,
  packsOpened: save.packsOpened,
  regularPacksOpened: save.regularPacksOpened,
  pack: [],
  revealIdx: 0,
  drag: 0,
  dragging: false,
  faceUp: false,
  outgoing: null,
  outgoingDrag: 0,
  ripped: false,
  grown: false,
  packCompletionSeq: 0,
  lastPackMembers: [],
  lastPackWasTrade: false,
  tradesExecuted: 0,
}

export type VoucherRedemptionResult =
  | { ok: true; type: 'refill'; packs: number }
  | { ok: true; type: 'timer' | 'rarity' }
  | { ok: false; reason: 'invalid' | 'already-redeemed' | 'no-timer' }

export interface Game {
  state: GameState
  ripNow: () => void
  advance: () => void
  finishPack: () => void
  goHome: () => void
  goCollection: () => void
  goDebate: () => void
  goTrade: () => void
  executeTrade: (tradedMemberIds: number[], sourceRarity: RarityKey) => void
  /** Grants extra unopened packs (used by achievement rewards) and persists them. */
  grantBonusPacks: (count: number) => void
  /** Verifies and applies a voucher code. See game/vouchers.ts for the code format. */
  redeemVoucher: (code: string) => Promise<VoucherRedemptionResult>
  cardHandlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}

export function useGame(): Game {
  const [state, setState] = useState<GameState>(INITIAL)

  // Existing collections contain ids rather than stale member objects. Keep a
  // revisioned local score snapshot in sync for offline/local consumers too.
  useEffect(() => {
    syncMemberScoreCache()
  }, [])

  // Merge-style updater mirroring the prototype's this.setState.
  const patch = useCallback(
    (p: Partial<GameState> | ((s: GameState) => Partial<GameState>)) =>
      setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })),
    [],
  )

  // Timers + gesture scratch state, all in refs so re-renders don't disturb them.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const x0 = useRef(0)
  const moved = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state
  // Earliest time a *new* advance() call is allowed. Kept separate from the
  // outgoing card's full cleanup (see `advance`) so the next card can be
  // tapped well before the previous one's exit animation has fully finished.
  const advanceLockedUntil = useRef(0)

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  // ── the rip sequence: tap → pack zooms → strip rips off in one pull → cards deal in ──
  // Cards stay face-down until the user taps them.
  const rip = useCallback(() => {
    patch({ ripped: true })
    after(PACK_RIP_MS, () => {
      patch({ screen: 'reveal', ripped: false, faceUp: false })
    })
  }, [patch, after])

  const ripNow = useCallback(() => {
    if (stateRef.current.packs <= 0) return
    // The pack is drawn up front so the Tear screen can already stack the cards
    // (hidden) inside the sealed pack and fade them in as it comes apart.
    patch({ screen: 'tear', ripped: false, grown: false, pack: drawPack(), revealIdx: 0, faceUp: false, outgoing: null, outgoingDrag: 0 })
    // Let the pack mount at Home size for a frame, zoom it to card size, then tear.
    after(30, () => patch({ grown: true }))
    after(30 + PACK_GROW_MS + 160, rip)
  }, [patch, after, rip])

  const finishPack = useCallback(() => {
    setState((s) => {
      // A completed pack is counted once, whether its cards were turned over
      // individually or collected through Skip all.
      if (s.pack.length === 0) return s
      const owned = { ...s.owned }
      for (const m of s.pack) owned[m.id] = (owned[m.id] || 0) + 1
      const cardsRevealed = s.cardsRevealed + s.pack.length
      const packsOpened = s.packsOpened + 1
      const isRegularPack = !s.isTradePack && !s.isVoucherPack
      const regularPacksOpened = s.regularPacksOpened + (isRegularPack ? 1 : 0)
      let packs = s.packs
      let refillAt = s.refillAt
      if (!s.isTradePack && !s.isVoucherPack) {
        packs = Math.max(0, s.packs - 1)
        refillAt = packs < MAX_AUTOMATIC_PACKS
          ? (s.refillAt ?? Date.now() + REFILL_INTERVAL_MS)
          : null
      }
      persist({ owned, packs, cardsRevealed, packsOpened, regularPacksOpened, refillAt })
      const returnScreen = s.isTradePack ? 'trade' : 'home'
      return {
        ...s,
        owned,
        packs,
        cardsRevealed,
        packsOpened,
        regularPacksOpened,
        refillAt,
        screen: returnScreen,
        pack: [],
        revealIdx: 0,
        outgoing: null,
        outgoingDrag: 0,
        faceUp: false,
        isTradePack: false,
        isVoucherPack: false,
        voucherRarity: null,
        packCompletionSeq: s.packCompletionSeq + 1,
        lastPackMembers: s.pack,
        lastPackWasTrade: (s.isTradePack || s.isVoucherPack) ?? false,
      }
    })
  }, [])

  const grantBonusPacks = useCallback((count: number) => {
    if (count <= 0) return
    setState((s) => {
      const packs = s.packs + count
      // Achievement packs are independent from the automatic refill timer.
      const refillAt = s.refillAt
      persist({
        owned: s.owned,
        packs,
        cardsRevealed: s.cardsRevealed,
        packsOpened: s.packsOpened,
        regularPacksOpened: s.regularPacksOpened,
        refillAt,
      })
      return { ...s, packs, refillAt }
    })
  }, [])

  // While waiting on the refill timer, tick once a second so the UI countdown
  // stays live, and grant one automatic pack when it elapses.
  useEffect(() => {
    if (state.refillAt == null) return
    const id = setInterval(() => {
      setState((s) => {
        if (s.refillAt == null) return s
        if (Date.now() >= s.refillAt) {
          const packs = Math.min(MAX_AUTOMATIC_PACKS, s.packs + REFILL_BATCH_SIZE)
          const refillAt = packs < MAX_AUTOMATIC_PACKS
            ? s.refillAt + REFILL_INTERVAL_MS
            : null
          persist({
            owned: s.owned,
            packs,
            cardsRevealed: s.cardsRevealed,
            packsOpened: s.packsOpened,
            regularPacksOpened: s.regularPacksOpened,
            refillAt,
          })
          return { ...s, packs, refillAt }
        }
        return { ...s }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [state.refillAt])

  const advance = useCallback((releaseDrag = stateRef.current.drag) => {
    const s = stateRef.current
    const next = s.revealIdx + 1
    const current = s.pack[s.revealIdx]
    const now = Date.now()
    if (!current || now < advanceLockedUntil.current) return
    // A little overlap with the previous card's exit is intentional: the
    // swipe-out's easing front-loads the motion, so it's already ~95%
    // off-screen well before its animation technically ends (420ms). Locking
    // just long enough for that (rather than the full cleanup below) keeps
    // back-to-back taps feeling instant without ever visibly cutting an
    // exit short.
    advanceLockedUntil.current = now + 260
    // Start the exit where the gesture ended so a swiped card never snaps back
    // to the centre before leaving. Taps use the default leftward exit.
    patch({ outgoing: current, outgoingDrag: releaseDrag, revealIdx: next, faceUp: false })
    after(470, () => {
      if (stateRef.current.outgoing?.id !== current.id) return
      if (next >= stateRef.current.pack.length) finishPack()
      else patch({ outgoing: null, outgoingDrag: 0 })
    })
  }, [patch, after, finishPack])

  const goHome = useCallback(() => patch({ screen: 'home' }), [patch])
  const goCollection = useCallback(() => patch({ screen: 'collection' }), [patch])
  const goTrade = useCallback(() => patch({ screen: 'trade' }), [patch])
  const goDebate = useCallback(() => patch({ screen: 'debate' }), [patch])

  const executeTrade = useCallback(
    (tradedMemberIds: number[], sourceRarity: RarityKey) => {
      const targetRarity = getNextRarity(sourceRarity)
      if (!targetRarity || tradedMemberIds.length !== 5) return

      const currentOwned = { ...stateRef.current.owned }
      // Deduct traded cards
      for (const id of tradedMemberIds) {
        if (currentOwned[id] && currentOwned[id] > 0) {
          currentOwned[id] -= 1
          if (currentOwned[id] === 0) delete currentOwned[id]
        } else {
          return // invalid trade attempt
        }
      }

      const pack = drawTradePackCard(targetRarity)
      persist({
        owned: currentOwned,
        packs: stateRef.current.packs,
        cardsRevealed: stateRef.current.cardsRevealed,
        packsOpened: stateRef.current.packsOpened,
        regularPacksOpened: stateRef.current.regularPacksOpened,
        refillAt: stateRef.current.refillAt,
      })

      patch({
        owned: currentOwned,
        screen: 'tear',
        ripped: false,
        grown: false,
        pack,
        revealIdx: 0,
        faceUp: false,
        outgoing: null,
        outgoingDrag: 0,
        isTradePack: true,
        tradeRarity: sourceRarity,
        tradesExecuted: stateRef.current.tradesExecuted + 1,
      })

      after(30, () => patch({ grown: true }))
      after(30 + PACK_GROW_MS + 160, rip)
    },
    [patch, after, rip],
  )

  const redeemVoucher = useCallback(
    async (code: string): Promise<VoucherRedemptionResult> => {
      const result = await verifyVoucherCode(code)
      if (!result.ok) return { ok: false, reason: 'invalid' }

      const s = stateRef.current
      const { type, rarity, amount } = result.payload

      const redeemed = loadRedeemedVouchers()
      if (redeemed.has(result.nonce)) return { ok: false, reason: 'already-redeemed' }

      if (type === 'refill') {
        const packs = s.packs + (amount ?? 1)
        const refillAt = packs < MAX_AUTOMATIC_PACKS ? (s.refillAt ?? Date.now() + REFILL_INTERVAL_MS) : null
        persist({
          owned: s.owned,
          packs,
          cardsRevealed: s.cardsRevealed,
          packsOpened: s.packsOpened,
          regularPacksOpened: s.regularPacksOpened,
          refillAt,
        })
        redeemed.add(result.nonce)
        persistRedeemedVouchers(redeemed)
        patch({ packs, refillAt })
        return { ok: true, type, packs }
      }

      if (type === 'timer') {
        if (s.refillAt == null) return { ok: false, reason: 'no-timer' }
        const packs = Math.min(MAX_AUTOMATIC_PACKS, s.packs + REFILL_BATCH_SIZE)
        const refillAt = packs < MAX_AUTOMATIC_PACKS ? s.refillAt + REFILL_INTERVAL_MS : null
        persist({
          owned: s.owned,
          packs,
          cardsRevealed: s.cardsRevealed,
          packsOpened: s.packsOpened,
          regularPacksOpened: s.regularPacksOpened,
          refillAt,
        })
        redeemed.add(result.nonce)
        persistRedeemedVouchers(redeemed)
        patch({ packs, refillAt })
        return { ok: true, type }
      }

      // rarity — opens a bonus 5-card pack of a single rarity, same
      // "doesn't consume regular packs" treatment as a trade-in pack.
      const rarityPack = drawRarityPack(rarity as RarityKey)
      redeemed.add(result.nonce)
      persistRedeemedVouchers(redeemed)
      patch({
        screen: 'tear',
        ripped: false,
        grown: false,
        pack: rarityPack,
        revealIdx: 0,
        faceUp: false,
        outgoing: null,
        outgoingDrag: 0,
        isVoucherPack: true,
        voucherRarity: rarity,
      })
      after(30, () => patch({ grown: true }))
      after(30 + PACK_GROW_MS + 160, rip)
      return { ok: true, type }
    },
    [patch, after, rip],
  )

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
    const isTap = moved.current < 6
    const swiped = Math.abs(stateRef.current.drag) > 70
    const releaseDrag = stateRef.current.drag
    patch({ dragging: false, drag: 0 })
    // A tap always flips a face-down card, regardless of input type.
    if (!stateRef.current.faceUp) {
      if (isTap) patch({ faceUp: true })
      return
    }
    // Stat controls stop pointer propagation, so taps elsewhere on a face-up
    // card can advance on both touch and desktop without closing a tooltip.
    if (swiped || isTap) advance(releaseDrag)
  }, [patch, advance])

  const onPointerCancel = useCallback(() => {
    if (stateRef.current.dragging) patch({ dragging: false, drag: 0 })
  }, [patch])

  return {
    state,
    ripNow,
    advance,
    finishPack,
    goHome,
    goCollection,
    goTrade,
    executeTrade,
    grantBonusPacks,
    redeemVoucher,
    goDebate,
    cardHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
