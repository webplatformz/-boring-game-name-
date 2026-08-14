import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { LobbyingSector, Member } from '../data/members'
import { LEGISLATURE, STRIPES, SWEEP, TIERS, partyColors } from '../theme'
import { Portrait, PortraitCredit } from './Portrait'
import { Flag } from './Flag'
import { MythicCardFront } from './MythicCardFront'
import { ScoreStat, type ScoreKind } from './ScoreStat'
import { DisclosureStat, type DisclosureKind } from './DisclosureStat'
import { CommitteeStat } from './CommitteeStat'
import { SectorIcon } from './SectorIcon'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

// Foil wedge (top-left triangle) shown on the higher tiers.
function wedgeStyle(wedge: string | null): CSSProperties {
  if (!wedge) return { display: 'none' }
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    pointerEvents: 'none',
    clipPath: 'polygon(0 0,44% 0,0 62%)',
    background: wedge,
    opacity: 0.94,
    mixBlendMode: 'screen',
  }
}
function wedgeFoilStyle(wedge: string | null, animate: boolean): CSSProperties {
  if (!wedge) return { display: 'none' }
  return {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    clipPath: 'polygon(0 0,44% 0,0 62%)',
    overflow: 'hidden',
    opacity: animate ? 0.38 : 0.16,
    background: SWEEP,
    backgroundSize: '220% 100%',
    animation: animate ? 'slide 5s linear infinite' : undefined,
  }
}
function bandStyle(animate: boolean): CSSProperties {
  if (!animate) return { display: 'none' }
  return {
    position: 'absolute',
    left: -60,
    right: -60,
    top: 'calc(100% - 183px)',
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    opacity: 0.28,
    background: STRIPES,
    maskImage: 'linear-gradient(180deg,transparent 0,#000 14px)',
    WebkitMaskImage: 'linear-gradient(180deg,transparent 0,#000 14px)',
    animation: 'stripePan 3.5s linear infinite',
  }
}
function hairlineStyle(animate: boolean): CSSProperties {
  if (!animate) return { display: 'none' }
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 'calc(100% - 183px)',
    height: 1,
    pointerEvents: 'none',
    background:
      'linear-gradient(90deg,transparent,rgba(255,197,61,.45) 22%,rgba(255,255,255,.55) 50%,rgba(255,197,61,.45) 78%,transparent)',
  }
}
function tagStyle(label: string, c: string, ink: string): CSSProperties {
  const bg = label === 'LEGENDARY' ? 'linear-gradient(90deg,rgba(255,197,61,.15),#FFC53D)' : c
  const fg =
    label === 'COMMON' ? '#0A0F18' : label === 'RARE' ? '#EAF2FF' : label === 'ULTRA RARE' ? '#ffffff' : ink
  return {
    pointerEvents: 'none',
    padding: '5px 12px 5px 14px',
    borderRadius: '99px 0 0 99px',
    background: bg,
    fontFamily: AB,
    fontSize: 10,
    letterSpacing: '.2em',
    color: fg,
  }
}

const legislatureTagStyle: CSSProperties = {
  pointerEvents: 'none',
  padding: '3px 12px 3px 14px',
  borderRadius: '99px 0 0 99px',
  background: 'rgba(7,12,19,.55)',
  border: '1px solid rgba(234,242,255,.16)',
  borderRight: 'none',
  fontFamily: MONO,
  fontSize: 8.5,
  letterSpacing: '.16em',
  color: '#8FA3BD',
}

/**
 * The card's front face. Renders as an absolutely-positioned face filling its
 * parent (which supplies perspective/flip). `foil` turns on the animated shimmer
 * for ultra/legendary pulls. `style` merges onto the face box (per-position
 * shadow + ring from the caller).
 */
