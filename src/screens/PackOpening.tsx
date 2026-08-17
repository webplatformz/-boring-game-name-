import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CARD_MAX_W, PACK_GROW_MS, PACK_RIP_MS, PACK_STRIP_CLIP, PACK_TORN_CLIP, TIERS } from '../theme'
import type { Game } from '../game/useGame'
import type { Member } from '../data/members'
import { PACK_H, PACK_TOP_H, PACK_W, PackFoil, PackLabel, PackShell, PackTop, packBodyBg } from '../components/PackArt'
import { CardBack } from '../components/CardBack'
import { CardFront } from '../components/CardFront'
import { FixedCardGlow } from '../components/CardGlow'
import { PACK_SIZE } from '../game/pack'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"
const GROW_EASE = 'cubic-bezier(.34,1.06,.4,1)'
const CROSSFADE = 'opacity 200ms ease-out'

/** Scale factor that takes the Home-sized pack up to the revealed card width. */
function useCardScale() {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / PACK_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, scale }
}

const ring = (m: Member) => TIERS[m.ratings.rarity].c + '8c'

/**
 * The pack-opening flow, covering both the "tear" and "reveal" screens as a
 * single mounted component. Tearing ends with the same fanned card-back stack
 * that revealing starts from, so keeping one component (and one deck
 * container) alive across the two phases — instead of unmounting/remounting
 * between separate screens — avoids the flicker/jump that a full screen
 * transition would otherwise cause at that handoff.
 */
