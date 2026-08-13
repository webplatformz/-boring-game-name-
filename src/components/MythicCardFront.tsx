import type { CSSProperties } from 'react'
import type { Member } from '../data/members'
import { LEGISLATURE, partyColors } from '../theme'
import { Flag } from './Flag'
import { Portrait, PortraitCredit } from './Portrait'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

const foil =
  'conic-gradient(from 18deg,#5b6dff 0deg,#d5c4ff 46deg,#fff8dc 76deg,#e2b95f 104deg,#5be7ff 146deg,#253d8f 198deg,#a88cff 244deg,#fff3c4 286deg,#5be7ff 324deg,#5b6dff 360deg)'

const surface: CSSProperties = {
  position: 'absolute',
  inset: 4,
  zIndex: 1,
  overflow: 'hidden',
  borderRadius: 14,
  background: '#050914',
  boxShadow: 'inset 0 0 0 1px rgba(225,242,255,.22)',
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

function Corner({ x, y }: { x: 'left' | 'right'; y: 'top' | 'bottom' }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        [x]: 10,
        [y]: 10,
        zIndex: 8,
        width: 18,
        height: 18,
        borderTop: y === 'top' ? '1px solid rgba(255,227,160,.62)' : undefined,
        borderBottom: y === 'bottom' ? '1px solid rgba(255,227,160,.62)' : undefined,
        borderLeft: x === 'left' ? '1px solid rgba(255,227,160,.62)' : undefined,
        borderRight: x === 'right' ? '1px solid rgba(255,227,160,.62)' : undefined,
      }}
    />
  )
}

function lastNameSize(last: string) {
  if (last.length > 20) return 20
  if (last.length > 15) return 23
  if (last.length > 11) return 26
  return 31
}

