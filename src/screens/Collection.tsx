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

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export function Collection({ game }: { game: Game }) {
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
      result = result.filter((r) => selectedRarities.has(r.member.rarity))
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
        const ai = rarityIndex(a.member.rarity)
        const bi = rarityIndex(b.member.rarity)
        if (ai !== bi) return (ai - bi) * sortDir
        // tiebreaker: OVR descending
        return b.member.ovr - a.member.ovr
      }

      const av: string | number = a.member[sortKey]
      const bv: string | number = b.member[sortKey]

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
    next.has(canton) ? next.delete(canton) : next.add(canton)
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
      className="screen-fill tabbed-screen"
      style={{ padding: '22px 20px 90px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden', animation: 'riseIn 300ms ease-out' }}
    >
      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: AB, fontSize: 26, letterSpacing: '-.03em' }}>THE COLLECTION</div>
          <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: '#5C7391' }}>
            {ownedList.length} OF {MEMBERS.length} MEMBERS
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
          TRADE IN →
        </button>
      </div>

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
              ALL
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
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* sort chips */}
          <div style={{ flex: 'none', display: 'flex', gap: 6, overflow: 'auto', paddingBottom: 4 }} className="no-scrollbar">
            {(['rarity', 'ovr', 'atk', 'def', 'name'] as SortKey[]).map((k) => {
              const on = sortKey === k
              const label = k === 'ovr' ? 'OVR' : k === 'atk' ? 'ATK' : k === 'def' ? 'DEF' : k === 'rarity' ? 'RARITY' : 'NAME'
              const arrow = on ? (sortDir < 0 ? ' ↓' : ' ↑') : ''
              return (
                <button
                  key={k}
                  onClick={() => toggleSort(k)}
                  style={{
                    flex: 'none',
                    padding: '6px 10px',
                    borderRadius: 9,
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: '.12em',
                    whiteSpace: 'nowrap',
                    background: on ? 'rgba(255,197,61,.14)' : 'rgba(234,242,255,.05)',
                    border: on ? '1px solid rgba(255,197,61,.5)' : '1px solid rgba(234,242,255,.12)',
                    color: on ? '#FFD87A' : '#7690AE',
                  }}
                >
                  {label}
                  {arrow}
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
              {selectedCantons.size === 0 ? 'CANTONS ▾' : `CANTONS · ${selectedCantons.size} SELECTED ▾`}
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
                      {canton}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* table */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(234,242,255,.1)', background: '#0B121D' }}>
            {/* header row */}
            <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: '1fr 40px 40px 44px', gap: 8, padding: '10px 12px', background: 'rgba(234,242,255,.05)', borderBottom: '1px solid rgba(234,242,255,.1)' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#5C7391' }}>MEMBER</div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#FF9EC4', textAlign: 'right' }}>ATK</div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#8FEDE3', textAlign: 'right' }}>DEF</div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#FFD87A', textAlign: 'right' }}>OVR</div>
            </div>

            {/* rows */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              {sorted.map((r) => {
                const t = TIERS[r.member.rarity]
                const pc = partyColors(r.member.partyCode)
                return (
                  <div
                    key={r.member.id}
                    onClick={() => setOpenCardMember(r.member)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 40px 40px 44px',
                      gap: 8,
                      padding: '11px 12px',
                      borderBottom: '1px solid rgba(234,242,255,.07)',
                      borderLeft: `3px solid ${t.c}`,
                      cursor: 'pointer',
                      transition: 'background 150ms',
                    }}
                  >
                    {/* member cell */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontFamily: AB, fontSize: 13, color: '#EAF2FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                          {r.member.party}
                        </span>
                        <Flag canton={r.member.canton} height={10} />
                        <span style={{ fontFamily: MONO, fontSize: 9, color: '#7690AE' }}>{r.member.cantonName}</span>
                      </div>
                    </div>

                    {/* stats */}
                    <div style={{ fontFamily: AB, fontSize: 15, color: '#FF5FA2', textAlign: 'right', alignSelf: 'center' }}>
                      {r.member.atk}
                    </div>
                    <div style={{ fontFamily: AB, fontSize: 15, color: '#2FD3C4', textAlign: 'right', alignSelf: 'center' }}>
                      {r.member.def}
                    </div>
                    <div style={{ fontFamily: AB, fontSize: 15, textAlign: 'right', alignSelf: 'center', color: t.ovrTint }}>
                      {r.member.ovr}
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
          <div style={{ fontFamily: AB, fontSize: 19, color: '#3E5170', letterSpacing: '.02em' }}>NOTHING IN HERE YET</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#5C7391', maxWidth: 260 }}>Rip your first pack and ten members of the house land in this table.</div>
          <button
            onClick={game.goHome}
            style={{ marginTop: 4, padding: '14px 24px', borderRadius: 12, background: 'linear-gradient(100deg,#FFC53D,#FF9E3D)', color: '#0A0F18', fontFamily: AB, fontSize: 13, letterSpacing: '.06em' }}
          >
            GO GET A PACK
          </button>
        </div>
      )}

      <CardModal member={openCardMember} onClose={() => setOpenCardMember(null)} />
    </div>
  )
}
