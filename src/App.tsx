import { useEffect, useState } from 'react'
import { useGame } from './game/useGame'
import { useBattle } from './game/useBattle'
import { Home } from './screens/Home'
import { Tear } from './screens/Tear'
import { Reveal } from './screens/Reveal'
import { Collection } from './screens/Collection'
import { Trade } from './screens/Trade'
import { Battle } from './screens/Battle'
import { Methodology } from './screens/Methodology'
import { TabBar } from './components/TabBar'

export function App() {
  const game = useGame()
  const battle = useBattle()
  const [showMethodology, setShowMethodology] = useState(() => window.location.hash === '#methodology')
  const { screen } = game.state
  const showTabs = !showMethodology && (screen === 'home' || screen === 'collection' || screen === 'trade')

  useEffect(() => {
    const syncHash = () => setShowMethodology(window.location.hash === '#methodology')
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  const closeMethodology = () => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setShowMethodology(false)
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
        <div key={showMethodology ? 'methodology' : screen} className="screen-transition">
          {showMethodology ? (
            <Methodology onClose={closeMethodology} />
          ) : (
            <>
              {screen === 'home' && <Home game={game} />}
              {screen === 'tear' && <Tear state={game.state} />}
              {screen === 'reveal' && <Reveal game={game} />}
              {screen === 'collection' && <Collection game={game} />}
              {screen === 'battle' && <Battle game={game} battle={battle} />}
              {screen === 'trade' && <Trade game={game} />}
            </>
          )}
        </div>
        {showTabs && <TabBar game={game} />}
      </div>
    </div>
  )
}
