import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CARD_MAX_W, PACK_GROW_MS, PACK_RIP_MS, PACK_STRIP_CLIP, PACK_TORN_CLIP, TIERS } from '../theme'
import type { GameState } from '../game/useGame'
import { PACK_H, PACK_TOP_H, PACK_W, PackFoil, PackLabel, PackShell, PackTop, packBodyBg } from '../components/PackArt'
import { CardBack } from '../components/CardBack'
import { PACK_SIZE } from '../game/pack'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"
const GROW_EASE = 'cubic-bezier(.34,1.06,.4,1)'

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

export function Tear({ state }: { state: GameState }) {
  const { t, rarity } = useI18n()
  const { ripped, grown, pack, isTradePack, tradeRarity } = state
  const { ref: sizerRef, scale } = useCardScale()

  const rarityTier = tradeRarity ? TIERS[tradeRarity] : null

  // The cards sitting inside the sealed pack, top card first.
  const deck = pack
    .slice(0, 4)
    .map((m, depth) => ({ m, depth }))
    .reverse()

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
    filter: `drop-shadow(0 16px 26px rgba(0,0,0,.6)) drop-shadow(0 0 ${ripped ? 60 : 10}px ${rarityTier?.c ?? 'rgba(255,197,61,.18)'})`,
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '30px 20px', touchAction: 'none', userSelect: 'none' }}>
      <div style={{ textAlign: 'center', ...introStyle(60) }}>
        <div style={{ fontFamily: AB, fontSize: 20, letterSpacing: '-.02em' }}>{t('tearingOpen')}</div>
        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: rarityTier ? rarityTier.c : '#5C7391' }}>
          {isTradePack && tradeRarity
            ? t('specialTradePack', { rarity: rarity(tradeRarity) })
            : t('membersIncoming', { count: PACK_SIZE })}
        </div>
      </div>

      <div ref={sizerRef} style={{ position: 'relative', width: '100%', maxWidth: CARD_MAX_W, aspectRatio: '2 / 3' }}>
        {deck.map(({ m, depth }) => (
          <div key={m.id} style={cardStyle(depth)}>
            <CardBack style={{ boxShadow: `0 20px 46px -20px rgba(0,0,0,.75),0 0 0 1px ${rarityTier?.c ?? 'rgba(255,197,61,.45)'}` }} />
          </div>
        ))}

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
              style={{ position: 'absolute', left: 0, right: 0, top: PACK_TOP_H - 9, height: 9, background: `linear-gradient(180deg,rgba(255,255,255,.4),${rarityTier?.c ?? 'rgba(255,197,61,.14)'} 45%,transparent)` }}
            />
            <PackLabel
              subtext={isTradePack && tradeRarity
                ? t('tradePackLabel', { rarity: rarity(tradeRarity) })
                : t('standardPackLabel', { count: PACK_SIZE })}
              rarityColor={rarityTier?.c}
            />
          </PackShell>
        </div>
      </div>

      {/* incoming pips */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', ...introStyle(140) }}>
        {Array.from({ length: pack.length }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: 99,
              background: ripped ? (rarityTier?.c ?? 'rgba(255,197,61,.85)') : 'rgba(234,242,255,.18)',
              transition: `background 260ms ease-out ${i * 34}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
