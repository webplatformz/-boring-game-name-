import raw from './privacy.json'

export interface PrivacyConfiguration {
  schemaVersion: number
  noticeVersion: string
  lastUpdated: string
  controller: {
    name: string | null
    privacyEmail: string | null
  }
  hosting: {
    provider: string | null
    dataLocations: string[]
    subprocessors: string[]
  }
  analytics: {
    provider: string | null
    purpose: string | null
    usesCookies: boolean
    dataLocations: string[]
    retention: string | null
  }
  retention: {
    publishedProfiles: string | null
    sourceSnapshots: string | null
    rightsRequests: string | null
    hostingLogs: string | null
  }
  governance: {
    legalJustificationStatus: 'pending_controller_and_counsel_review' | 'approved'
    dpiaStatus: 'draft_pending_controller_decision' | 'approved' | 'not_required_documented'
    controllerApprovedAt: string | null
    privacyReviewReference: string | null
  }
}

export const PRIVACY_CONFIGURATION = raw as PrivacyConfiguration

export const PRIVACY_CONFIGURATION_MISSING = [
  !raw.controller.name && 'controller.name',
  !raw.controller.privacyEmail && 'controller.privacyEmail',
  !raw.hosting.provider && 'hosting.provider',
  raw.hosting.dataLocations.length === 0 && 'hosting.dataLocations',
  !raw.analytics.provider && 'analytics.provider',
  !raw.analytics.purpose && 'analytics.purpose',
  raw.analytics.dataLocations.length === 0 && 'analytics.dataLocations',
  !raw.analytics.retention && 'analytics.retention',
  !raw.retention.publishedProfiles && 'retention.publishedProfiles',
  !raw.retention.sourceSnapshots && 'retention.sourceSnapshots',
  !raw.retention.rightsRequests && 'retention.rightsRequests',
  !raw.retention.hostingLogs && 'retention.hostingLogs',
].filter((field): field is string => Boolean(field))
