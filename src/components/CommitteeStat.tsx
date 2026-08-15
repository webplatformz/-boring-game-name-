import { useId } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Member } from '../data/members'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

function stopPointer(event: ReactPointerEvent<HTMLElement>) {
  event.stopPropagation()
}

export function CommitteeStat({ member, open, onToggle }: { member: Member; open: boolean; onToggle: () => void }) {
  const { t } = useI18n()
  const tooltipId = useId()
  const leadershipCount = member.committees.filter((committee) => committee.role.includes('Präsident/in')).length
  const visibleCommittees = member.committees.slice(0, 5)

  return (
    <div style={{ position: 'relative', minWidth: 0, background: '#0B121D' }}>
      <button
        data-card-tooltip-interactive
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        aria-label={t('committeeAria', { count: member.committeeCount })}
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
          padding: '7px 4px',
          border: 0,
          background: 'transparent',
          color: 'inherit',
          textAlign: 'center',
          cursor: 'help',
          touchAction: 'manipulation',
          display: 'grid',
          gridTemplateRows: '10px 16px',
          alignContent: 'start',
        }}
      >
        <div style={{ height: 10, fontFamily: MONO, fontSize: 8, lineHeight: '10px', letterSpacing: '.12em', color: '#5C7391' }}>
          CMTE <span aria-hidden style={{ fontSize: 7 }}>ⓘ</span>
        </div>
        <div style={{ height: 16, fontFamily: AB, fontSize: 13, lineHeight: '16px', color: '#EAF2FF' }}>
          {member.committeeCount}
        </div>
      </button>

      {open && (
        <div
          id={tooltipId}
          data-card-tooltip-interactive
          role="tooltip"
          onPointerDown={stopPointer}
          onPointerUp={stopPointer}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'absolute',
            left: -48,
            bottom: 'calc(100% + 8px)',
            zIndex: 40,
            width: 284,
            padding: '10px 11px',
            borderRadius: 9,
            border: '1px solid rgba(143,237,227,.4)',
            background: 'rgba(5,9,17,.98)',
            boxShadow: '0 14px 34px rgba(0,0,0,.58)',
            color: '#C8D6E8',
            fontFamily: MONO,
            fontSize: 8.5,
            lineHeight: 1.4,
            textAlign: 'left',
          }}
        >
          <div style={{ marginBottom: 5, color: '#8FEDE3', fontFamily: AB, fontSize: 10, letterSpacing: '.08em' }}>
            {t('committeeWork')}
          </div>
          <div style={{ marginBottom: 7, color: '#97A8BF' }}>
            {t('committeeIntro')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px' }}>
            <span style={{ color: '#8294AD' }}>{t('assignments')}</span>
            <span style={{ color: '#E6EEF8' }}>{member.committeeCount}</span>
            <span style={{ color: '#8294AD' }}>{t('leadershipRoles')}</span>
            <span style={{ color: '#8FEDE3' }}>{leadershipCount}</span>
          </div>
          {member.committees.length > 0 ? (
            <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid rgba(143,237,227,.2)' }}>
              {visibleCommittees.map((committee, index) => (
                <div key={`${committee.abbr}-${committee.role}-${index}`} style={{ marginTop: index === 0 ? 0 : 5 }}>
                  <div style={{ color: '#DDFBF7' }}>
                    {committee.abbr || committee.name}
                    {committee.chair ? ` · ${t('chair')}` : ''}
                  </div>
                  <div style={{ color: '#7388A5', fontSize: 8 }}>
                    {committee.name}
                    {committee.role ? ` · ${committee.role}` : ''}
                  </div>
                </div>
              ))}
              {member.committees.length > visibleCommittees.length && (
                <div style={{ marginTop: 6, color: '#7388A5' }}>
                  {member.committees.length - visibleCommittees.length === 1
                    ? t('moreAssignments', { count: member.committees.length - visibleCommittees.length })
                    : t('moreAssignmentsPlural', { count: member.committees.length - visibleCommittees.length })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 8, color: '#7388A5' }}>{t('noCommittee')}</div>
          )}
        </div>
      )}
    </div>
  )
}
