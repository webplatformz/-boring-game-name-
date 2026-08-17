import raw from './portrait-credits.json'

export interface PortraitCreditRecord {
  memberId: number
  memberName: string
  image: string
  title: string
  author: string
  licence: string
  licenceUrl: string | null
  attribution: string | null
  source: string
  modifications: string
}

export interface PortraitCreditsData {
  meta: {
    source: string
    matchedVia: string
    modificationNotice: string
    count: number
  }
  credits: PortraitCreditRecord[]
}

export const PORTRAIT_CREDITS = raw as PortraitCreditsData
