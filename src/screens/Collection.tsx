import { useState, useMemo, useEffect, useRef } from 'react'
import { MEMBERS, MEMBERS_BY_ID } from '../data/members'
import type { Game } from '../game/useGame'
import type { Member } from '../data/members'
import type { RarityKey } from '../theme'
import { TIERS, RARITY_ORDER, partyColors } from '../theme'
import type { SortKey } from '../game/storage'
import { loadPrefs, persistPrefs } from '../game/storage'
import { Flag } from '../components/Flag'
import { CardModal } from '../components/CardModal'
import { compactMoney } from '../components/DisclosureStat'
import { OpeningStats } from '../components/OpeningStats'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

function tiesValue(member: Member): number {
  return member.lobbying.coverage === 'not_applicable' ? 0 : member.lobbying.total
}

function financeValue(member: Member): number {
  const finance = member.financing
  if (finance.coverage === 'direct') return finance.directIncome
  if (finance.coverage === 'shared') return finance.sharedCampaignIncome
  return 0
}

function tiesDisplay(member: Member): string {
  return member.lobbying.coverage === 'not_applicable' ? '—' : String(member.lobbying.total)
}

function financeDisplay(member: Member): string {
  const finance = member.financing
  if (finance.coverage === 'direct') return compactMoney(finance.directIncome)
  if (finance.coverage === 'shared') return compactMoney(finance.sharedCampaignIncome)
  return '—'
}

type SortHeaderProps = {
  label: string
  column: SortKey
  activeColumn: SortKey
  direction: -1 | 1
  align?: 'left' | 'right'
  color?: string
  onSort: (column: SortKey) => void
}

