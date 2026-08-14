import { useId } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { Member, MemberStrengths } from '../data/members'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export type ScoreKind = 'atk' | 'def'

const SCORE_STYLE = {
  atk: { label: 'ATK', color: '#FF5FA2', muted: '#FF9EC4' },
  def: { label: 'DEF', color: '#2FD3C4', muted: '#8FEDE3' },
} as const

type StrengthKey = keyof MemberStrengths
type MetricRow = { key: StrengthKey; label: string; weight: number }

function metricRows(member: Member, kind: ScoreKind): MetricRow[] {
  if (member.chamber === 'BR') {
    return [
      { key: 'officeTenure', label: 'Executive tenure', weight: 0.8 },
      { key: 'ageNetwork', label: 'Age / network', weight: 0.2 },
    ]
  }
  return kind === 'atk'
    ? [
        { key: 'leadership', label: 'Leadership', weight: 0.5 },
        { key: 'workload', label: 'Committee load', weight: 0.25 },
        { key: 'tenure', label: 'Tenure', weight: 0.15 },
        { key: 'age', label: 'Age / network', weight: 0.1 },
      ]
    : [
        { key: 'tenure', label: 'Tenure', weight: 0.5 },
        { key: 'workload', label: 'Committee load', weight: 0.35 },
        { key: 'age', label: 'Age / network', weight: 0.15 },
      ]
}

function tooltipCopy(member: Member, kind: ScoreKind): { title: string; blurb: string } {
  if (member.chamber === 'BR') {
    const baseline = kind === 'atk' ? 86 : 88
    const multiplier = kind === 'atk' ? 10 : 9
    return {
      title: kind === 'atk' ? 'EXECUTIVE INFLUENCE' : 'EXECUTIVE RESILIENCE',
      blurb: `${baseline} + ${multiplier} × weighted experience.`,
    }
  }
  return kind === 'atk'
    ? { title: 'AGENDA-SETTING POWER', blurb: 'Weighted percentile within the same chamber.' }
    : { title: 'INSTITUTIONAL STRENGTH', blurb: 'Weighted percentile within the same chamber.' }
}

function stopPointer(e: ReactPointerEvent<HTMLButtonElement>) {
  e.stopPropagation()
}

function StrengthBar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 5,
        borderRadius: 3,
        background: 'rgba(255,255,255,.09)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          boxShadow: `0 0 6px ${color}66`,
        }}
      />
    </div>
  )
}

export function ScoreStat({
  member,
  kind,
  open,
  onToggle,
  highlighted = false,
  compact = false,
}: {
  member: Member
  kind: ScoreKind
  open: boolean
  onToggle: () => void
  highlighted?: boolean
  compact?: boolean
}) {
  const tooltipId = useId()
  const score = SCORE_STYLE[kind]
  const copy = tooltipCopy(member, kind)
  const rows = metricRows(member, kind)
  const value = member[kind]

  const root: CSSProperties = {
    position: 'relative',
    flex: 'none',
    borderRadius: 10,
    ...(highlighted
      ? {
          padding: '2px 6px',
          margin: '-2px -6px',
          animation: 'statHighlight 1100ms ease-in-out infinite',
          ['--stat-glow' as string]: score.color,
        }
      : {}),
  }

  return (
    <div style={root}>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        aria-label={`${score.label} ${value}. Show score formula`}
        onPointerDown={stopPointer}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        style={{
          display: 'block',
          padding: 0,
          border: 0,
          background: 'transparent',
          color: 'inherit',
          textAlign: 'left',
          cursor: 'help',
          touchAction: 'manipulation',
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: compact ? 8 : 9, letterSpacing: '.18em', color: score.muted }}>
          {score.label} <span aria-hidden style={{ fontSize: compact ? 7 : 8 }}>ⓘ</span>
        </div>
        <div style={{ fontFamily: AB, fontSize: compact ? 29 : 36, lineHeight: 0.9, color: score.color }}>{value}</div>
      </button>

      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: kind === 'atk' ? 0 : compact ? -78 : -66,
            bottom: 'calc(100% + 9px)',
            zIndex: 30,
            width: compact ? 240 : 256,
            padding: '10px 11px',
            borderRadius: 9,
            border: `1px solid ${score.color}66`,
            background: 'rgba(5,9,17,.97)',
            boxShadow: '0 12px 30px rgba(0,0,0,.52)',
            color: '#C8D6E8',
            fontFamily: MONO,
            fontSize: compact ? 8.5 : 9,
            lineHeight: 1.4,
            letterSpacing: '.015em',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ marginBottom: 4, color: score.color, fontFamily: AB, fontSize: compact ? 9 : 10, letterSpacing: '.08em' }}>
            {copy.title}
          </div>
          <div style={{ marginBottom: 7, color: '#8FA0B8' }}>{copy.blurb}</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              columnGap: 8,
              rowGap: 5,
              alignItems: 'center',
            }}
          >
            {rows.map((row) => {
              const strength = member.strengths?.[row.key] ?? 0
              return (
                <div key={row.key} style={{ display: 'contents' }}>
                  <div style={{ color: score.muted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(row.weight * 100)}%
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ color: '#DDE7F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.label}
                    </div>
                    <StrengthBar value={strength} color={score.color} />
                  </div>
                  <div style={{ color: '#DDE7F5', fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'right' }}>
                    {strength}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
