import raw from './provenance.json'

export type ParliamentDataset = (typeof raw.datasets)[number]

export interface ParliamentProvenance {
  schemaVersion: number
  datasetVersion: string
  legislature: number
  retrievedAt: string
  requiredAttribution: string
  termsUrl: string
  officialRecordLabel: string
  datasets: ParliamentDataset[]
  projectDerivation: {
    label: string
    algorithmVersion: number
    fields: string[]
    notice: string
    termsInterpretation: {
      classification: 'derivation_not_alteration'
      statement: string
    }
  }
}

export const PARLIAMENT_PROVENANCE = raw as ParliamentProvenance