function SortHeader({ label, column, activeColumn, direction, align = 'left', color = '#5C7391', onSort }: SortHeaderProps) {
  const active = column === activeColumn

  return (
    <div
      role="columnheader"
      aria-sort={active ? (direction === 1 ? 'ascending' : 'descending') : 'none'}
      style={{ minWidth: 0 }}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        data-sort-key={column}
        style={{
          width: '100%',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          gap: 3,
          fontFamily: MONO,
          fontSize: 8.5,
          letterSpacing: '.12em',
          color: active ? '#FFD87A' : color,
          textAlign: align,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        {active && <span aria-hidden="true">{direction === 1 ? '↑' : '↓'}</span>}
      </button>
    </div>
  )
}

export function Collection({ game }: { game: Game }) {
  const { t, rarity, party, cantonName } = useI18n()
  // Read once per mount so the chips come back exactly as they were left,
  // including after switching tabs (which unmounts this screen).
  const [savedPrefs] = useState(loadPrefs)
  const [sortKey, setSortKey] = useState<SortKey>(savedPrefs.sortKey)
  const [sortDir, setSortDir] = useState<-1 | 1>(savedPrefs.sortDir) // -1 = desc, 1 = asc
  const [selectedRarities, setSelectedRarities] = useState<Set<RarityKey>>(new Set(savedPrefs.rarities))
  const [openCardMember, setOpenCardMember] = useState<Member | null>(null)
  const [openCantonDropdown, setOpenCantonDropdown] = useState(false)
  const cantonListRef = useRef<HTMLDivElement>(null)
  const [selectedCantons, setSelectedCantons] = useState<Set<string>>(new Set(savedPrefs.cantons))

  useEffect(() => {
    persistPrefs({
      sortKey,
      sortDir,
      rarities: [...selectedRarities],
      cantons: [...selectedCantons],
    })
  }, [sortKey, sortDir, selectedRarities, selectedCantons])

  useEffect(() => {
    if (!openCantonDropdown) return

    const handleOutsidePointer = (event: PointerEvent) => {
      if (!cantonListRef.current?.contains(event.target as Node)) {
        setOpenCantonDropdown(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [openCantonDropdown])

  // Owned members
  const ownedList = useMemo(() => {
    return Object.entries(game.state.owned)
      .map(([id, count]) => ({ member: MEMBERS_BY_ID.get(Number(id)), count }))
      .filter((r): r is { member: Member; count: number } => Boolean(r.member))
  }, [game.state.owned])

  // Get unique cantons from owned members
  const availableCantons = useMemo(() => {
    const cantons = new Set(ownedList.map((r) => r.member.canton))
    return Array.from(cantons).sort()
  }, [ownedList])

  // Apply rarity and canton filters
  const filtered = useMemo(() => {
    let result = ownedList
    if (selectedRarities.size > 0) {
      result = result.filter((r) => selectedRarities.has(r.member.ratings.rarity))
    }
    if (selectedCantons.size > 0) {
      result = result.filter((r) => selectedCantons.has(r.member.canton))
    }
    return result
  }, [ownedList, selectedRarities, selectedCantons])

  // Apply sort
  const sorted = useMemo(() => {
    const cmp = filtered.slice()
    const rarityIndex = (r: RarityKey) => RARITY_ORDER.indexOf(r)
    cmp.sort((a, b) => {
      if (sortKey === 'rarity') {
        const ai = rarityIndex(a.member.ratings.rarity)
        const bi = rarityIndex(b.member.ratings.rarity)
        if (ai !== bi) return (ai - bi) * sortDir
        // tiebreaker: OVR descending
        return b.member.ratings.ovr - a.member.ratings.ovr
      }

      if (sortKey === 'name') {
        const byLastName = a.member.last.localeCompare(b.member.last) * sortDir
        if (byLastName !== 0) return byLastName
        return a.member.name.localeCompare(b.member.name) * sortDir
      }

      if (sortKey === 'ties') {
        const av = tiesValue(a.member)
        const bv = tiesValue(b.member)
        if (av < bv) return -1 * sortDir
        if (av > bv) return 1 * sortDir
        return 0
      }

      if (sortKey === 'finance') {
        const av = financeValue(a.member)
        const bv = financeValue(b.member)
        if (av < bv) return -1 * sortDir
        if (av > bv) return 1 * sortDir
        return 0
      }

      const av = a.member.ratings[sortKey]
      const bv = b.member.ratings[sortKey]

      if (av < bv) return -1 * sortDir
      if (av > bv) return 1 * sortDir
      return 0
    })
    return cmp
  }, [filtered, sortKey, sortDir])

  const toggleRarity = (r: RarityKey) => {
    // Single-select: clicking the active chip clears the filter,
    // clicking any other chip replaces the selection.
    setSelectedRarities(selectedRarities.has(r) && selectedRarities.size === 1 ? new Set() : new Set([r]))
  }

  const toggleCantonFilter = (canton: string) => {
    const next = new Set(selectedCantons)
    if (next.has(canton)) {
      next.delete(canton)
    } else {
      next.add(canton)
    }
    setSelectedCantons(next)
  }

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir(sortDir === 1 ? -1 : 1)
    } else {
      setSortKey(k)
      setSortDir(k === 'name' ? 1 : -1)
    }
  }

  const hasCards = ownedList.length > 0

  return (
    <div
      className="screen-fill tabbed-screen collection-screen"
      style={{ padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', animation: 'riseIn 300ms ease-out' }}
    >
      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: AB, fontSize: 26, letterSpacing: '-.03em' }}>{t('collectionTitle')}</div>
          <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: '#5C7391' }}>
            {t('collectionCount', { owned: ownedList.length, total: MEMBERS.length })}
          </div>
        </div>
        <button
          onClick={game.goTrade}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: 'rgba(255,197,61,.12)',
            border: '1px solid rgba(255,197,61,.35)',
            color: '#FFD87A',
            fontFamily: MONO,
            fontSize: 9.5,
            letterSpacing: '.12em',
            cursor: 'pointer',
          }}
        >
          {t('tradeIn')}
        </button>
      </div>

      <OpeningStats
        cardsRevealed={game.state.cardsRevealed}
        packsOpened={game.state.packsOpened}
      />

      {hasCards ? (
        <>
          {/* rarity filter chips */}
          <div style={{ flex: 'none', display: 'flex', gap: 6, overflow: 'auto', paddingBottom: 4, paddingLeft: 0 }} className="no-scrollbar">
            <button
              onClick={() => setSelectedRarities(new Set())}
              style={{
                flex: 'none',
                padding: '6px 12px',
                borderRadius: 9,
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: '.12em',
                whiteSpace: 'nowrap',
                background: selectedRarities.size === 0 ? 'rgba(255,197,61,.14)' : 'rgba(234,242,255,.05)',
                border: selectedRarities.size === 0 ? '1px solid rgba(255,197,61,.5)' : '1px solid rgba(234,242,255,.12)',
                color: selectedRarities.size === 0 ? '#FFD87A' : '#7690AE',
              }}
            >
              {t('all')}
            </button>
            {RARITY_ORDER.map((r) => {
              const t = TIERS[r]
              const on = selectedRarities.has(r)
              return (
                <button
                  key={r}
                  onClick={() => toggleRarity(r)}
                  style={{
                    flex: 'none',
                    padding: '6px 12px',
                    borderRadius: 9,
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: '.12em',
                    whiteSpace: 'nowrap',
                    background: on ? `${t.c}24` : 'rgba(234,242,255,.05)',
                    border: on ? `1px solid ${t.c}` : '1px solid rgba(234,242,255,.12)',
                    color: on ? t.c : '#7690AE',
                  }}
                >
                  {rarity(r)}
                </button>
              )
            })}
          </div>

          {/* canton filter dropdown */}
          <div style={{ flex: 'none', position: 'relative', display: 'inline-block' }}>
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setOpenCantonDropdown(!openCantonDropdown)}
              style={{
                padding: '6px 10px',
                borderRadius: 9,
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: '.12em',
                whiteSpace: 'nowrap',
                background: selectedCantons.size > 0 ? 'rgba(138,110,202,.14)' : 'rgba(234,242,255,.05)',
                border: selectedCantons.size > 0 ? '1px solid rgba(138,110,202,.5)' : '1px solid rgba(234,242,255,.12)',
                color: selectedCantons.size > 0 ? '#B795D9' : '#7690AE',
                cursor: 'pointer',
              }}
            >
              {selectedCantons.size === 0 ? t('cantonsToggle') : t('cantonsSelected', { count: selectedCantons.size })}
            </button>
            {openCantonDropdown && (
              <div
                ref={cantonListRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 6,
                  minWidth: 140,
                  maxHeight: 280,
                  overflow: 'auto',
                  borderRadius: 9,
                  background: '#0A0F18',
                  border: '1px solid rgba(234,242,255,.2)',
                  boxShadow: '0 4px 16px rgba(0,0,0,.5)',
                  zIndex: 10,
                  paddingTop: 4,
                  paddingBottom: 4,
                }}
              >
                {availableCantons.map((canton) => {
                  const isSelected = selectedCantons.has(canton)
                  return (
                    <button
                      key={canton}
                      onClick={() => toggleCantonFilter(canton)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        fontFamily: MONO,
                        fontSize: 10,
                        letterSpacing: '.12em',
                        color: isSelected ? '#B795D9' : '#7690AE',
                        cursor: 'pointer',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(138,110,202,.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 3,
                          border: `1.5px solid ${isSelected ? '#B795D9' : 'rgba(234,242,255,.3)'}`,
                          background: isSelected ? 'rgba(138,110,202,.3)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                        }}
                      >
                        {isSelected && '✓'}
                      </div>
                      {cantonName(canton)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* table */}
          <div
            role="table"
            aria-label={t('collectionTitle')}
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(234,242,255,.1)', background: '#0B121D' }}
          >
            {/* header row */}
            <div
              role="row"
              className="collection-table-grid"
              style={{ flex: 'none', padding: '10px 12px', background: 'rgba(234,242,255,.05)', borderBottom: '1px solid rgba(234,242,255,.1)' }}
            >
              <SortHeader label={t('member')} column="name" activeColumn={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortHeader label={t('rarity')} column="rarity" activeColumn={sortKey} direction={sortDir} onSort={toggleSort} />
              <SortHeader label="ATK" column="atk" activeColumn={sortKey} direction={sortDir} align="right" color="#FF9EC4" onSort={toggleSort} />
              <SortHeader label="DEF" column="def" activeColumn={sortKey} direction={sortDir} align="right" color="#8FEDE3" onSort={toggleSort} />
              <SortHeader label="OVR" column="ovr" activeColumn={sortKey} direction={sortDir} align="right" color="#FFD87A" onSort={toggleSort} />
              <SortHeader label={t('ties')} column="ties" activeColumn={sortKey} direction={sortDir} align="right" color="#B9A6FF" onSort={toggleSort} />
              <SortHeader label={t('camp')} column="finance" activeColumn={sortKey} direction={sortDir} align="right" color="#FFD36A" onSort={toggleSort} />
            </div>

            {/* rows */}
            <div role="rowgroup" style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              {sorted.map((r) => {
                const tier = TIERS[r.member.ratings.rarity]
                const pc = partyColors(r.member.partyCode)
                return (
                  <div
                    key={r.member.id}
                    role="row"
                    className="collection-table-grid collection-table-row"
                    data-member-name={r.member.name}
                    data-rarity={r.member.ratings.rarity}
                    onClick={() => setOpenCardMember(r.member)}
                    style={{
                      padding: '11px 12px',
                      borderBottom: '1px solid rgba(234,242,255,.07)',
                      borderLeft: `3px solid ${tier.c}`,
                      cursor: 'pointer',
                      transition: 'background 150ms',
                    }}
                  >
                    {/* member cell */}
                    <div role="cell" style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="collection-member-name" style={{ fontFamily: AB, fontSize: 13, color: '#EAF2FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.member.name}
                        </div>
                        {r.count > 1 && (
                          <div
                            style={{
                              flex: 'none',
                              padding: '1px 5px',
                              borderRadius: 99,
                              background: 'rgba(255,197,61,.16)',
                              border: '1px solid rgba(255,197,61,.4)',
                              fontFamily: MONO,
                              fontSize: 8,
                              color: '#FFD87A',
                            }}
                          >
                            ×{r.count}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                        <span
                          style={{
                            padding: '2px 5px',
                            borderRadius: 4,
                            background: pc[0],
                            fontFamily: AB,
                            fontSize: 8,
                            color: pc[1],
                          }}
                        >
                          {party(r.member.partyCode, r.member.party)}
                        </span>
                        <Flag canton={r.member.canton} height={10} />
                        <span style={{ minWidth: 0, fontFamily: MONO, fontSize: 9, color: '#7690AE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cantonName(r.member.canton)}</span>
                      </div>
                    </div>

                    {/* rarity */}
                    <div role="cell" className="collection-rarity-cell" style={{ color: tier.c }}>
                      {rarity(r.member.ratings.rarity)}
                    </div>

                    {/* stats */}
                    <div role="cell" style={{ fontFamily: AB, fontSize: 15, color: '#FF5FA2', textAlign: 'right', alignSelf: 'center' }}>
                      {r.member.ratings.atk}
                    </div>
                    <div role="cell" style={{ fontFamily: AB, fontSize: 15, color: '#2FD3C4', textAlign: 'right', alignSelf: 'center' }}>
                      {r.member.ratings.def}
                    </div>
                    <div role="cell" style={{ fontFamily: AB, fontSize: 15, textAlign: 'right', alignSelf: 'center', color: tier.ovrTint }}>
                      {r.member.ratings.ovr}
                    </div>
                    <div role="cell" style={{ fontFamily: MONO, fontSize: 10, textAlign: 'right', alignSelf: 'center', color: '#B9A6FF' }}>
                      {tiesDisplay(r.member)}
                    </div>
                    <div role="cell" style={{ fontFamily: MONO, fontSize: 10, textAlign: 'right', alignSelf: 'center', color: '#FFD36A' }}>
                      {financeDisplay(r.member)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        /* empty state */
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', padding: '0 10px' }}>
          <div style={{ fontFamily: AB, fontSize: 19, color: '#3E5170', letterSpacing: '.02em' }}>{t('nothingHere')}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#5C7391', maxWidth: 260 }}>{t('collectionEmpty', { count: 10 })}</div>
          <button
            onClick={game.goHome}
            style={{ marginTop: 4, padding: '14px 24px', borderRadius: 12, background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 13, letterSpacing: '.06em' }}
          >
            {t('getPack')}
          </button>
        </div>
      )}

      <CardModal member={openCardMember} onClose={() => setOpenCardMember(null)} />
    </div>
  )
}
