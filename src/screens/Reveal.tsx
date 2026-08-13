import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { CARD_MAX_W, TIERS } from '../theme'
import type { Game } from '../game/useGame'
import type { Member } from '../data/members'
import { CardFront } from '../components/CardFront'
import { FixedCardGlow } from '../components/CardGlow'
import { CardBack } from '../components/CardBack'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export function Reveal({ game }: { game: Game }) {
  const { pack, revealIdx, drag, dragging, faceUp, outgoing } = game.state

  // Up to four cards are live at once: the top (being revealed) and the next
  // few peeking below it. Rendered back-to-front so the top sits on top.
  const remaining = pack.slice(revealIdx, revealIdx + 4).reverse()
  const topCard = pack[revealIdx] ?? null
  const deckRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '18px 20px 26px', touchAction: 'none', userSelect: 'none' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: AB, fontSize: 15, letterSpacing: '.04em' }}>
          CARD {Math.min(revealIdx + 1, Math.max(pack.length, 1))} / {pack.length}
        </div>
        <button onClick={game.finishPack} className="hovertext" style={{ padding: '10px 15px', borderRadius: 9, background: 'rgba(234,242,255,.06)', border: '1px solid rgba(234,242,255,.14)', color: '#9FB6D2', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em' }}>
          SKIP ALL →
        </button>
      </div>

      {/* progress pips (one per card, colour once revealed) */}
      <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
        {pack.map((m, i) => (
          <div
            key={m.id}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 99,
              background: i < revealIdx ? TIERS[m.rarity].c : 'rgba(234,242,255,.14)',
              transition: 'background 200ms',
            }}
          />
        ))}
      </div>

      {/* the deck */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
        <div ref={deckRef} style={{ position: 'relative', width: '100%', maxWidth: CARD_MAX_W, aspectRatio: '336 / 504' }}>
          {/* rarity glow behind the deck — only once the top card is face up,
              so it never gives the pull away early */}
          {topCard && faceUp && <FixedCardGlow rarity={topCard.rarity} anchor={deckRef} />}

          {/* the card just revealed, dealing off to the left */}
          {outgoing && (
            <div style={outgoingStyle}>
              <CardFront member={outgoing} foil style={{ boxShadow: `0 24px 60px -18px rgba(0,0,0,.6),0 0 0 1px ${ring(outgoing)}` }} />
            </div>
          )}

          {remaining.map((m, i) => {
            const depth = remaining.length - 1 - i // 0 = top card being revealed
            const isTop = depth === 0
            const up = isTop && faceUp
            return (
              <div key={m.id} style={stackStyle(depth, isTop, drag, dragging)} {...(isTop ? game.cardHandlers : {})}>
                <div style={flipStyle(up)}>
                  <CardBack style={{ transform: 'rotateY(180deg)', boxShadow: `0 20px 46px -20px rgba(0,0,0,.75),0 0 0 1px rgba(255,197,61,${isTop ? 0.45 : 0.2})` }} />
                  <CardFront member={m} foil style={{ boxShadow: `0 24px 60px -18px rgba(255,197,61,.4),0 0 0 1px ${ring(m)}` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: '#5C7391' }}>
        {faceUp ? 'TAP OR SWIPE FOR THE NEXT CARD' : 'TAP TO TURN THE CARD'}
      </div>
    </div>
  )
}

const ring = (m: Member) => TIERS[m.rarity].c + '8c'

function stackStyle(depth: number, isTop: boolean, drag: number, dragging: boolean): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    perspective: 1400,
    zIndex: 10 - depth,
    transform: `translateX(${isTop ? drag : depth * 15}px) scale(${1 - depth * 0.03}) rotate(${isTop ? drag * 0.05 : depth * 1.1}deg)`,
    transition: dragging && isTop ? 'none' : 'transform 300ms cubic-bezier(.2,.9,.2,1)',
    touchAction: 'none',
    cursor: isTop ? 'pointer' : undefined,
    pointerEvents: isTop ? undefined : 'none',
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

const outgoingStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 20,
  pointerEvents: 'none',
  animation: 'swipeOutLeft 420ms cubic-bezier(.4,.05,.6,1) forwards',
}
