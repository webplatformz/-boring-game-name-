import { lazy, Suspense, useEffect, useState } from 'react'
import { useGame } from './game/useGame'
import type { Screen } from './game/useGame'
import { useDebate } from './game/useDebate'
import { useAchievements } from './game/useAchievements'
import { recordLegalPageOpened, LEGAL_PAGES } from './game/achievements'
import { Home } from './screens/Home'
import { PackOpening } from './screens/PackOpening'
import { Collection } from './screens/Collection'
import { Trade } from './screens/Trade'
import { Debate } from './screens/Debate'
import { Methodology } from './screens/Methodology'
import { Disclaimer } from './screens/Disclaimer'
import { Privacy } from './screens/Privacy'
import { DataMethodology } from './screens/DataMethodology'
import { Achievements } from './screens/Achievements'
import { Updates } from './screens/Updates'
import { TabBar } from './components/TabBar'
import { LegalFooter } from './components/LegalFooter'
import { AchievementToast } from './components/AchievementToast'
import { hasAcknowledgedDisclaimer, ProjectDisclaimer } from './components/ProjectDisclaimer'
import { hasUnreadUpdates, markUpdatesRead } from './content/updates'

const PortraitCredits = lazy(() => import('./screens/PortraitCredits'))

type InfoPage = 'methodology' | 'data-methodology' | 'privacy' | 'photo-credits' | 'disclaimer' | 'achievements' | 'updates'
const LEGAL_INFO_PAGES: readonly string[] = LEGAL_PAGES

function infoPageFromHash(): InfoPage | null {
  const page = window.location.hash.slice(1)
  return page === 'methodology' || page === 'data-methodology' || page === 'privacy' || page === 'photo-credits' || page === 'disclaimer' || page === 'achievements' || page === 'updates'
    ? page
    : null
}

function screenFromHash(): Screen | null {
  const page = window.location.hash.slice(1)
  return page === 'home' || page === 'collection' || page === 'debate' || page === 'trade'
    ? page
    : null
}

export function App() {
  const game = useGame()
  const debate = useDebate(game.debateCampaign)
  const achievements = useAchievements(
    game,
    debate.state.record,
    debate.campaignUpsetVictorySeq,
  )
  const [showDisclaimer, setShowDisclaimer] = useState(() => !hasAcknowledgedDisclaimer())
  const [infoPage, setInfoPage] = useState<InfoPage | null>(infoPageFromHash)
  const [hashSynced, setHashSynced] = useState(false)
  const [updatesUnread, setUpdatesUnread] = useState(hasUnreadUpdates)
  const [achievementTarget, setAchievementTarget] = useState<string | null>(null)
  const [achievementTargetRequest, setAchievementTargetRequest] = useState(0)
  const { screen } = game.state
  const { goHome, goCollection, goDebate, goTrade } = game
  const showTabs = !infoPage && (screen === 'home' || screen === 'collection' || screen === 'debate' || screen === 'trade')
  // Home can grow taller than a short phone viewport — keep it in normal
  // page flow so the legal footer always follows its content. Tab screens
  // (including an active debate) are viewport-constrained instead: debate's
  // Arena sizes its cards to whatever room is actually available so the
  // fight/reveal/result steps never need to scroll.
  const naturalFlowScreen = !infoPage && screen === 'home'

  useEffect(() => {
    const syncHash = () => {
      const nextPage = infoPageFromHash()
      setInfoPage(nextPage)
      if (nextPage !== 'achievements') setAchievementTarget(null)
      const nextScreen = screenFromHash()
      if (nextScreen === 'home') goHome()
      else if (nextScreen === 'collection') goCollection()
      else if (nextScreen === 'debate') goDebate()
      else if (nextScreen === 'trade') goTrade()
      setHashSynced(true)
    }
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [goHome, goCollection, goDebate, goTrade])

  // Keep the main game screens addressable without exposing transient pack
  // opening phases as routes.
  useEffect(() => {
    if (!hashSynced) return
    if (infoPageFromHash()) return
    if (screen !== 'home' && screen !== 'collection' && screen !== 'debate' && screen !== 'trade') return
    const nextHash = `#${screen}`
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash)
    }
  }, [hashSynced, infoPage, screen])

  // Tracks the "Law Student" hidden achievement — visiting every legal/info page.
  useEffect(() => {
    if (infoPage && LEGAL_INFO_PAGES.includes(infoPage)) recordLegalPageOpened(infoPage)
  }, [infoPage])

  useEffect(() => {
    if (infoPage !== 'updates') return
    markUpdatesRead()
    setUpdatesUnread(false)
  }, [infoPage])

  const closeInfoPage = () => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setInfoPage(null)
    setAchievementTarget(null)
  }

  const openAchievement = (achievementId: string) => {
    window.history.pushState(null, '', '#achievements')
    setAchievementTarget(achievementId)
    setAchievementTargetRequest((request) => request + 1)
    setInfoPage('achievements')
    achievements.dismissToast()
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
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
          minHeight: '100dvh',
          // Needs an explicit height (not just minHeight) whenever the
          // screen below is viewport-constrained — otherwise this column
          // has no definite height for its flex:1/minHeight:0 children to
          // shrink against, so they'd grow to content size instead of
          // filling exactly one screen, defeating the "no scroll" contract.
          height: showTabs && !naturalFlowScreen ? '100dvh' : undefined,
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
          ) : infoPage === 'achievements' ? (
            <Achievements
              onClose={closeInfoPage}
              achievements={achievements.achievements}
              unlockedCount={achievements.unlockedCount}
              totalCount={achievements.totalCount}
              targetId={achievementTarget}
              targetRequest={achievementTargetRequest}
            />
          ) : infoPage === 'updates' ? (
            <Updates onClose={closeInfoPage} />
          ) : (
            <>
              {screen === 'home' && <Home game={game} unlockedAchievements={achievements.unlockedCount} totalAchievements={achievements.totalCount} />}
              {(screen === 'tear' || screen === 'reveal') && <PackOpening game={game} />}
              {screen === 'collection' && <Collection game={game} />}
              {screen === 'debate' && <Debate game={game} debate={debate} />}
              {screen === 'trade' && <Trade game={game} />}
            </>
          )}
        </div>
        <LegalFooter aboveTabs={showTabs} pushToBottom={naturalFlowScreen} updatesUnread={updatesUnread} />
      </div>
      {showDisclaimer && <ProjectDisclaimer onAcknowledge={() => setShowDisclaimer(false)} />}
      <AchievementToast item={achievements.toast} onDismiss={achievements.dismissToast} onSelect={openAchievement} />
    </div>
  )
}
