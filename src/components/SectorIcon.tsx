import type { LobbyingSector } from '../data/members'

export const SECTOR_META: Record<LobbyingSector, { color: string; short: string }> = {
  'Economy & finance': { color: '#74C7FF', short: 'Economy' },
  'Health & social': { color: '#FF8FB5', short: 'Health' },
  'Energy & environment': { color: '#75D99A', short: 'Environment' },
  'Transport & telecom': { color: '#8CD8E8', short: 'Transport' },
  'Education & culture': { color: '#C4A3FF', short: 'Education' },
  'Agriculture & food': { color: '#E8C66A', short: 'Agriculture' },
  'Security & defence': { color: '#A8B8CC', short: 'Security' },
  'Law & justice': { color: '#E0AD75', short: 'Justice' },
  'Foreign affairs': { color: '#82A8FF', short: 'Foreign affairs' },
  'Politics & civic': { color: '#D7B3FF', short: 'Politics' },
}

export function SectorIcon({
  sector,
  size = 12,
  title,
}: {
  sector: LobbyingSector
  size?: number
  title?: string
}) {
  const color = SECTOR_META[sector].color

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', flex: 'none' }}
    >
      {title && <title>{title}</title>}
      {iconPaths(sector)}
    </svg>
  )
}

function iconPaths(sector: LobbyingSector) {
  switch (sector) {
    case 'Economy & finance':
      return (
        <>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M9 12v2h6v-2" />
        </>
      )
    case 'Health & social':
      return <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    case 'Energy & environment':
      return <path d="M20.5 3.5C12 3.5 5 7 5 14c0 3 2 5.5 5 5.5 7 0 10.5-7 10.5-16ZM4 21c3-6 7-9 13-12" />
    case 'Transport & telecom':
      return (
        <>
          <rect x="5" y="3" width="14" height="15" rx="3" />
          <path d="M8 18l-2 3M16 18l2 3M5 12h14M8 7h.01M16 7h.01" />
        </>
      )
    case 'Education & culture':
      return <path d="M3 5.5A8.5 8.5 0 0 1 12 7v13a8.5 8.5 0 0 0-9-1.5v-13ZM21 5.5A8.5 8.5 0 0 0 12 7v13a8.5 8.5 0 0 1 9-1.5v-13Z" />
    case 'Agriculture & food':
      return <path d="M12 21V5M12 9c-3 0-5-2-5-5 3 0 5 2 5 5ZM12 14c-3 0-5-2-5-5 3 0 5 2 5 5ZM12 9c3 0 5-2 5-5-3 0-5 2-5 5ZM12 14c3 0 5-2 5-5-3 0-5 2-5 5Z" />
    case 'Security & defence':
      return <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
    case 'Law & justice':
      return <path d="M12 3v18M5 6h14M7 6l-4 7h8L7 6ZM17 6l-4 7h8l-4-7ZM8 21h8" />
    case 'Foreign affairs':
      return <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2c3 3 4.5 6.3 4.5 10S15 19 12 22c-3-3-4.5-6.3-4.5-10S9 5 12 2Z" />
    case 'Politics & civic':
      return <path d="m3 10 9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18M2 10h20" />
  }
}