export function PackOpening({ game }: { game: Game }) {
  const { state } = game
  const { screen, ripped, grown, pack, isTradePack, tradeRarity, revealIdx, drag, dragging, faceUp, outgoing, outgoingDrag } = state
  const revealing = screen === 'reveal'
  const { ref: sizerRef, scale } = useCardScale()

  const rarityTier = tradeRarity ? TIERS[tradeRarity] : null
  const packAccentColor = isTradePack ? rarityTier?.c : undefined

  // The cards sitting inside the sealed pack, top card first, while tearing.
  const tearDeck = pack
    .slice(0, 4)
    .map((m, depth) => ({ m, depth }))
    .reverse()

  // Up to four cards live at once while revealing: the top (being revealed)
  // and the next few peeking below it. Rendered back-to-front so the top sits
  // on top.
  const revealDeck = pack.slice(revealIdx, revealIdx + 4).reverse()
  const topCard = pack[revealIdx] ?? null

  const cardStyle = (depth: number): CSSProperties => ({
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none',
    opacity: ripped ? 1 : 0,
    transform: ripped
      ? `translateX(${depth * 15}px) scale(${1 - depth * 0.03}) rotate(${depth * 1.1}deg)`
      : `translateY(20px) scale(${0.88 - depth * 0.03})`,
    transition: `opacity ${PACK_RIP_MS * 0.5}ms ease-out ${PACK_RIP_MS * 0.28 + depth * 45}ms,transform ${PACK_RIP_MS * 0.8}ms cubic-bezier(.2,.9,.2,1) ${PACK_RIP_MS * 0.22 + depth * 45}ms`,
  })

  // One uninterrupted pull: the strip goes from seated to gone in a single move.
  const stripStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: PACK_TOP_H,
    zIndex: 3,
    overflow: 'hidden',
    background: packBodyBg,
    clipPath: PACK_STRIP_CLIP,
    transform: ripped ? 'translateY(330px) translateX(30px) rotate(17deg)' : 'none',
    opacity: ripped ? 0 : 1,
    transition: `transform ${PACK_RIP_MS}ms cubic-bezier(.5,.02,.35,1),opacity ${PACK_RIP_MS * 0.45}ms ease-in ${PACK_RIP_MS * 0.5}ms`,
  }

  // The strip's band is cut out of the body from the start (the strip covers it
  // while sealed), so pulling the strip away leaves a real hole with a torn edge.
  const bodyStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    clipPath: PACK_TORN_CLIP,
    ...(ripped
      ? { transform: 'scale(.93) translateY(10px)', opacity: 0.18, transition: `transform ${PACK_RIP_MS}ms ease-out,opacity ${PACK_RIP_MS}ms ease-in,filter ${PACK_RIP_MS}ms ease-out` }
      : { transition: 'transform 300ms ease-out' }),
    filter: 'drop-shadow(0 16px 26px rgba(0,0,0,.6)) drop-shadow(0 0 10px rgba(234,242,255,.18))',
  }

  // Sizer holds the final (card-sized) footprint so nothing reflows while the
  // pack zooms; the pack itself is centred inside it and scaled up.
  const zoomStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: 2,
    width: PACK_W,
    height: PACK_H,
    marginLeft: -PACK_W / 2,
    marginTop: -PACK_H / 2,
    transform: `scale(${grown ? scale : 1})`,
    transition: `transform ${PACK_GROW_MS}ms ${GROW_EASE}`,
  }

  const introStyle = (delay: number): CSSProperties => ({
    opacity: grown ? 1 : 0,
    transform: grown ? 'none' : 'translateY(6px)',
    transition: `opacity 320ms ease-out ${delay}ms,transform 320ms ease-out ${delay}ms`,
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '18px 20px 26px', touchAction: 'none', userSelect: 'none' }}>
      {/* header: intro title while tearing, card counter + skip once revealing —
          both layers share the same box so the deck below never shifts */}
      <div style={{ position: 'relative', minHeight: 20 }}>
        <div style={{ position: 'absolute', inset: 0, textAlign: 'center', opacity: revealing ? 0 : 1, transition: CROSSFADE, ...(revealing ? { pointerEvents: 'none' } : null) }}>
          <div style={{ fontFamily: AB, fontSize: 15, letterSpacing: '.04em', ...introStyle(60) }}>TEARING IT OPEN</div>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, opacity: revealing ? 1 : 0, transition: CROSSFADE, ...(revealing ? null : { pointerEvents: 'none' }) }}>
          <div style={{ fontFamily: AB, fontSize: 15, letterSpacing: '.04em' }}>
            CARD {Math.min(revealIdx + 1, Math.max(pack.length, 1))} / {pack.length}
          </div>
          <button onClick={game.finishPack} className="hovertext" style={{ padding: '10px 15px', borderRadius: 9, background: 'rgba(234,242,255,.06)', border: '1px solid rgba(234,242,255,.14)', color: '#9FB6D2', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em' }}>
            SKIP ALL →
          </button>
        </div>
      </div>

      {/* subtext while tearing, per-card progress pips while revealing */}
      <div style={{ position: 'relative', marginTop: 12, height: 15 }}>
        <div style={{ position: 'absolute', inset: 0, textAlign: 'center', opacity: revealing ? 0 : 1, transition: CROSSFADE }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: rarityTier ? rarityTier.c : '#5C7391', ...introStyle(60) }}>
            {isTradePack ? `SPECIAL ${rarityTier?.label ?? ''} TRADE PACK` : `${PACK_SIZE} MEMBERS INCOMING`}
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 4, alignItems: 'center', opacity: revealing ? 1 : 0, transition: CROSSFADE }}>
          {pack.map((m, i) => (
            <div
              key={m.id}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 99,
                background:
                  i < revealIdx
                    ? TIERS[m.ratings.rarity].c
                    : 'rgba(234,242,255,.14)',
                transition: 'background 200ms',
              }}
            />
          ))}
        </div>
      </div>

      {/* the deck — one persistent container for both phases, so the fanned
          card-back stack that tearing ends on carries straight into the stack
          that revealing starts from with no visual handoff at all */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
        <div ref={sizerRef} style={{ position: 'relative', width: '100%', maxWidth: CARD_MAX_W, aspectRatio: '336 / 504' }}>
          {/* rarity glow behind the deck — only once the top card is face up,
              so it never gives the pull away early */}
          {revealing && topCard && faceUp && (
            <FixedCardGlow rarity={topCard.ratings.rarity} anchor={sizerRef} />
          )}

          {/* the card just revealed, dealing off to the left */}
          {revealing && outgoing && (
            <div style={outgoingStyle(outgoingDrag)}>
              <CardFront member={outgoing} foil style={{ boxShadow: `0 24px 60px -18px rgba(0,0,0,.6),0 0 0 1px ${ring(outgoing)}` }} />
            </div>
          )}

          {!revealing &&
            tearDeck.map(({ m, depth }) => (
              <div key={m.id} style={cardStyle(depth)}>
                <CardBack />
              </div>
            ))}

          {revealing &&
            revealDeck.map((m, i) => {
              const depth = revealDeck.length - 1 - i // 0 = top card being revealed
              const isTop = depth === 0
              const up = isTop && faceUp
              return (
                <div key={m.id} style={stackStyle(depth, isTop, !outgoing, drag, dragging)} {...(isTop && !outgoing ? game.cardHandlers : {})}>
                  <div style={flipStyle(up)}>
                    <CardBack style={{ transform: 'rotateY(180deg) translateZ(1px)' }} />
                    <CardFront member={m} foil style={{ boxShadow: `0 24px 60px -18px rgba(255,197,61,.4),0 0 0 1px ${ring(m)}` }} />
                  </div>
                </div>
              )
            })}

          {!revealing && (
            <div style={zoomStyle}>
              {/* the perforated tear-strip */}
              <div style={stripStyle}>
                <PackFoil />
                <PackTop />
              </div>

              {/* the pack body */}
              <PackShell style={bodyStyle}>
                {/* lit lip along the ragged edge */}
                <div
                  style={{ position: 'absolute', left: 0, right: 0, top: PACK_TOP_H - 9, height: 9, background: `linear-gradient(180deg,rgba(255,255,255,.4),${packAccentColor ?? 'rgba(255,197,61,.14)'} 45%,transparent)` }}
                />
                <PackLabel
                  subtext={isTradePack ? `1 CARD · ${rarityTier?.label ?? ''} TRADE` : `${PACK_SIZE} CARDS · NO DUPES`}
                  rarityColor={packAccentColor}
                />
              </PackShell>
            </div>
          )}
        </div>
      </div>

      {/* footer hint, only relevant once revealing */}
      <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: '#5C7391', opacity: revealing ? 1 : 0, transition: CROSSFADE }}>
        {faceUp ? 'TAP OR SWIPE FOR THE NEXT CARD' : 'TAP TO TURN THE CARD'}
      </div>
    </div>
  )
}

