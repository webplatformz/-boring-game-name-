import { useGame } from './game/useGame'
import { Home } from './screens/Home'
import { Tear } from './screens/Tear'
import { Reveal } from './screens/Reveal'
import { Collection } from './screens/Collection'
import { TabBar } from './components/TabBar'

export function App() {
  const game = useGame()
  const { screen } = game.state
  const showTabs = screen === 'home' || screen === 'collection'

  return (
    <div style={{ minHeight: '100vh', background: '#070C13', display: 'flex', justifyContent: 'center' }}>
      <div
        className="app-shell-width"
        style={{
          minHeight: '100vh',
          position: 'relative',
          background: 'radial-gradient(120% 55% at 50% 0%, #16233A 0%, #070C13 58%)',
          overflow: 'hidden',
        }}
      >
        {screen === 'home' && <Home game={game} />}
        {screen === 'tear' && <Tear state={game.state} />}
        {screen === 'reveal' && <Reveal game={game} />}
        {screen === 'collection' && <Collection game={game} />}
        {showTabs && <TabBar game={game} />}
      </div>
    </div>
  )
}
