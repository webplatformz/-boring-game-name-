import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Member } from '../data/members'
import { portraitUrl } from '../data/members'
import { Silhouette } from './Silhouette'

// The portraits are square (512²), light-background studio shots. Anchoring the
// image to the top of the card puts the face in the upper two thirds and leaves
// the bottom block free for the name/stats. The mask feathers the photo's edges
// into the rarity-tinted background so the light backdrop doesn't box the card.
const MASK = 'radial-gradient(128% 82% at 50% 32%,#000 44%,rgba(0,0,0,.55) 76%,transparent 96%)'

/**
 * The member's photo, on the card's rarity-tinted deep background. Falls back to
 * the neutral {@link Silhouette} if the image is missing or fails to load.
 */
export function Portrait({ member, deep }: { member: Member; deep: string }) {
  const [failed, setFailed] = useState(false)
  if (!member.portrait || failed) return <Silhouette deep={deep} />

  if (failed) return <Silhouette deep={deep} />

  const wrap: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    background: `radial-gradient(120% 80% at 50% 12%, ${deep} 0%, #0A0F18 82%)`,
  }
  const img: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    objectPosition: 'center top',
    maskImage: MASK,
    WebkitMaskImage: MASK,
  }

  return (
    <div style={wrap}>
      <img
        src={portraitUrl(member)}
        alt={`Portrait of ${member.name}`}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        style={img}
      />
    </div>
  )
}

/**
 * Attribution line for a portrait. The Commons sources are CC BY / CC BY-SA,
 * which require crediting the author wherever the image is used.
 */
export function PortraitCredit({ member, style }: { member: Member; style?: CSSProperties }) {
  const { author, licence } = member.portrait
  return (
    <div
      style={{
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 6.5,
        letterSpacing: '.08em',
        lineHeight: 1.2,
        color: '#4A5F7D',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...style,
      }}
    >
      {`PHOTO: ${author} · ${licence} · WIKIMEDIA COMMONS`.toUpperCase()}
    </div>
  )
}