export function CardFront({
  member: m,
  foil = false,
  style,
  highlightStat = null,
  hideStats = false,
}: {
  member: Member
  foil?: boolean
  style?: CSSProperties
  /** Battle mode: draws attention to the stat that decided a round. No-op elsewhere. */
  highlightStat?: 'atk' | 'def' | null
  /** Battle mode: masks ATK/DEF (numbers + bars) with placeholders so the
   * opponent's stats stay secret until the player has committed to an
   * action. No-op elsewhere (and already a no-op for mythic cards, which
   * hide their stat block regardless). */
  hideStats?: boolean
}) {
  const [openMetric, setOpenMetric] = useState<ScoreKind | DisclosureKind | 'cmte' | null>(null)
  const [hoveredSector, setHoveredSector] = useState<LobbyingSector | null>(null)

  if (m.rarity === 'mythic') {
    return (
      <MythicCardFront
        member={m}
        foil={foil}
        style={style}
        highlightStat={highlightStat}
        hideStats={hideStats}
      />
    )
  }

  const t = TIERS[m.rarity]
  const animate = foil && (m.rarity === 'ultra' || m.rarity === 'legend')
  const pc = partyColors(m.partyCode)
  const ovrInk = t.wedge ? t.ink : '#ffffff'
  const accent = t.ovrTint
  const sub = `${m.cantonName} · ${m.years} ${m.years === 1 ? 'YEAR SERVED' : 'YEARS SERVED'} · ${m.chamber}`
  const cardSectors = [...m.lobbying.sectors]
  if (m.financing.primaryDonorSector && !cardSectors.includes(m.financing.primaryDonorSector)) {
    cardSectors.push(m.financing.primaryDonorSector)
  }

  const face: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 18,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    background: '#0A0F18',
    ...style,
  }

  return (
    <div style={face}>
      <Portrait member={m} deep={t.deep} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,rgba(7,12,19,.7) 0%,rgba(7,12,19,.1) 26%,rgba(7,12,19,.78) 58%,#070C13 84%)',
        }}
      />
      <div style={wedgeStyle(t.wedge)} />
      <div style={wedgeFoilStyle(t.wedge, animate)} />
      <div style={bandStyle(animate)} />
      <div style={hairlineStyle(animate)} />
      {/* top-left: OVR, party, flag, chamber */}
      <div style={{ position: 'absolute', left: 16, top: 12, zIndex: 5 }}>
        <div style={{ fontFamily: AB, fontSize: 72, lineHeight: 0.86, letterSpacing: '-.04em', color: ovrInk }}>
          {m.ovr}
        </div>
        <div
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 22,
            marginTop: 12,
            marginRight: 8,
            marginLeft: 4,
          }}
        >
          <div
            style={{
              padding: '4px 9px',
              borderRadius: 5,
              fontFamily: AB,
              fontSize: 10,
              letterSpacing: '.1em',
              background: pc[0],
              color: pc[1],
              boxShadow: '0 2px 6px rgba(0,0,0,.35)',
            }}
          >
            {m.party}
          </div>
          <Flag canton={m.canton} name={m.cantonName} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 20,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
        }}
      >
        <div style={tagStyle(t.label, t.c, t.ink)}>{t.label}</div>
        <div style={legislatureTagStyle}>L {LEGISLATURE}</div>
        {cardSectors.length > 0 && (
          <div
            aria-label={`Sectors: ${cardSectors.join(', ')}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              paddingRight: 8,
            }}
          >
            {cardSectors.map((sector, index) => (
              <span
                key={sector}
                tabIndex={0}
                aria-label={`Sector: ${sector}`}
                aria-describedby={hoveredSector === sector ? `sector-tooltip-${m.id}-${index}` : undefined}
                onMouseEnter={() => setHoveredSector(sector)}
                onMouseLeave={() => setHoveredSector(null)}
                onFocus={() => setHoveredSector(sector)}
                onBlur={() => setHoveredSector(null)}
                style={{
                  display: 'grid',
                  position: 'relative',
                  width: 22,
                  height: 22,
                  placeItems: 'center',
                  borderRadius: 99,
                  border: '1px solid rgba(185,166,255,.28)',
                  background: 'rgba(7,12,19,.55)',
                  boxShadow: '0 3px 10px rgba(0,0,0,.28)',
                  outline: 'none',
                }}
              >
                <SectorIcon sector={sector} size={11} />
                {hoveredSector === sector && (
                  <span
                    id={`sector-tooltip-${m.id}-${index}`}
                    role="tooltip"
                    style={{
                      position: 'absolute',
                      right: 'calc(100% + 6px)',
                      top: '50%',
                      zIndex: 10,
                      padding: '4px 7px',
                      transform: 'translateY(-50%)',
                      borderRadius: 5,
                      border: '1px solid rgba(185,166,255,.35)',
                      background: 'rgba(5,9,17,.96)',
                      boxShadow: '0 6px 16px rgba(0,0,0,.4)',
                      color: '#D7CAFF',
                      fontFamily: MONO,
                      fontSize: 7.5,
                      letterSpacing: '.06em',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    {sector.toUpperCase()}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* bottom block: name, sub, ATK/DEF, stat grid */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 5,
          padding: '0 16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontFamily: AB, fontSize: 27, lineHeight: 0.98, color: '#fff', letterSpacing: '-.025em' }}>
            {m.name.toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: MONO,
              fontSize: 9.5,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {sub}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          {hideStats ? (
            <>
              <HiddenScore label="ATK" color="#FF9EC4" />
              <HiddenScore label="DEF" color="#8FEDE3" />
            </>
          ) : (
            <>
              <ScoreStat
                member={m}
                kind="atk"
                open={openMetric === 'atk'}
                onToggle={() => setOpenMetric((current) => (current === 'atk' ? null : 'atk'))}
                highlighted={highlightStat === 'atk'}
              />
              <ScoreStat
                member={m}
                kind="def"
                open={openMetric === 'def'}
                onToggle={() => setOpenMetric((current) => (current === 'def' ? null : 'def'))}
                highlighted={highlightStat === 'def'}
              />
            </>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, paddingBottom: 4 }}>
            {hideStats ? (
              <>
                <HiddenBar />
                <HiddenBar />
              </>
            ) : (
              <>
                <Bar pct={m.atk} from="#FF3D8B" to="#FF9EC4" />
                <Bar pct={m.def} from="#2FD3C4" to="#8FEDE3" />
              </>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 1,
            background: 'rgba(234,242,255,.14)',
            borderRadius: 8,
            overflow: 'visible',
          }}
        >
          <Stat label="AGE" value={m.age} />
          <CommitteeStat
            member={m}
            open={openMetric === 'cmte'}
            onToggle={() => setOpenMetric((current) => (current === 'cmte' ? null : 'cmte'))}
          />
          <DisclosureStat
            member={m}
            kind="ties"
            open={openMetric === 'ties'}
            onToggle={() => setOpenMetric((current) => (current === 'ties' ? null : 'ties'))}
          />
          <DisclosureStat
            member={m}
            kind="camp"
            open={openMetric === 'camp'}
            onToggle={() => setOpenMetric((current) => (current === 'camp' ? null : 'camp'))}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -4 }}>
          <PortraitCredit member={m} style={{ flex: 1, minWidth: 0 }} />
          <div style={{ flex: 'none', fontFamily: MONO, fontSize: 6.5, letterSpacing: '.1em', color: '#8B7334' }}>
            #{m.no}
          </div>
        </div>
      </div>
    </div>
  )
}

function Bar({ pct, from, to }: { pct: number; from: string; to: string }) {
  return (
    <div style={{ height: 5, borderRadius: 99, background: 'rgba(234,242,255,.14)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${from},${to})` }} />
    </div>
  )
}

// Battle mode: stands in for Bar when a stat is hidden — a static, neutral
// track (no dynamic width) so it can't leak the real value's relative size.
function HiddenBar() {
  return (
    <div
      style={{
        height: 5,
        borderRadius: 99,
        background:
          'repeating-linear-gradient(90deg, rgba(234,242,255,.14) 0px, rgba(234,242,255,.14) 5px, rgba(234,242,255,.05) 5px, rgba(234,242,255,.05) 10px)',
      }}
    />
  )
}

function HiddenScore({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ flex: 'none' }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.18em', color }}>{label}</div>
      <div style={{ fontFamily: AB, fontSize: 36, lineHeight: 0.9, color }}>?</div>
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '10px 16px',
        alignContent: 'start',
        background: '#0B121D',
        padding: '7px 4px',
        textAlign: 'center',
      }}
    >
      <div style={{ height: 10, fontFamily: MONO, fontSize: 8, lineHeight: '10px', letterSpacing: '.12em', color: '#5C7391' }}>
        {label}
      </div>
      <div style={{ height: 16, fontFamily: AB, fontSize: 13, lineHeight: '16px', color: accent ? '#FFC53D' : '#EAF2FF' }}>
        {value}
      </div>
    </div>
  )
}
