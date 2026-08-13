// Typed access to the build-time member snapshot (src/data/members.json).
import raw from './members.json'
import type { RarityKey } from '../theme'

export interface Committee {
  abbr: string
  name: string
  chair: boolean
}

/**
 * Portrait shipped in public/portraits. Every source image is CC BY / CC BY-SA,
 * so `author` and `licence` must be surfaced wherever the image is shown.
 */
export interface Portrait {
  /** Root-relative path, e.g. "/portraits/825.webp". Use `portraitUrl`. */
  src: string
  author: string
  licence: string
  licenceUrl: string | null
  /** Credit line requested by the author, if any. */
  attribution: string | null
  /** Commons file page. */
  source: string
}

export interface Member {
  id: number
  first: string
  last: string
  name: string
  gender: 'm' | 'f' | null
  party: string
  partyCode: string
  partyRaw: string
  parlGroup: string | null
  canton: string
  cantonName: string
  chamber: 'NR' | 'SR' | 'BR'
  chamberName: string
  years: number
  age: number
  committees: Committee[]
  committeeCount: number
  voteCount: number
  atk: number
  def: number
  ovr: number
  rarity: RarityKey
  mandates: string | null
  portrait: Portrait
  no: string
}

export interface MembersMeta {
  source: string
  portraitSource: string
  generatedAt: string
  count: number
  rarity: Record<RarityKey, number>
  note: string
}

const data = raw as unknown as { meta: MembersMeta; members: Member[] }

export const META: MembersMeta = data.meta
export const MEMBERS: Member[] = data.members
export const MEMBERS_BY_ID: Map<number, Member> = new Map(MEMBERS.map((m) => [m.id, m]))

/** URL of a canton's flag SVG (served from public/flags). */
export const flagUrl = (canton: string): string => `${import.meta.env.BASE_URL}flags/${canton}.svg`

/** URL of a member's portrait (served from public/portraits). */
export const portraitUrl = (m: Member): string =>
  `${import.meta.env.BASE_URL}${m.portrait.src.replace(/^\//, '')}`
