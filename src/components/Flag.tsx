import { flagUrl } from '../data/members'

/** Small official cantonal flag chip. Swiss cantonal arms are ~0.83:1 (portrait). */
export function Flag({ canton, name, height = 22 }: { canton: string; name?: string; height?: number }) {
  return (
    <img
      src={flagUrl(canton)}
      alt={name ? `${name} coat of arms` : `${canton} coat of arms`}
      style={{
        height,
        width: 'auto',
        flex: 'none',
        background: 'transparent',
      }}
    />
  )
}
