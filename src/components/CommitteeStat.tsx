import { useId, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Member } from '../data/members'
import { OverflowTooltip } from './OverflowTooltip'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

function stopPointer(event: ReactPointerEvent<HTMLElement>) {
  event.stopPropagation()
}

export function CommitteeStat({ member, open, onToggle }: { member: Member; open: boolean; onToggle: () => void }) {
  const tooltipId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const leadershipCount = member.committees.filter((committee) => committee.role.includes('Präsident/in')).length

  return (
    <div style={{ position: 'relative', minWidth: 0, background: '#0B121D' }}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        aria-label={`CMTE ${member.committeeCount}. Show committee metrics`}
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
        <OverflowTooltip anchor={buttonRef} width={284}>
          <div
            id={tooltipId}
            role="tooltip"
            onPointerDown={stopPointer}
            onPointerUp={stopPointer}
            onClick={(event) => event.stopPropagation()}
            style={{
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
              COMMITTEE WORK
            </div>
            <div style={{ marginBottom: 7, color: '#97A8BF' }}>
              Current standing committee assignments published by Parliament.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px' }}>
              <span style={{ color: '#8294AD' }}>Assignments</span>
              <span style={{ color: '#E6EEF8' }}>{member.committeeCount}</span>
              <span style={{ color: '#8294AD' }}>Chair / vice-chair roles</span>
              <span style={{ color: '#8FEDE3' }}>{leadershipCount}</span>
            </div>
            {member.committees.length > 0 ? (
              <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid rgba(143,237,227,.2)' }}>
                <div style={{ maxHeight: 104, overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: 3 }}>
                  {member.committees.map((committee, index) => (
                    <div key={`${committee.abbr}-${committee.role}-${index}`} style={{ marginTop: index === 0 ? 0 : 5 }}>
                      <div style={{ color: '#DDFBF7' }}>
                        {committee.abbr || committee.name}
                        {committee.chair ? ' · CHAIR' : ''}
                      </div>
                      <div style={{ color: '#7388A5', fontSize: 8 }}>
                        {committee.name}
                        {committee.role ? ` · ${committee.role}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8, color: '#7388A5' }}>No current standing committee assignment.</div>
            )}
          </div>
        </OverflowTooltip>
      )}
    </div>
  )
}
