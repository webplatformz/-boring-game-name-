import type { CSSProperties } from 'react'
import { MEMBERS, MEMBERS_BY_ID } from '../data/members'
import { TIERS } from '../theme'
import type { Game } from '../game/useGame'
import { PackFace } from '../components/PackArt'
import { SwissCross } from '../components/CardBack'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export function Home({ game }: { game: Game }) {
  const { packs, owned, refillAt } = game.state
  const ownedList = Object.keys(owned)
    .map((id) => MEMBERS_BY_ID.get(Number(id)))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
  const total = MEMBERS.length
  const ownedCount = ownedList.length
  const best = ownedList.reduce<(typeof ownedList)[number] | null>(
    (b, m) => (!b || m.ovr > b.ovr ? m : b),
    null,
  )
  const progress = Math.round((ownedCount / total) * 100)
  const canRip = packs > 0
  const remainingSec = refillAt ? Math.max(0, Math.ceil((refillAt - Date.now()) / 1000)) : 0
  const countdown = `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`

  return (
    <div style={{ padding: '22px 20px 108px', display: 'flex', flexDirection: 'column', gap: 22, animation: 'riseIn 320ms ease-out' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <SwissCross size={24} />
          <div style={{ fontFamily: AB, fontSize: 14, letterSpacing: '-.01em' }}>SESSION 52</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 99, background: 'rgba(255,197,61,.1)', border: '1px solid rgba(255,197,61,.35)' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#FFD87A' }}>PACKS</span>
          <span style={{ fontFamily: AB, fontSize: 13, color: '#FFC53D' }}>{packs}</span>
        </div>
      </div>

      {/* headline */}
      <div>
        <div
          style={{
            fontFamily: AB,
            fontSize: 34,
            lineHeight: 0.95,
            letterSpacing: '-.035em',
            background: 'linear-gradient(100deg,#FFC53D,#FF3D8B 40%,#8B5CF6 70%,#2FD3C4)',
            backgroundSize: '200% 100%',
            animation: 'shimmerText 9s ease-in-out infinite',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          RIP A PACK.
          <br />
          BUILD THE HOUSE.
        </div>
        <div style={{ marginTop: 9, fontSize: 13.5, lineHeight: 1.5, color: '#9FB6D2' }}>
          Five members per pack, no repeats inside it. Rarity is years served — the veterans are the chase cards.
        </div>
      </div>

      {/* pack */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 0' }}>
        <button
          onClick={game.ripNow}
          className="hoverlift"
          style={{ width: 212, filter: 'drop-shadow(0 18px 30px rgba(0,0,0,.65)) drop-shadow(0 0 22px rgba(255,197,61,.24))' }}
          aria-label="Rip open a pack"
        >
          <PackFace />
        </button>
      </div>

      <button onClick={game.ripNow} disabled={!canRip} style={openBtn(canRip)}>
        {canRip ? 'RIP IT OPEN' : refillAt ? `NEXT PACK IN ${countdown}` : 'NO PACKS LEFT'}
      </button>

      {/* stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={tile}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#5C7391' }}>COLLECTED</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
            <span style={{ fontFamily: AB, fontSize: 26, lineHeight: 1, color: '#EAF2FF' }}>{ownedCount}</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#5C7391' }}>/ {total}</span>
          </div>
          <div style={{ marginTop: 9, height: 5, borderRadius: 99, background: 'rgba(234,242,255,.12)', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#FFC53D,#FF3D8B)' }} />
          </div>
        </div>
        <div style={tile}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#5C7391' }}>BEST PULL</div>
          <div style={{ fontFamily: AB, fontSize: 17, lineHeight: 1.05, marginTop: 3, color: '#EAF2FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {best ? best.name : '—'}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', marginTop: 4, color: best ? TIERS[best.rarity].ovrTint : '#5C7391' }}>
            {best ? `${TIERS[best.rarity].label} · ${best.ovr} OVR` : 'RIP A PACK'}
          </div>
        </div>
      </div>
    </div>
  )
}

const tile: CSSProperties = { padding: '13px 15px', borderRadius: 13, background: '#0B121D', border: '1px solid rgba(234,242,255,.1)' }

function openBtn(canRip: boolean): CSSProperties {
  return canRip
    ? { padding: '17px 26px', borderRadius: 13, textAlign: 'center', background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 15, letterSpacing: '.06em', animation: 'pulseGlow 2.6s ease-out infinite' }
    : { padding: '17px 26px', borderRadius: 13, textAlign: 'center', background: 'rgba(234,242,255,.05)', color: '#3E5170', fontFamily: AB, fontSize: 15, letterSpacing: '.06em', cursor: 'default' }
}
