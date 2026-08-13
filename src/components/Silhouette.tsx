import type { CSSProperties } from 'react'

/**
 * Portrait placeholder — a neutral head-and-shoulders silhouette on the card's
 * rarity-tinted deep background. Stands in until real member photos are wired.
 */
export function Silhouette({ deep }: { deep: string }) {
  const wrap: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    background: `radial-gradient(120% 80% at 50% 12%, ${deep} 0%, #0A0F18 82%)`,
  }
  return (
    <div style={wrap} aria-hidden>
      <svg
        viewBox="0 0 100 130"
        preserveAspectRatio="xMidYMin slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}
      >
        <defs>
          <linearGradient id="sil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* shoulders */}
        <path d="M6 130 C6 96 28 84 50 84 C72 84 94 96 94 130 Z" fill="url(#sil)" />
        {/* head */}
        <circle cx="50" cy="50" r="26" fill="url(#sil)" />
      </svg>
    </div>
  )
}
