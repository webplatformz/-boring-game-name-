import { useId, useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { FinancingDisclosure, LobbyingDisclosure, LobbyingSector, Member } from '../data/members'
import { OverflowTooltip } from './OverflowTooltip'
import { SECTOR_META, SectorIcon } from './SectorIcon'
import { useI18n } from '../i18n'
import type { Language, TranslationKey } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export type DisclosureKind = 'ties' | 'camp'

const STYLE = {
  ties: { label: 'TIES', color: '#B9A6FF', muted: '#8F7DD6' },
  camp: { label: 'CAMP', color: '#FFD36A', muted: '#B8994F' },
} as const

function stopPointer(e: ReactPointerEvent<HTMLElement>) {
  e.stopPropagation()
}

function money(value: number, language: Language): string {
  const locale = { en: 'en-CH', de: 'de-CH', fr: 'fr-CH', it: 'it-CH' }[language]
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(value)
}

export function compactMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(Math.round(value))
}

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string

function displayedValue(member: Member, kind: DisclosureKind, t: Translate): string {
  if (kind === 'ties') {
    return member.lobbying.coverage === 'not_applicable' ? t('notApplicable') : String(member.lobbying.total)
  }
  const finance = member.financing
  if (finance.coverage === 'not_applicable') return t('notApplicable')
  if (finance.coverage === 'direct') return compactMoney(finance.directIncome)
  if (finance.coverage === 'shared') return `${compactMoney(finance.sharedCampaignIncome)}\n${t('pool')}`
  return '—'
}

