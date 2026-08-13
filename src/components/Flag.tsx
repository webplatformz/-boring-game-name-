import { flagUrl } from '../data/members'

/** Small official cantonal flag chip. Swiss cantonal arms are ~0.83:1 (portrait). */
export function Flag({ canton, name, height = 22 }: { canton: string; name?: string; height?: number }) {
  const showBorder = height >= 15 // Only show border on larger flags
  return (
    <img
      src={flagUrl(canton)}
      alt={name ? `${name} coat of arms` : `${canton} coat of arms`}
      style={{
        height,
        width: 'auto',
        flex: 'none',
        borderRadius: 3,
        boxShadow: showBorder ? '0 0 0 1.5px #0A0F18' : undefined,
        background: showBorder ? '#0A0F18' : undefined,
      }}
    />
  )
}
