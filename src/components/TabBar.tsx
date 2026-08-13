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

// The active pill slides between the columns instead of snapping. Width is
// derived from the rail's 5px padding and 6px gaps; translateX shifts by the
// pill's own width + one gap per column (works for any column count, since
// percentages here resolve against the pill's own width, not the rail's).
function pillStyle(index: number, count: number): CSSProperties {
  const gapPx = 6
  const paddingPx = 5
  return {
    position: 'absolute',
    left: 5,
    top: 5,
    bottom: 5,
    width: `calc((100% - ${paddingPx * 2}px - ${(count - 1) * gapPx}px) / ${count})`,
    borderRadius: 10,
    background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)',
    transform: index ? `translateX(calc(${index * 100}% + ${index * gapPx}px))` : 'none',
    transition: 'transform 300ms cubic-bezier(.4,.1,.2,1)',
  }
}

export function TabBar({ game }: { game: Game }) {
  const s = game.state.screen
  const tabs: { screen: 'home' | 'collection' | 'battle' | 'trade'; label: string; onClick: () => void }[] = [
    { screen: 'home', label: 'PACKS', onClick: game.goHome },
    { screen: 'collection', label: 'COLLECTION', onClick: game.goCollection },
    { screen: 'battle', label: 'BATTLE', onClick: game.goBattle },
    { screen: 'trade', label: 'TRADE', onClick: game.goTrade },
  ]
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.screen === s))

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="app-shell-width" style={{ padding: '10px 20px 18px', background: 'linear-gradient(180deg,transparent,#070C13 40%)', pointerEvents: 'auto' }}>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 6, padding: 5, borderRadius: 14, background: '#0B121D', border: '1px solid rgba(234,242,255,.1)' }}>
          <div style={pillStyle(activeIndex, tabs.length)} />
          {tabs.map((t) => (
            <button key={t.screen} onClick={t.onClick} style={tabStyle(s === t.screen)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
