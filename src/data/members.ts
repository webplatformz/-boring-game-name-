// Typed access to the build-time member snapshot (src/data/members.json).
import raw from './members.json'
import type { RarityKey } from '../theme'

export interface Committee {
  abbr: string
  name: string
  chair: boolean
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
  chamber: 'NR' | 'SR'
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
  no: string
}

export interface MembersMeta {
  source: string
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
