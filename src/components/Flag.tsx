import { flagUrl } from '../data/members'

/** Small square canton-flag chip. */
export function Flag({
  canton,
  name,
  height = 24,
}: {
  canton: string
  name?: string
  height?: number
}) {
  return (
    <img
      src={flagUrl(canton)}
      alt={`${name ?? canton} canton flag`}
      style={{
        height,
        width: height,
        objectFit: 'contain',
        flex: 'none',
        // Some source SVGs encode their white field as transparency.
        background: '#fff',
      }}
    />
  )
}
