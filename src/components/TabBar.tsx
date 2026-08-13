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

// The active pill slides between the three columns instead of snapping.
function pillStyle(index: number): CSSProperties {
  return {
    position: 'absolute',
    left: 5,
    top: 5,
    bottom: 5,
    width: 'calc(33.333% - 4.66px)',
    borderRadius: 10,
    background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)',
    transform: `translateX(calc(${index * 100}% + ${index * 6}px))`,
    transition: 'transform 300ms cubic-bezier(.4,.1,.2,1)',
  }
}

export function TabBar({ game }: { game: Game }) {
  const s = game.state.screen
  const tabIndex = s === 'home' ? 0 : s === 'collection' ? 1 : s === 'trade' ? 2 : 0

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 100 }}>
      <div className="app-shell-width" style={{ padding: '10px 20px 18px', background: 'linear-gradient(180deg,transparent,#070C13 40%)', pointerEvents: 'auto' }}>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: 5, borderRadius: 14, background: '#0B121D', border: '1px solid rgba(234,242,255,.1)' }}>
          <div style={pillStyle(tabIndex)} />
          <button onClick={game.goHome} style={tabStyle(s === 'home')}>
            PACKS
          </button>
          <button onClick={game.goCollection} style={tabStyle(s === 'collection')}>
            COLLECTION
          </button>
          <button onClick={game.goTrade} style={tabStyle(s === 'trade')}>
            TRADE
          </button>
        </div>
      </div>
    </div>
  )
}
