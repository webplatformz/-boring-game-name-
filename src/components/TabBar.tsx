import type { CSSProperties } from 'react'
import type { Game } from '../game/useGame'

const AB = "'Archivo Black',sans-serif"

function tabStyle(on: boolean): CSSProperties {
  return {
    position: 'relative',
    zIndex: 1,
    padding: '13px 10px',
    borderRadius: 10,
    textAlign: 'center',
    fontFamily: AB,
    fontSize: 11.5,
    letterSpacing: '.12em',
    color: on ? '#0A0F18' : '#5C7391',
    transition: 'color 240ms cubic-bezier(.4,.1,.2,1)',
  }
}

// The active pill slides between the two columns instead of snapping. Widths
// are derived from the rail's 5px padding and 6px gap.
function pillStyle(index: number): CSSProperties {
  return {
    position: 'absolute',
    left: 5,
    top: 5,
    bottom: 5,
    width: 'calc(50% - 8px)',
    borderRadius: 10,
    background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)',
    transform: index ? 'translateX(calc(100% + 6px))' : 'none',
    transition: 'transform 300ms cubic-bezier(.4,.1,.2,1)',
  }
}

export function TabBar({ game }: { game: Game }) {
  const s = game.state.screen
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="app-shell-width" style={{ padding: '10px 20px 18px', background: 'linear-gradient(180deg,transparent,#070C13 40%)', pointerEvents: 'auto' }}>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 5, borderRadius: 14, background: '#0B121D', border: '1px solid rgba(234,242,255,.1)' }}>
          <div style={pillStyle(s === 'collection' ? 1 : 0)} />
          <button onClick={game.goHome} style={tabStyle(s === 'home')}>
            PACKS
          </button>
          <button onClick={game.goCollection} style={tabStyle(s === 'collection')}>
            COLLECTION
          </button>
        </div>
      </div>
    </div>
  )
}