function stackStyle(depth: number, isTop: boolean, interactive: boolean, drag: number, dragging: boolean): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    perspective: 1400,
    zIndex: 10 - depth,
    transform: `translate3d(${isTop ? drag : depth * 15}px,0,0) scale(${1 - depth * 0.03}) rotate(${isTop ? drag * 0.035 : depth * 1.1}deg)`,
    transition: dragging && isTop ? 'none' : 'transform 340ms cubic-bezier(.22,.8,.25,1)',
    willChange: isTop ? 'transform' : undefined,
    touchAction: 'none',
    cursor: isTop && interactive ? 'pointer' : undefined,
    pointerEvents: isTop && interactive ? undefined : 'none',
  }
}

function flipStyle(up: boolean): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    transformStyle: 'preserve-3d',
    transition: 'transform 560ms cubic-bezier(.34,1.12,.5,1)',
    transform: `rotateY(${up ? 0 : 180}deg)`,
  }
}

function outgoingStyle(releaseDrag: number): CSSProperties {
  const direction = releaseDrag > 0 ? 1 : -1
  return {
    position: 'absolute',
    inset: 0,
    zIndex: 20,
    pointerEvents: 'none',
    willChange: 'transform, opacity',
    animation: 'swipeOut 420ms cubic-bezier(.22,.7,.2,1) forwards',
    ['--swipe-start-x' as string]: `${releaseDrag}px`,
    ['--swipe-start-rotation' as string]: `${releaseDrag * 0.035}deg`,
    ['--swipe-end-x' as string]: `${direction * 160}%`,
    ['--swipe-end-rotation' as string]: `${direction * 18}deg`,
  }
}
