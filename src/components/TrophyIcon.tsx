/** Simple stroke-based trophy icon, matching the line-icon style used across the app (see SectorIcon). */
export function TrophyIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
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
      aria-hidden="true"
    >
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a2 2 0 0 0 0 4c.4 1.4 1.15 2.5 2.2 3.2" />
      <path d="M16 5h3a2 2 0 0 1 0 4c-.4 1.4-1.15 2.5-2.2 3.2" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 16.5c0 1.4.9 2.5 2 3.5 1.1-1 2-2.1 2-3.5" />
    </svg>
  )
}
