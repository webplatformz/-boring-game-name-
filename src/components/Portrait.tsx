import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Member } from '../data/members'
import { portraitUrl } from '../data/members'
import { Silhouette } from './Silhouette'

const MONO = "'IBM Plex Mono',monospace"

/** Member photo filling the card's portrait area, falling back to the Silhouette. */
export function Portrait({ member, deep }: { member: Member; deep: string }) {
  const [failed, setFailed] = useState(false)
  if (!member.portrait || failed) return <Silhouette deep={deep} />

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: `radial-gradient(120% 80% at 50% 12%, ${deep} 0%, #0A0F18 82%)`,
      }}
    >
      <img
        src={portraitUrl(member)}
        alt=""
        onError={() => setFailed(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 18%' }}
      />
    </div>
  )
}

/** Required licence credit line for the member's portrait. */
export function PortraitCredit({ member, style }: { member: Member; style?: CSSProperties }) {
  const p = member.portrait
  if (!p) return null
  const credit = p.attribution ? `${p.author} — ${p.attribution.replace(/^https?:\/\//, '')}` : p.author
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 7,
        letterSpacing: '.04em',
        color: 'rgba(234,242,255,.35)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...style,
      }}
    >
      © {credit} · {p.licence}
    </div>
  )
}
