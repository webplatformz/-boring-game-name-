// Design tokens ported from the Claude Design prototype (app-prototype.dc.html).
// Colours, rarity tiers and foil recipes live here so screens stay declarative.

export type RarityKey = 'common' | 'uncommon' | 'rare' | 'ultra' | 'legend'

export interface Tier {
  label: string
  /** Signature colour (borders, rails, tags). */
  c: string
  /** Deep background tint behind the portrait. */
  deep: string
  /** Ink colour used on the wedge / OVR when a wedge is present. */
  ink: string
  /** Foil wedge gradient, or null for the plain tiers. */
  wedge: string | null
  /** Draw weight — higher = more common in a pack. */
  weight: number
  /** Tint for the OVR sub-label / accents. */
  ovrTint: string
}

export const TIERS: Record<RarityKey, Tier> = {
  common: { label: 'COMMON', c: '#7C8B99', deep: '#243447', ink: '#ffffff', wedge: null, weight: 52, ovrTint: '#B9C7D6' },
  uncommon: { label: 'UNCOMMON', c: '#2FD3C4', deep: '#17404A', ink: '#062225', wedge: 'linear-gradient(135deg,#2FD3C4,#1FA89C)', weight: 28, ovrTint: '#8FEDE3' },
  rare: { label: 'RARE', c: '#3B7BFF', deep: '#1B3A6B', ink: '#08183A', wedge: 'linear-gradient(135deg,#3B7BFF,#2FD3C4)', weight: 14, ovrTint: '#7FA8FF' },
  ultra: { label: 'ULTRA RARE', c: '#8B5CF6', deep: '#3B2470', ink: '#1A0B33', wedge: 'linear-gradient(135deg,#8B5CF6,#FF3D8B)', weight: 5, ovrTint: '#C4A6FF' },
  legend: { label: 'LEGENDARY', c: '#FFC53D', deep: '#5C3A08', ink: '#0A0F18', wedge: 'linear-gradient(135deg,#FFC53D,#FF3D8B 60%,#8B5CF6)', weight: 1, ovrTint: '#FFD87A' },
}

export const RARITY_ORDER: RarityKey[] = ['common', 'uncommon', 'rare', 'ultra', 'legend']

// Party chip colours keyed by the `partyCode` the data pipeline emits.
// [background, foreground]. Extended beyond the prototype's six to cover every
// group actually sitting in the Assembly.
export const PARTY: Record<string, [string, string]> = {
  SVP: ['#1F7A3D', '#ffffff'],
  SP: ['#E4002B', '#ffffff'],
  FDP: ['#0E4C92', '#ffffff'],
  MITTE: ['#FF7900', '#0A0F18'],
  GRUENE: ['#7AB800', '#0A0F18'],
  GLP: ['#C4D600', '#0A0F18'],
  EVP: ['#FFD500', '#0A0F18'],
  EDU: ['#A6093D', '#ffffff'],
  LEGA: ['#0F62A8', '#ffffff'],
  MCG: ['#D0021B', '#ffffff'],
  AL: ['#C1121F', '#ffffff'],
  NONE: ['#5C7391', '#ffffff'],
}
export const partyColors = (code: string): [string, string] => PARTY[code] ?? PARTY.NONE

// Foil recipes.
export const STRIPES =
  'repeating-linear-gradient(115deg,#7CF2FF 0 4px,#2FD3C4 4px 9px,#FFF6D0 9px 12px,#FFC53D 12px 18px,#FF3D8B 18px 24px,#8B5CF6 24px 31px,transparent 31px 54px)'
export const SWEEP =
  'linear-gradient(100deg,transparent 32%,rgba(255,255,255,.85) 48%,transparent 62%)'

// Current legislature number, shown on card chrome ("NR · 52").
export const SESSION = 52

// Zig-zag pack silhouette (tear-notched top & bottom edges).
export const PACK_CLIP =
  'polygon(0% 0.00%,6.25% 1.67%,12.50% 0.00%,18.75% 1.67%,25.00% 0.00%,31.25% 1.67%,37.50% 0.00%,43.75% 1.67%,50.00% 0.00%,56.25% 1.67%,62.50% 0.00%,68.75% 1.67%,75.00% 0.00%,81.25% 1.67%,87.50% 0.00%,93.75% 1.67%,100.00% 0.00%,100.00% 100.00%,93.75% 98.33%,87.50% 100.00%,81.25% 98.33%,75.00% 100.00%,68.75% 98.33%,62.50% 100.00%,56.25% 98.33%,50.00% 100.00%,43.75% 98.33%,37.50% 100.00%,31.25% 98.33%,25.00% 100.00%,18.75% 98.33%,12.50% 100.00%,6.25% 98.33%,0.00% 100.00%)'