/** A purpose-built face for the seven Federal Council cards. */
export function MythicCardFront({ member: m, foil: animate = false, style }: { member: Member; foil?: boolean; style?: CSSProperties }) {
  const pc = partyColors(m.partyCode)

  const face: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    borderRadius: 18,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    background: '#070b17',
    isolation: 'isolate',
    ...style,
  }

  return (
    <div className="mythic-card" style={face}>
      {/* The animated finish lives almost entirely on the edge, leaving the portrait clean. */}
      <div
        aria-hidden
        className={animate ? 'mythic-edge-spin' : undefined}
        style={{ position: 'absolute', inset: '-48%', background: foil, filter: 'saturate(.85) brightness(1.08)' }}
      />

      <div style={surface}>
        <Portrait member={m} deep="#142343" />

        {/* Deep portrait treatment: cool at the crown, black velvet behind the archive block. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(84% 53% at 50% 20%,transparent 40%,rgba(4,8,20,.32) 82%,rgba(4,8,20,.68) 100%),linear-gradient(180deg,rgba(4,9,22,.56) 0%,rgba(8,13,29,.1) 22%,rgba(8,13,29,0) 38%,rgba(5,9,20,.56) 56%,#050914 78%,#03060e 100%)',
          }}
        />

        {/* Ceremonial geometry and moving diffraction stay away from the face. */}
        <div
          aria-hidden
          className="mythic-orbit"
          style={{
            position: 'absolute',
            left: '50%',
            top: 34,
            width: 268,
            height: 268,
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            border: '1px solid rgba(112,220,255,.14)',
            boxShadow: '0 0 0 18px rgba(173,147,255,.035),0 0 0 44px rgba(255,221,139,.025)',
            maskImage: 'linear-gradient(90deg,#000,transparent 31%,transparent 69%,#000)',
            WebkitMaskImage: 'linear-gradient(90deg,#000,transparent 31%,transparent 69%,#000)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.15,
            backgroundImage:
              'linear-gradient(115deg,transparent 0 21%,rgba(121,217,255,.28) 21.2%,transparent 21.7% 76%,rgba(255,221,139,.2) 76.2%,transparent 76.7%)',
          }}
        />
        <div
          aria-hidden
          className={animate ? 'mythic-prism-shift' : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            opacity: animate ? 0.5 : 0.22,
            background:
              'linear-gradient(118deg,transparent 5%,rgba(64,218,255,.8) 20%,transparent 34%,rgba(196,128,255,.72) 52%,rgba(255,89,208,.58) 61%,transparent 73%,rgba(255,223,126,.82) 89%,transparent 98%)',
            backgroundSize: '240% 240%',
            mixBlendMode: 'color-dodge',
            maskImage: 'radial-gradient(58% 43% at 50% 27%,transparent 0 46%,rgba(0,0,0,.22) 67%,#000 100%)',
            WebkitMaskImage: 'radial-gradient(58% 43% at 50% 27%,transparent 0 46%,rgba(0,0,0,.22) 67%,#000 100%)',
          }}
        />
        {animate && <div aria-hidden className="mythic-light-pass" />}

        {/* OVR uses the same top-left position as every other card. */}
        <div
          style={{
            position: 'absolute',
            zIndex: 7,
            left: 16,
            top: 16,
          }}
        >
          <div
            style={{
              fontFamily: AB,
              fontSize: 49,
              lineHeight: 0.86,
              letterSpacing: '-.055em',
              color: '#D9C89E',
              textShadow: '0 0 14px rgba(217,200,158,.3)',
            }}
          >
            {m.ovr}
          </div>
        </div>

        {/* Same rarity chrome as the standard cards, with a Mythic-only finish. */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 20,
            zIndex: 7,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
          }}
        >
          <div
            className="mythic-rarity-tag"
            style={{
              pointerEvents: 'none',
              padding: '5px 12px 5px 14px',
              borderRadius: '99px 0 0 99px',
              background: 'linear-gradient(100deg,#63E8FF,#A787FF 36%,#FF7ACF 68%,#FFE394)',
              backgroundSize: '240% 100%',
              fontFamily: AB,
              fontSize: 10,
              letterSpacing: '.2em',
              color: '#07101D',
            }}
          >
            MYTHIC
          </div>
          <div style={legislatureTagStyle}>L {LEGISLATURE}</div>
        </div>

        {/* Identity block floats over the portrait instead of splitting it into two cards. */}
        <div style={{ position: 'absolute', zIndex: 7, left: 16, right: 16, bottom: 29 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 1, background: 'linear-gradient(90deg,#FFE29D,rgba(255,226,157,.12))' }} />
            <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: '.22em', color: '#D9C89E' }}>
              FEDERAL COUNCILLOR
            </span>
          </div>

          <div
            style={{
              marginTop: 8,
              fontFamily: AB,
              fontSize: lastNameSize(m.last),
              lineHeight: 0.95,
              letterSpacing: '-.035em',
              color: '#D9C89E',
              textShadow: '0 0 14px rgba(217,200,158,.22)',
              whiteSpace: 'nowrap',
            }}
          >
            {m.first.toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 3,
              fontFamily: AB,
              fontSize: lastNameSize(m.last),
              lineHeight: 0.95,
              letterSpacing: '-.035em',
              color: '#D9C89E',
              textShadow: '0 0 14px rgba(217,200,158,.22)',
              whiteSpace: 'nowrap',
            }}
          >
            {m.last.toUpperCase()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, minWidth: 0 }}>
            <span
              style={{
                padding: '3px 7px',
                borderRadius: 3,
                background: pc[0],
                fontFamily: AB,
                fontSize: 7.5,
                letterSpacing: '.08em',
                color: pc[1],
                boxShadow: '0 3px 10px rgba(0,0,0,.35)',
              }}
            >
              {m.party}
            </span>
            <Flag canton={m.canton} name={m.cantonName} height={16} />
            <span
              style={{
                minWidth: 0,
                fontFamily: MONO,
                fontSize: 7.5,
                letterSpacing: '.1em',
                color: '#A8B7CF',
                whiteSpace: 'nowrap',
              }}
            >
              {m.cantonName.toUpperCase()} · {m.years} YRS · AGE {m.age}
            </span>
          </div>
        </div>

        <PortraitCredit member={m} style={{ position: 'absolute', zIndex: 7, left: 16, right: 16, bottom: 10, color: '#425371' }} />

        <Corner x="left" y="top" />
        <Corner x="right" y="top" />
        <Corner x="left" y="bottom" />
        <Corner x="right" y="bottom" />
      </div>
    </div>
  )
}
