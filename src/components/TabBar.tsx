import type { CSSProperties } from 'react'
import type { Game } from '../game/useGame'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"

function tabStyle(on: boolean): CSSProperties {
  return {
    position: 'relative',
    zIndex: 1,
    minWidth: 0,
    padding: '9px 6px',
    borderRadius: 8,
    textAlign: 'center',
    fontFamily: AB,
    fontSize: 10,
    letterSpacing: '.08em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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
  const paddingPx = 4
  return {
    position: 'absolute',
    left: paddingPx,
    top: 4,
    bottom: 4,
    width: `calc((100% - ${paddingPx * 2}px - ${(count - 1) * gapPx}px) / ${count})`,
    borderRadius: 8,
    background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)',
    transform: index ? `translateX(calc(${index * 100}% + ${index * gapPx}px))` : 'none',
    transition: 'transform 300ms cubic-bezier(.4,.1,.2,1)',
  }
}

export function TabBar({ game }: { game: Game }) {
  const { t } = useI18n()
  const s = game.state.screen
  const tabs: { screen: 'home' | 'collection' | 'battle' | 'trade'; label: string; onClick: () => void }[] = [
    { screen: 'home', label: t('tabPacks'), onClick: game.goHome },
    { screen: 'collection', label: t('tabCollection'), onClick: game.goCollection },
    { screen: 'battle', label: t('tabBattle'), onClick: game.goBattle },
    { screen: 'trade', label: t('tabTrade'), onClick: game.goTrade },
  ]
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.screen === s))

  return (
    <nav className="app-navigation" aria-label="Primary">
      <div className="tab-bar-rail" style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`, gap: 6, padding: 4, borderRadius: 12, background: 'rgba(11,18,29,.94)', border: '1px solid rgba(234,242,255,.1)', boxShadow: '0 8px 24px rgba(0,0,0,.18)' }}>
        <div className="tab-bar-pill" style={pillStyle(activeIndex, tabs.length)} />
        {tabs.map((t) => (
          <button
            key={t.screen}
            onClick={t.onClick}
            aria-current={s === t.screen ? 'page' : undefined}
            style={tabStyle(s === t.screen)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
