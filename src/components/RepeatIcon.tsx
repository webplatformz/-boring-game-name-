/** Circular arrows for achievements that can award their reward more than once. */
export function RepeatIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
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
      data-icon="repeat"
    >
      <path d="M20 7h-5V2" />
      <path d="M19 7a8 8 0 0 0-13.7-2.1L4 6" />
      <path d="M4 17h5v5" />
      <path d="M5 17a8 8 0 0 0 13.7 2.1L20 18" />
    </svg>
  )
}
