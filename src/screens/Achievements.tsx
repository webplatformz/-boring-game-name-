import type { CSSProperties } from 'react'
import { SwissCross } from '../components/CardBack'
import { TrophyIcon } from '../components/TrophyIcon'
import { useI18n } from '../i18n'
import type { AchievementView } from '../game/useAchievements'
import type { AchievementCategory } from '../game/achievements'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

const CATEGORY_ORDER: { key: AchievementCategory; titleKey: 'achCategoryCollection' | 'achCategoryPackOpening' | 'achCategoryTrading' | 'achCategoryStreaks' }[] = [
  { key: 'collection', titleKey: 'achCategoryCollection' },
  { key: 'packOpening', titleKey: 'achCategoryPackOpening' },
  { key: 'trading', titleKey: 'achCategoryTrading' },
  { key: 'streaks', titleKey: 'achCategoryStreaks' },
]

const card: CSSProperties = {
  padding: '13px 14px',
  borderRadius: 13,
  background: '#0B121D',
  border: '1px solid rgba(234,242,255,.1)',
  display: 'flex',
  gap: 11,
}

function AchievementCard({ achievement }: { achievement: AchievementView }) {
  const { t, language } = useI18n()
  const showProgress = achievement.goal > 1 && !achievement.unlocked
  const pct = showProgress ? Math.min(100, Math.round((achievement.current / achievement.goal) * 100)) : 0

  return (
    <div style={{ ...card, borderColor: achievement.unlocked ? 'rgba(255,197,61,.4)' : 'rgba(234,242,255,.1)' }}>
      <div
        style={{
          flex: 'none',
          width: 34,
          height: 34,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: achievement.unlocked ? 'rgba(255,197,61,.16)' : 'rgba(234,242,255,.06)',
          color: achievement.unlocked ? '#FFC53D' : '#3E5170',
        }}
      >
        <TrophyIcon size={17} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontFamily: AB, fontSize: 12.5, color: achievement.unlocked ? '#EAF2FF' : '#7690AE' }}>{t(achievement.titleKey)}</div>
          {achievement.unlocked && achievement.unlockedAt && (
            <div style={{ flex: 'none', fontFamily: MONO, fontSize: 8, color: '#5C7391' }}>
              {new Date(achievement.unlockedAt).toLocaleDateString(language)}
            </div>
          )}
        </div>
        <div style={{ marginTop: 3, fontSize: 11, lineHeight: 1.45, color: '#7690AE' }}>{t(achievement.descKey)}</div>
        {showProgress && (
          <>
            <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'rgba(234,242,255,.1)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#FFC53D,#FF3D8B)' }} />
            </div>
            <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 8.5, color: '#5C7391' }}>
              {achievement.current.toLocaleString(language)} / {achievement.goal.toLocaleString(language)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function Achievements({ onClose, achievements, unlockedCount, totalCount }: {
  onClose: () => void
  achievements: AchievementView[]
  unlockedCount: number
  totalCount: number
}) {
  const { t } = useI18n()
  const hiddenUnlocked = achievements.filter((a) => a.hidden && a.unlocked)
  const hiddenLockedCount = achievements.filter((a) => a.hidden && !a.unlocked).length

  return (
    <main style={{ padding: '22px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'riseIn 260ms ease-out' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <SwissCross size={24} />
          <div style={{ fontFamily: AB, fontSize: 13, letterSpacing: '.08em' }}>{t('achievementsEyebrow')}</div>
        </div>
        <button type="button" onClick={onClose} style={{ padding: '8px 11px', borderRadius: 9, border: '1px solid rgba(234,242,255,.16)', color: '#AFC0D5', fontFamily: MONO, fontSize: 10 }}>
          {t('backToGame')}
        </button>
      </header>

      <div>
        <h1 style={{ margin: 0, fontFamily: AB, fontSize: 31, lineHeight: 1, letterSpacing: '-.035em' }}>{t('achievementsTitle')}</h1>
        <p style={{ margin: '9px 0 0', color: '#9FB6D2', fontSize: 13, lineHeight: 1.55 }}>{t('achievementsIntro')}</p>
        <div style={{ marginTop: 12, height: 6, borderRadius: 99, background: 'rgba(234,242,255,.1)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.round((unlockedCount / Math.max(1, totalCount)) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#FFC53D,#FF3D8B)' }} />
        </div>
        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10, color: '#5C7391' }}>{t('achievementsCount', { unlocked: unlockedCount, total: totalCount })}</div>
      </div>

      {CATEGORY_ORDER.map(({ key, titleKey }) => {
        const items = achievements.filter((a) => a.category === key)
        if (items.length === 0) return null
        return (
          <section key={key} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <h2 style={{ margin: 0, fontFamily: AB, fontSize: 14, color: '#C9B8FF' }}>{t(titleKey)}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((a) => <AchievementCard key={a.id} achievement={a} />)}
            </div>
          </section>
        )
      })}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <h2 style={{ margin: 0, fontFamily: AB, fontSize: 14, color: '#C9B8FF' }}>{t('achCategoryHidden')}</h2>
        {hiddenUnlocked.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hiddenUnlocked.map((a) => <AchievementCard key={a.id} achievement={a} />)}
          </div>
        )}
        {hiddenLockedCount > 0 && (
          <div style={{ ...card, color: '#5C7391', fontFamily: MONO, fontSize: 10.5, justifyContent: 'center' }}>
            {t('achievementsHiddenTeaser', { count: hiddenLockedCount })}
          </div>
        )}
      </section>
    </main>
  )
}
