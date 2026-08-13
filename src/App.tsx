import { useGame } from './game/useGame'
import { Home } from './screens/Home'
import { Tear } from './screens/Tear'
import { Reveal } from './screens/Reveal'
import { Collection } from './screens/Collection'
import { Trade } from './screens/Trade'
import { TabBar } from './components/TabBar'

export function App() {
  const game = useGame()
  const { screen } = game.state
  const showTabs = screen === 'home' || screen === 'collection' || screen === 'trade'

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
          overflow: 'hidden',
        }}
      >
        {screen === 'home' && <Home game={game} />}
        {screen === 'tear' && <Tear state={game.state} />}
        {screen === 'reveal' && <Reveal game={game} />}
        {screen === 'collection' && <Collection game={game} />}
        {screen === 'trade' && <Trade game={game} />}
        {showTabs && <TabBar game={game} />}
      </div>
    </div>
  )
}
