import { useId, useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { FinancingDisclosure, LobbyingDisclosure, Member } from '../data/members'
import { OverflowTooltip } from './OverflowTooltip'

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

function money(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(value)
}

function compactMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(Math.round(value))
}

function displayedValue(member: Member, kind: DisclosureKind): string {
  if (kind === 'ties') {
    return member.lobbying.coverage === 'not_applicable' ? 'N/A' : String(member.lobbying.total)
  }
  const finance = member.financing
  if (finance.coverage === 'not_applicable') return 'N/A'
  if (finance.coverage === 'direct') return compactMoney(finance.directIncome)
  if (finance.coverage === 'shared') return `${compactMoney(finance.sharedCampaignIncome)}\nPOOL`
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

function TiesTooltip({ disclosure }: { disclosure: LobbyingDisclosure }) {
  if (disclosure.coverage === 'not_applicable') {
    return <div style={{ color: '#97A8BF' }}>The parliamentary interests register does not cover Federal Councillors.</div>
  }
  const highlighted = disclosure.ties.slice(0, 3)
  return (
    <>
      <div style={{ marginBottom: 7, color: '#97A8BF' }}>
        Self-declared external interests. Paid means compensated; the amount is not published.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px' }}>
        <Metric label="Declared interests" value={disclosure.total} />
        <Metric label="Paid mandates" value={disclosure.paid} color="#D7CAFF" />
        <Metric label="Leadership roles" value={disclosure.leadership} />
        <Metric label="Committee overlaps" value={disclosure.committeeOverlaps} />
        <Metric label="Classified sectors" value={disclosure.sectorBreadth} />
      </div>
      {highlighted.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid rgba(185,166,255,.2)' }}>
          {highlighted.map((tie) => (
            <div key={`${tie.organization}-${tie.role}`} style={{ marginTop: 4 }}>
              <div style={{ color: '#E7E0FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tie.organization}
              </div>
              <div style={{ color: '#7388A5', fontSize: 8 }}>
                {tie.role}
                {tie.paid ? ' · PAID' : ' · UNPAID'}
                {tie.committeeOverlap ? ' · COMMITTEE MATCH' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function DirectFinance({ disclosure }: { disclosure: FinancingDisclosure }) {
  return (
    <>
      <div style={{ marginBottom: 7, color: '#97A8BF' }}>
        Candidate-specific 2023 EFK final accounts. Shared campaign pools are shown separately.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px' }}>
        <Metric label="Direct campaign income" value={money(disclosure.directIncome)} color="#FFE4A2" />
        <Metric label="Monetary contributions" value={money(disclosure.monetaryContributions)} />
        <Metric label="Non-monetary" value={money(disclosure.nonMonetaryContributions)} />
        <Metric label="Events + sales" value={money(disclosure.eventIncome + disclosure.salesIncome)} />
        <Metric label="Own funds" value={money(disclosure.ownFunds)} />
        {Math.abs(disclosure.unallocatedIncome) >= 1 && (
          <Metric label="Unallocated EFK residual" value={money(disclosure.unallocatedIncome)} />
        )}
        <Metric label="Named gifts > CHF 15k" value={`${disclosure.largeDonorCount} · ${money(disclosure.largeDonorTotal)}`} />
      </div>
      {disclosure.topLargeDonors.length > 0 && (
        <div style={{ marginTop: 7, paddingTop: 6, borderTop: '1px solid rgba(255,211,106,.2)' }}>
          {disclosure.topLargeDonors.map((donor) => (
            <div key={`${donor.name}-${donor.value}`} style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#F4E7C5' }}>
                {donor.name}
              </span>
              <span style={{ color: '#FFD36A', whiteSpace: 'nowrap' }}>{money(donor.value)}</span>
            </div>
          ))}
        </div>
      )}
      {disclosure.sharedCampaignCount > 0 && (
        <div style={{ marginTop: 7, color: '#8294AD' }}>
          Plus {disclosure.sharedCampaignCount} shared pool{disclosure.sharedCampaignCount === 1 ? '' : 's'} totalling{' '}
          {money(disclosure.sharedCampaignIncome)}; none of that pool is allocated to this candidate.
        </div>
      )}
    </>
  )
}

function CampTooltip({ disclosure }: { disclosure: FinancingDisclosure }) {
  if (disclosure.coverage === 'not_applicable') {
    return <div style={{ color: '#97A8BF' }}>Federal Councillors were not candidates in the 2023 federal parliamentary election.</div>
  }
  if (disclosure.coverage === 'none') {
    return (
      <div style={{ color: '#97A8BF' }}>
        No itemized EFK final-account record matched this member. This does not mean CHF 0: campaigns below the legal reporting threshold need no filing.
      </div>
    )
  }
  if (disclosure.coverage === 'shared') {
    return (
      <>
        <div style={{ marginBottom: 7, color: '#97A8BF' }}>
          The member appears only in shared campaign pools. Their personal share is not published and is not estimated.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px' }}>
          <Metric label="Shared campaign pools" value={disclosure.sharedCampaignCount} />
          <Metric label="Whole-pool income" value={money(disclosure.sharedCampaignIncome)} color="#FFE4A2" />
          <Metric label="Attributed personally" value="Not available" />
        </div>
      </>
    )
  }
  return <DirectFinance disclosure={disclosure} />
}

export function DisclosureStat({
  member,
  kind,
  open,
  onToggle,
  compact = false,
}: {
  member: Member
  kind: DisclosureKind
  open: boolean
  onToggle: () => void
  compact?: boolean
}) {
  const tooltipId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const appearance = STYLE[kind]
  const value = displayedValue(member, kind)
  const accessibleValue = value.replace('\n', ' ')
  const [primaryValue, secondaryValue] = value.split('\n')
  const compactValue = primaryValue.length > 6
  const label = kind === 'ties' ? 'declared interests' : 'campaign financing'

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
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        aria-label={`${appearance.label} ${accessibleValue}. Show ${label} metrics`}
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
          display: compact ? 'flex' : 'block',
          alignItems: 'baseline',
          gap: compact ? 5 : undefined,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: compact ? 7 : 8, letterSpacing: '.12em', color: appearance.muted }}>
          {appearance.label} <span aria-hidden style={{ fontSize: 7 }}>ⓘ</span>
        </div>
        <div
          style={{
            fontFamily: AB,
            fontSize: compact ? (compactValue ? 8 : 10) : compactValue ? 10 : 13,
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
          <Tooltip member={member} kind={kind} tooltipId={tooltipId} compact />
        </OverflowTooltip>
      ) : (
        <Tooltip member={member} kind={kind} tooltipId={tooltipId} compact={false} />
      ))}
    </div>
  )
}

function Tooltip({
  member,
  kind,
  tooltipId,
  compact,
}: {
  member: Member
  kind: DisclosureKind
  tooltipId: string
  compact: boolean
}) {
  const appearance = STYLE[kind]
  const source = kind === 'ties' ? member.lobbying.source : member.financing.source

  return (
        <div
          id={tooltipId}
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
            {kind === 'ties' ? 'DISCLOSED EXTERNAL LINKS' : 'CAMPAIGN FINANCING'}
          </div>
          {kind === 'ties' ? <TiesTooltip disclosure={member.lobbying} /> : <CampTooltip disclosure={member.financing} />}
          <a
            href={source}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            style={{ display: 'inline-block', marginTop: 8, color: appearance.muted, fontSize: 7.5 }}
          >
            OFFICIAL SOURCE ↗
          </a>
        </div>
  )
}
