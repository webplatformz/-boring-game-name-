// Typed access to the build-time member snapshot (src/data/members.json).
import raw from './members.json'
import type { RarityKey } from '../theme'

export type { RarityKey }

export interface Committee {
  abbr: string
  name: string
  chair: boolean
  role: string
}

/**
 * Display strengths (0-100) of the raw metrics that feed ATK/DEF. Proposal,
 * leadership and committee values are chamber-relative percentiles; voting is
 * the actual eligible-vote participation rate; experience values use the
 * documented capped curves. Federal Councillors expose their separate inputs.
 */
export interface MemberStrengths {
  proposalDrive?: number
  proposalProgress?: number
  leadership?: number
  votingReliability?: number
  committeeWork?: number
  experience?: number
  ageExperience?: number
  officeTenure?: number
  ageNetwork?: number
}

export interface VoteOutcomes {
  yes: number
  no: number
  abstention: number
  notParticipated: number
  excused: number
  presiding: number
  unknown: number
  presentWithoutDecision: number
  eligible: number
  participated: number
  participationRate: number
  source: string
}

export interface MemberScoring {
  proposalCount: number
  proposalPoints: number
  proposalPointsPerYear: number
  matureProposalCount: number
  advancedProposalCount: number
  advancedProposalPoints: number
  advancedProposalPointsPerYear: number
  leadershipPoints: number
  committeeWorkPoints: number
  participationRate: number | null
  experienceYears: number
  ageYears: number
}

/** Ratings and card presentation fields created by this project, not Parliament. */
export interface ProjectDerivedRatings {
  scoring: MemberScoring
  atk: number
  def: number
  ovr: number
  strengths: MemberStrengths
  rarity: RarityKey
  cardNumber: string
}

export type LobbyingSector =
  | 'Economy & finance'
  | 'Health & social'
  | 'Entertainment & hospitality'
  | 'Technology & innovation'
  | 'Sports & recreation'
  | 'Energy & environment'
  | 'Transport & telecom'
  | 'Education & culture'
  | 'Agriculture & food'
  | 'Security & defence'
  | 'Law & justice'
  | 'Foreign affairs'
  | 'Politics & civic'

export interface LobbyingSectorSummary {
  sector: LobbyingSector
  count: number
  paid: number
  leadership: number
}

export interface LobbyingTie {
  organization: string
  role: string
  organizationType: string
  legalType: string
  paid: boolean
  leadership: boolean
  sector: LobbyingSector | null
  committeeOverlap: boolean
  modified: string | null
}

export interface LobbyingDisclosure {
  coverage: 'declared' | 'not_applicable'
  total: number
  paid: number
  leadership: number
  sectorBreadth: number
  committeeOverlaps: number
  classifiedTotal: number
  primarySector: LobbyingSector | null
  sectors: LobbyingSector[]
  sectorBreakdown: LobbyingSectorSummary[]
  ties: LobbyingTie[]
  source: string
}

export interface LargeDonor {
  name: string
  value: number
  kind: string
  sector: LobbyingSector | null
}

export interface DonorSectorSummary {
  sector: LobbyingSector
  count: number
  value: number
}

export interface FinancingDisclosure {
  coverage: 'direct' | 'shared' | 'none' | 'not_applicable'
  election: string
  directIncome: number
  monetaryContributions: number
  nonMonetaryContributions: number
  eventIncome: number
  salesIncome: number
  ownFunds: number
  unallocatedIncome: number
  largeDonorCount: number
  largeDonorTotal: number
  largestDonation: number
  classifiedLargeDonorCount: number
  classifiedLargeDonorTotal: number
  primaryDonorSector: LobbyingSector | null
  donorSectors: DonorSectorSummary[]
  topLargeDonors: LargeDonor[]
  directCampaignCount: number
  sharedCampaignCount: number
  sharedCampaignIncome: number
  dataAsOf: string | null
  source: string
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
  voteOutcomes: VoteOutcomes | null
  /** Explicit boundary around every project-created game rating. */
  ratings: ProjectDerivedRatings
  lobbying: LobbyingDisclosure
  financing: FinancingDisclosure
  mandates: string | null
  portrait: Portrait
}

export interface MembersMeta {
  source: string
  datasetVersion: string
  dataRetrievedAt: string
  algorithmVersion: number
  scoreSources: {
    openData: string
    odata: string
    voting: string
    votingWorkbooks: string
  }
  disclosureSources: {
    interests: string
    financing: string
  }
  portraitSource: string
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
