import { useEffect, useState } from 'react'
import { useGame } from './game/useGame'
import { useBattle } from './game/useBattle'
import { Home } from './screens/Home'
import { PackOpening } from './screens/PackOpening'
import { Collection } from './screens/Collection'
import { Trade } from './screens/Trade'
import { Battle } from './screens/Battle'
import { Methodology } from './screens/Methodology'
import { Disclaimer } from './screens/Disclaimer'
import { TabBar } from './components/TabBar'
import { hasAcknowledgedDisclaimer, ProjectDisclaimer } from './components/ProjectDisclaimer'

export function App() {
  const game = useGame()
  const battle = useBattle()
  const [showDisclaimer, setShowDisclaimer] = useState(() => !hasAcknowledgedDisclaimer())
  const [infoPage, setInfoPage] = useState<'methodology' | 'disclaimer' | null>(() => {
    if (window.location.hash === '#methodology') return 'methodology'
    if (window.location.hash === '#disclaimer') return 'disclaimer'
    return null
  })
  const { screen } = game.state
  const showTabs = !infoPage && (screen === 'home' || screen === 'collection' || screen === 'trade')

  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash === '#methodology') setInfoPage('methodology')
      else if (window.location.hash === '#disclaimer') setInfoPage('disclaimer')
      else setInfoPage(null)
    }
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  const closeInfoPage = () => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setInfoPage(null)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        // Painted against the viewport so the gradient always spans the whole
        // window, regardless of the content column's width.
        background: 'radial-gradient(120% 55% at 50% 0%, #16233A 0%, #070C13 58%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <div
        className="app-shell-width"
        style={{
          minHeight: '100vh',
          position: 'relative',
          // Deliberately not clipped: card glows and backdrops are drawn well
          // outside the card box and would be cut off at the column edges.
          // `body { overflow-x: hidden }` keeps them from causing sideways
          // scrolling, clipping at the viewport instead of the column.
        }}
      >
        <div
          key={infoPage ?? (screen === 'tear' || screen === 'reveal' ? 'pack-opening' : screen)}
          className="screen-transition"
        >
          {infoPage === 'methodology' ? (
            <Methodology onClose={closeInfoPage} />
          ) : infoPage === 'disclaimer' ? (
            <Disclaimer onClose={closeInfoPage} />
          ) : (
            <>
              {screen === 'home' && <Home game={game} />}
              {(screen === 'tear' || screen === 'reveal') && <PackOpening game={game} />}
              {screen === 'collection' && <Collection game={game} />}
              {screen === 'battle' && <Battle game={game} battle={battle} />}
              {screen === 'trade' && <Trade game={game} />}
            </>
          )}
        </div>
        {showTabs && <TabBar game={game} />}
      </div>
      {showDisclaimer && <ProjectDisclaimer onAcknowledge={() => setShowDisclaimer(false)} />}
    </div>
  )
}
