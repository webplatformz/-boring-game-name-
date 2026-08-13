import type { CSSProperties } from 'react'
import type { Game } from '../game/useGame'

const AB = "'Archivo Black',sans-serif"

function tabStyle(on: boolean): CSSProperties {
  return {
    padding: '13px 10px',
    borderRadius: 10,
    textAlign: 'center',
    fontFamily: AB,
    fontSize: 11.5,
    letterSpacing: '.12em',
    ...(on ? { background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18' } : { color: '#5C7391' }),
  }
}

export function TabBar({ game }: { game: Game }) {
  const s = game.state.screen
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="app-shell-width" style={{ padding: '10px 20px 18px', background: 'linear-gradient(180deg,transparent,#070C13 40%)', pointerEvents: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 5, borderRadius: 14, background: '#0B121D', border: '1px solid rgba(234,242,255,.1)' }}>
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
