import { lazy, Suspense, useEffect, useState } from 'react'
import { useGame } from './game/useGame'
import { useBattle } from './game/useBattle'
import { Home } from './screens/Home'
import { PackOpening } from './screens/PackOpening'
import { Collection } from './screens/Collection'
import { Trade } from './screens/Trade'
import { Battle } from './screens/Battle'
import { Methodology } from './screens/Methodology'
import { Disclaimer } from './screens/Disclaimer'
import { Privacy } from './screens/Privacy'
import { DataMethodology } from './screens/DataMethodology'
import { TabBar } from './components/TabBar'
import { LegalFooter } from './components/LegalFooter'
import { hasAcknowledgedDisclaimer, ProjectDisclaimer } from './components/ProjectDisclaimer'

const PortraitCredits = lazy(() => import('./screens/PortraitCredits'))

type InfoPage = 'methodology' | 'data-methodology' | 'privacy' | 'photo-credits' | 'disclaimer'

function infoPageFromHash(): InfoPage | null {
  const page = window.location.hash.slice(1)
  return page === 'methodology' || page === 'data-methodology' || page === 'privacy' || page === 'photo-credits' || page === 'disclaimer' ? page : null
}

export function App() {
  const game = useGame()
  const battle = useBattle()
  const [showDisclaimer, setShowDisclaimer] = useState(() => !hasAcknowledgedDisclaimer())
  const [infoPage, setInfoPage] = useState<InfoPage | null>(infoPageFromHash)
  const { screen } = game.state
  const showTabs = !infoPage && (screen === 'home' || screen === 'collection' || screen === 'battle' || screen === 'trade')
  // Home and an active battle can grow taller than a short phone viewport.
  // Keep them in normal page flow so the legal footer always follows their
  // content. Picker/data-heavy tab screens retain their viewport-constrained
  // internal scrollers.
  const naturalFlowScreen = !infoPage && (
    screen === 'home' || (screen === 'battle' && battle.state.step !== 'pick')
  )

  useEffect(() => {
    const syncHash = () => setInfoPage(infoPageFromHash())
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
        height: showTabs && !naturalFlowScreen ? '100dvh' : undefined,
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
          display: 'flex',
          flexDirection: 'column',
          // Deliberately not clipped: card glows and backdrops are drawn well
          // outside the card box and would be cut off at the column edges.
          // `body { overflow-x: hidden }` keeps them from causing sideways
          // scrolling, clipping at the viewport instead of the column.
        }}
      >
        {showTabs && <TabBar game={game} />}
        <div
          key={infoPage ?? (screen === 'tear' || screen === 'reveal' ? 'pack-opening' : screen)}
          className="screen-transition"
          style={{ flex: naturalFlowScreen ? 'none' : 1, minHeight: naturalFlowScreen ? undefined : 0 }}
        >
          {infoPage === 'methodology' ? (
            <Methodology onClose={closeInfoPage} />
          ) : infoPage === 'data-methodology' ? (
            <DataMethodology onClose={closeInfoPage} />
          ) : infoPage === 'privacy' ? (
            <Privacy onClose={closeInfoPage} />
          ) : infoPage === 'photo-credits' ? (
            <Suspense fallback={null}>
              <PortraitCredits onClose={closeInfoPage} />
            </Suspense>
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
        <LegalFooter aboveTabs={showTabs} pushToBottom={naturalFlowScreen} />
      </div>
      {showDisclaimer && <ProjectDisclaimer onAcknowledge={() => setShowDisclaimer(false)} />}
    </div>
  )
}