function Metric({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'contents' }}>
      <span style={{ color: '#8294AD' }}>{label}</span>
      <span style={{ color: color ?? '#E6EEF8', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function SectorPill({ sector, detail }: { sector: LobbyingSector; detail: string }) {
  const { sector: sectorName } = useI18n()
  const meta = SECTOR_META[sector]
  return (
    <span
      title={sectorName(sector)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        minWidth: 0,
        padding: '2px 5px',
        borderRadius: 99,
        border: `1px solid ${meta.color}42`,
        background: `${meta.color}12`,
        color: meta.color,
        whiteSpace: 'nowrap',
      }}
    >
      <SectorIcon sector={sector} size={10} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{sectorName(sector)}</span>
      <span style={{ color: '#8294AD' }}>{detail}</span>
    </span>
  )
}

function TiesTooltip({ disclosure, sectorFilter }: { disclosure: LobbyingDisclosure; sectorFilter: LobbyingSector | null }) {
  const { t, sector: sectorName } = useI18n()
  if (disclosure.coverage === 'not_applicable') {
    return <div style={{ color: '#97A8BF' }}>{t('tiesNotApplicable')}</div>
  }
  const ties = sectorFilter ? disclosure.ties.filter((tie) => tie.sector === sectorFilter) : disclosure.ties
  return (
    <>
      {sectorFilter ? (
        <div style={{ marginBottom: 7 }}>
          <SectorPill sector={sectorFilter} detail={String(ties.length)} />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 7, color: '#97A8BF' }}>
            {t('tiesIntro')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px' }}>
            <Metric label={t('declaredInterests')} value={disclosure.total} />
            <Metric label={t('paidMandates')} value={disclosure.paid} color="#D7CAFF" />
            <Metric label={t('leadershipRolesMetric')} value={disclosure.leadership} />
            <Metric label={t('committeeOverlaps')} value={disclosure.committeeOverlaps} />
            <Metric label={t('classifiedLinks')} value={`${disclosure.classifiedTotal} / ${disclosure.total}`} />
          </div>
          {disclosure.sectorBreakdown.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
              {disclosure.sectorBreakdown.slice(0, 3).map((summary) => (
                <SectorPill key={summary.sector} sector={summary.sector} detail={String(summary.count)} />
              ))}
            </div>
          )}
        </>
      )}
      {ties.length > 0 && (
        <div style={{ marginTop: sectorFilter ? 0 : 8, paddingTop: 7, borderTop: '1px solid rgba(185,166,255,.2)' }}>
          <div style={{ marginBottom: 3, color: '#B9A6FF', fontSize: 7.5, letterSpacing: '.08em' }}>
            {t('declaredInterestsTitle')}
          </div>
          <div style={{ maxHeight: 104, overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: 3 }}>
            {ties.map((tie) => (
              <div key={`${tie.organization}-${tie.role}`} style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, color: '#E7E0FF' }}>
                  {tie.sector && <SectorIcon sector={tie.sector} size={10} title={sectorName(tie.sector)} />}
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tie.organization}
                  </span>
                </div>
                <div
                  style={{
                    color: '#7388A5',
                    fontSize: 8,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {tie.role}
                  {tie.paid ? ` · ${t('paid')}` : ` · ${t('unpaid')}`}
                  {tie.committeeOverlap ? ` · ${t('committeeMatch')}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function DirectFinance({ disclosure, sectorFilter }: { disclosure: FinancingDisclosure; sectorFilter: LobbyingSector | null }) {
  const { language, t, sector: sectorName } = useI18n()
  if (sectorFilter) {
    const donors = disclosure.topLargeDonors.filter((donor) => donor.sector === sectorFilter)
    const summary = disclosure.donorSectors.find((item) => item.sector === sectorFilter)
    return (
      <>
        <div style={{ marginBottom: 7 }}>
          <SectorPill sector={sectorFilter} detail={summary ? money(summary.value, language) : String(donors.length)} />
        </div>
        {donors.length > 0 && (
          <div style={{ paddingTop: 7, borderTop: '1px solid rgba(255,211,106,.2)' }}>
            <div style={{ marginBottom: 3, color: '#FFD36A', fontSize: 7.5, letterSpacing: '.08em' }}>
              {t('namedGifts')}
            </div>
            {donors.map((donor) => (
              <div key={`${donor.name}-${donor.value}`} style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#F4E7C5' }}>
                  {donor.name}
                </span>
                <span style={{ color: '#FFD36A', whiteSpace: 'nowrap' }}>{money(donor.value, language)}</span>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }
  return (
    <>
      <div style={{ marginBottom: 7, color: '#97A8BF' }}>
        {t('financeIntro')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px' }}>
        <Metric label={t('directIncome')} value={money(disclosure.directIncome, language)} color="#FFE4A2" />
        <Metric label={t('monetaryContributions')} value={money(disclosure.monetaryContributions, language)} />
        <Metric label={t('nonMonetary')} value={money(disclosure.nonMonetaryContributions, language)} />
        <Metric label={t('eventsSales')} value={money(disclosure.eventIncome + disclosure.salesIncome, language)} />
        <Metric label={t('ownFunds')} value={money(disclosure.ownFunds, language)} />
        {Math.abs(disclosure.unallocatedIncome) >= 1 && (
          <Metric label={t('unallocatedResidual')} value={money(disclosure.unallocatedIncome, language)} />
        )}
        <Metric label={t('namedGifts')} value={`${disclosure.largeDonorCount} · ${money(disclosure.largeDonorTotal, language)}`} />
        {disclosure.largeDonorCount > 0 && (
          <Metric
            label={t('classifiedGifts')}
            value={`${disclosure.classifiedLargeDonorCount} · ${money(disclosure.classifiedLargeDonorTotal, language)}`}
          />
        )}
      </div>
      {disclosure.donorSectors.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
          {disclosure.donorSectors.slice(0, 3).map((summary) => (
            <SectorPill key={summary.sector} sector={summary.sector} detail={money(summary.value, language)} />
          ))}
        </div>
      )}
      {disclosure.topLargeDonors.length > 0 && (
        <div style={{ marginTop: 7, paddingTop: 6, borderTop: '1px solid rgba(255,211,106,.2)' }}>
          {disclosure.topLargeDonors.map((donor) => (
            <div key={`${donor.name}-${donor.value}`} style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, color: '#F4E7C5' }}>
                {donor.sector && <SectorIcon sector={donor.sector} size={10} title={sectorName(donor.sector)} />}
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {donor.name}
                </span>
              </span>
              <span style={{ color: '#FFD36A', whiteSpace: 'nowrap' }}>{money(donor.value, language)}</span>
            </div>
          ))}
        </div>
      )}
      {disclosure.sharedCampaignCount > 0 && (
        <div style={{ marginTop: 7, color: '#8294AD' }}>
          {t(disclosure.sharedCampaignCount === 1 ? 'sharedPoolsPlus' : 'sharedPoolsPlusPlural', {
            count: disclosure.sharedCampaignCount,
            amount: money(disclosure.sharedCampaignIncome, language),
          })}
        </div>
      )}
    </>
  )
}

function CampTooltip({ disclosure, sectorFilter }: { disclosure: FinancingDisclosure; sectorFilter: LobbyingSector | null }) {
  const { language, t } = useI18n()
  if (disclosure.coverage === 'not_applicable') {
    return <div style={{ color: '#97A8BF' }}>{t('financeNotApplicable')}</div>
  }
  if (disclosure.coverage === 'none') {
    return (
      <div style={{ color: '#97A8BF' }}>
        {t('financeNone')}
      </div>
    )
  }
  if (disclosure.coverage === 'shared') {
    return (
      <>
        <div style={{ marginBottom: 7, color: '#97A8BF' }}>
          {t('financeShared')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px' }}>
          <Metric label={t('sharedCampaignPools')} value={disclosure.sharedCampaignCount} />
          <Metric label={t('wholePoolIncome')} value={money(disclosure.sharedCampaignIncome, language)} color="#FFE4A2" />
          <Metric label={t('personallyAttributed')} value={t('notAvailable')} />
        </div>
      </>
    )
  }
  return <DirectFinance disclosure={disclosure} sectorFilter={sectorFilter} />
}

export function DisclosureStat({
  member,
  kind,
  open,
  onToggle,
  compact = false,
  sectorFilter = null,
}: {
  member: Member
  kind: DisclosureKind
  open: boolean
  onToggle: () => void
  compact?: boolean
  sectorFilter?: LobbyingSector | null
}) {
  const { t, sector: sectorName } = useI18n()
  const tooltipId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const appearance = { ...STYLE[kind], label: t(kind === 'ties' ? 'ties' : 'camp') }
  const value = displayedValue(member, kind, t)
  const accessibleValue = value.replace('\n', ' ')
  const [primaryValue, secondaryValue] = value.split('\n')
  const compactValue = primaryValue.length > 6
  const label = kind === 'ties' ? t('tiesMetricName') : t('campMetricName')
  const sector = kind === 'camp' ? member.financing.primaryDonorSector : null

  const root: CSSProperties = {
    position: 'relative',
    minWidth: 0,
    background: compact ? 'rgba(6,11,21,.72)' : '#0B121D',
    borderRadius: compact ? 5 : undefined,
    border: compact ? `1px solid ${appearance.color}2e` : undefined,
  }

  return (
    <div style={root}>
      <button
        ref={buttonRef}
        data-card-tooltip-interactive
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        aria-label={`${appearance.label} ${accessibleValue}${sector ? `. ${t('leadingSectorAria', { sector: sectorName(sector) })}` : ''}. ${t('showMetricsAria', { label })}`}
        onPointerDown={stopPointer}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        style={{
          width: '100%',
          height: '100%',
          padding: compact ? '3px 7px' : '7px 4px',
          border: 0,
          background: 'transparent',
          color: 'inherit',
          textAlign: 'center',
          cursor: 'help',
          touchAction: 'manipulation',
          display: compact ? 'flex' : 'grid',
          gridTemplateRows: compact ? undefined : '10px 16px',
          alignContent: compact ? undefined : 'start',
          alignItems: compact ? 'baseline' : undefined,
          gap: compact ? 5 : 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            height: compact ? undefined : 10,
            fontFamily: MONO,
            fontSize: compact ? 7 : 8,
            lineHeight: compact ? undefined : '10px',
            letterSpacing: '.12em',
            color: appearance.muted,
          }}
        >
          <span>{appearance.label}</span>
          <span aria-hidden style={{ fontSize: 7 }}>ⓘ</span>
        </div>
        <div
          style={{
            fontFamily: AB,
            fontSize: compact ? (compactValue ? 8 : 10) : compactValue ? 10 : 13,
            height: compact ? undefined : 16,
            lineHeight: compact ? undefined : '16px',
            whiteSpace: 'nowrap',
            color: appearance.color,
            display: secondaryValue ? 'flex' : 'block',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: secondaryValue ? 4 : undefined,
          }}
        >
          {primaryValue}
          {secondaryValue && (
            <span
              style={{
                fontFamily: MONO,
                fontSize: compact ? 7 : 8,
                letterSpacing: '.12em',
                color: appearance.muted,
              }}
            >
              {secondaryValue}
            </span>
          )}
        </div>
      </button>

      {open && (compact ? (
        <OverflowTooltip anchor={buttonRef} width={284}>
          <Tooltip member={member} kind={kind} tooltipId={tooltipId} compact sectorFilter={sectorFilter} />
        </OverflowTooltip>
      ) : (
        <Tooltip member={member} kind={kind} tooltipId={tooltipId} compact={false} sectorFilter={sectorFilter} />
      ))}
    </div>
  )
}

function Tooltip({
  member,
  kind,
  tooltipId,
  compact,
  sectorFilter,
}: {
  member: Member
  kind: DisclosureKind
  tooltipId: string
  compact: boolean
  sectorFilter: LobbyingSector | null
}) {
  const { t } = useI18n()
  const appearance = STYLE[kind]
  const source = kind === 'ties' ? member.lobbying.source : member.financing.source

  return (
        <div
          id={tooltipId}
          data-card-tooltip-interactive
          role="tooltip"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: compact ? 'relative' : 'absolute',
            right: compact ? undefined : kind === 'camp' ? 0 : -88,
            bottom: compact ? undefined : 'calc(100% + 8px)',
            zIndex: 40,
            width: compact ? '100%' : 284,
            padding: '10px 11px',
            borderRadius: 9,
            border: `1px solid ${appearance.color}66`,
            background: 'rgba(5,9,17,.98)',
            boxShadow: '0 14px 34px rgba(0,0,0,.58)',
            color: '#C8D6E8',
            fontFamily: MONO,
            fontSize: 8.5,
            lineHeight: 1.4,
            letterSpacing: '.01em',
            textAlign: 'left',
          }}
        >
          <div style={{ marginBottom: 5, color: appearance.color, fontFamily: AB, fontSize: 10, letterSpacing: '.08em' }}>
            {kind === 'ties' ? t('disclosedLinks') : t('campaignFinancing')}
          </div>
          {kind === 'ties' ? (
            <TiesTooltip disclosure={member.lobbying} sectorFilter={sectorFilter} />
          ) : (
            <CampTooltip disclosure={member.financing} sectorFilter={sectorFilter} />
          )}
          <a
            href={source}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            style={{ display: 'inline-block', marginTop: 8, color: appearance.muted, fontSize: 7.5 }}
          >
            {t('officialSource')}
          </a>
        </div>
  )
}
