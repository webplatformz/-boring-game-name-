import { useState, useMemo } from 'react'
import { MEMBERS_BY_ID } from '../data/members'
import type { Game } from '../game/useGame'
import type { Member } from '../data/members'
import type { RarityKey } from '../theme'
import { TIERS, RARITY_ORDER, partyColors } from '../theme'
import { getNextRarity } from '../game/pack'
import { Flag } from '../components/Flag'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

// Rarity tiers eligible for trade in (all except Mythic, which is top tier)
const TRADEABLE_RARITIES: RarityKey[] = RARITY_ORDER.slice(0, -1) as RarityKey[]

export function Trade({ game }: { game: Game }) {
  const { t, rarity, party } = useI18n()
  const [selectedRarity, setSelectedRarity] = useState<RarityKey>(
    () => game.state.tradeRarity ?? 'common',
  )
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])

  const targetRarity = getNextRarity(selectedRarity)

  // Switch rarity -> clear current selection
  const handleSelectRarity = (rarity: RarityKey) => {
    setSelectedRarity(rarity)
    setSelectedMemberIds([])
  }

  // Owned cards of currently selected rarity
  const ownedOfRarity = useMemo(() => {
    const list: { member: Member; totalOwned: number }[] = []
    for (const [idStr, count] of Object.entries(game.state.owned)) {
      if (count <= 0) continue
      const m = MEMBERS_BY_ID.get(Number(idStr))
      if (m && m.ratings.rarity === selectedRarity) {
        list.push({ member: m, totalOwned: count })
      }
    }
    return list.sort((a, b) => a.member.ratings.ovr - b.member.ratings.ovr)
  }, [game.state.owned, selectedRarity])

  // Count how many of each member ID are currently selected in slots
  const selectedCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const id of selectedMemberIds) {
      counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }, [selectedMemberIds])

  // Add one copy of member
  const handleAddCard = (memberId: number) => {
    if (selectedMemberIds.length >= 5) return
    const ownedItem = ownedOfRarity.find((item) => item.member.id === memberId)
    if (!ownedItem) return
    const currentSelected = selectedCounts[memberId] || 0
    if (currentSelected >= ownedItem.totalOwned) return // cannot select more than owned

    setSelectedMemberIds([...selectedMemberIds, memberId])
  }

  // Remove card at slot index
  const handleRemoveSlot = (index: number) => {
    const next = [...selectedMemberIds]
    next.splice(index, 1)
    setSelectedMemberIds(next)
  }

  // Clear all selected slots
  const handleClear = () => {
    setSelectedMemberIds([])
  }

  // Auto-fill slots up to 5, or only duplicate copies when available.
  const handleAutoFill = () => {
    const newSelection = [...selectedMemberIds]
    const tempCounts: Record<number, number> = { ...selectedCounts }

    // First pass: add duplicate copies (where totalOwned > 1)
    for (const { member, totalOwned } of ownedOfRarity) {
      if (totalOwned > 1) {
        const currentlySelected = tempCounts[member.id] || 0
        const reservedCopy = currentlySelected > 0 ? 0 : 1
        const availableDuplicates = totalOwned - currentlySelected - reservedCopy
        for (let i = 0; i < availableDuplicates && newSelection.length < 5; i++) {
          newSelection.push(member.id)
          tempCounts[member.id] = (tempCounts[member.id] || 0) + 1
        }
      }
      if (newSelection.length >= 5) break
    }

    // Regular auto-fill uses non-duplicate copies only when no duplicates remain.
    if (!hasDupesLeft && newSelection.length < 5) {
      for (const { member, totalOwned } of ownedOfRarity) {
        const currentlyUsed = tempCounts[member.id] || 0
        const remainingOwned = totalOwned - currentlyUsed
        for (let i = 0; i < remainingOwned && newSelection.length < 5; i++) {
          newSelection.push(member.id)
          tempCounts[member.id] = (tempCounts[member.id] || 0) + 1
        }
        if (newSelection.length >= 5) break
      }
    }

    setSelectedMemberIds(newSelection)
  }

  const hasDupesLeft = ownedOfRarity.some(
    ({ member, totalOwned }) => totalOwned - (selectedCounts[member.id] || 0) > 1,
  )

  const canTrade = selectedMemberIds.length === 5 && targetRarity !== null

  const handleTrade = () => {
    if (!canTrade || !targetRarity) return
    game.executeTrade(selectedMemberIds, selectedRarity)
  }

  const currentTier = TIERS[selectedRarity]
  const targetTier = targetRarity ? TIERS[targetRarity] : null

  return (
    <div
      className="screen-fill tabbed-screen"
      style={{
        padding: '14px 20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflow: 'hidden',
        animation: 'riseIn 300ms ease-out',
      }}
    >
      {/* Header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: AB, fontSize: 26, letterSpacing: '-.03em' }}>{t('tradeTitle')}</div>
          <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: '#5C7391' }}>
            {t('tradeSubtitle')}
          </div>
        </div>
      </div>

      {/* Rarity selector chips */}
      <div style={{ flex: 'none', display: 'flex', gap: 6, overflow: 'auto', paddingBottom: 4 }} className="no-scrollbar">
        {TRADEABLE_RARITIES.map((r) => {
          const tier = TIERS[r]
          const on = selectedRarity === r
          return (
            <button
              key={r}
              onClick={() => handleSelectRarity(r)}
              style={{
                flex: 'none',
                padding: '8px 14px',
                borderRadius: 9,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '.12em',
                whiteSpace: 'nowrap',
                background: on ? `${tier.c}28` : 'rgba(234,242,255,.05)',
                border: on ? `1.5px solid ${tier.c}` : '1px solid rgba(234,242,255,.12)',
                color: on ? tier.c : '#7690AE',
                cursor: 'pointer',
              }}
            >
              {rarity(r)}
            </button>
          )
        })}
      </div>

      {/* Trade conversion banner */}
      {targetTier && (
        <div
          style={{
            flex: 'none',
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(234,242,255,.04)',
            border: '1px solid rgba(234,242,255,.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: AB, fontSize: 11, color: currentTier.c }}>5× {rarity(selectedRarity)}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: '#5C7391' }}>→</span>
            <span style={{ fontFamily: AB, fontSize: 11, color: targetTier.c }}>1× {targetRarity ? rarity(targetRarity) : ''}</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#7690AE', letterSpacing: '.1em' }}>
            {t('selectedCount', { count: selectedMemberIds.length })}
          </div>
        </div>
      )}

      {/* 5 Card Slots */}
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {Array.from({ length: 5 }).map((_, idx) => {
            const memberId = selectedMemberIds[idx]
            const member = memberId ? MEMBERS_BY_ID.get(memberId) : null

            return (
              <button
                key={idx}
                onClick={() => member && handleRemoveSlot(idx)}
                style={{
                  aspectRatio: '3/4',
                  borderRadius: 8,
                  border: member
                    ? `1.5px solid ${currentTier.c}`
                    : '1px dashed rgba(234,242,255,.2)',
                  background: member ? `${currentTier.c}18` : 'rgba(234,242,255,.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  cursor: member ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {member ? (
                  <>
                    <div
                      style={{
                        fontFamily: AB,
                        fontSize: 9,
                        color: '#EAF2FF',
                        textAlign: 'center',
                        lineHeight: 1.1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {member.name.split(' ').pop()}
                    </div>
                    <div style={{ fontFamily: AB, fontSize: 11, color: currentTier.ovrTint, marginTop: 2 }}>
                      {member.ratings.ovr}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        width: 14,
                        height: 14,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        background: 'rgba(255,95,162,.08)',
                        fontFamily: MONO,
                        fontSize: 10,
                        lineHeight: 1,
                        color: 'rgba(255,158,196,.8)',
                      }}
                    >
                      ✕
                    </div>
                  </>
                ) : (
                  <span style={{ fontFamily: MONO, fontSize: 14, color: '#3E5170' }}>+</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Action controls for slots */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={handleAutoFill}
            disabled={ownedOfRarity.length === 0}
            style={{
              justifySelf: 'start',
              minWidth: 112,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(255,197,61,.12)',
              border: '1px solid rgba(255,197,61,.3)',
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '.12em',
              color: '#FFD87A',
              cursor: 'pointer',
              opacity: ownedOfRarity.length === 0 ? 0.5 : 1,
            }}
          >
            {t('autoFill')}{hasDupesLeft ? ` ${t('dupes')}` : ''}
          </button>
          <button
            onClick={handleClear}
            disabled={selectedMemberIds.length === 0}
            style={{
              justifySelf: 'end',
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(234,242,255,.05)',
              border: '1px solid rgba(234,242,255,.12)',
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '.12em',
              color: '#7690AE',
              cursor: selectedMemberIds.length > 0 ? 'pointer' : 'default',
              opacity: selectedMemberIds.length > 0 ? 1 : 0.45,
            }}
          >
            {t('clear')}
          </button>
        </div>
      </div>

      {/* Trade Button */}
      <button
        onClick={handleTrade}
        disabled={!canTrade}
        style={{
          flex: 'none',
          padding: '14px 20px',
          borderRadius: 12,
          textAlign: 'center',
          background: canTrade
            ? 'linear-gradient(100deg,#FFC53D,#FF9E3D)'
            : 'rgba(234,242,255,.05)',
          color: canTrade ? '#0A0F18' : '#3E5170',
          fontFamily: AB,
          fontSize: 14,
          letterSpacing: '.06em',
          cursor: canTrade ? 'pointer' : 'default',
          border: 'none',
          boxShadow: canTrade ? '0 4px 20px rgba(255,197,61,.25)' : 'none',
          transition: 'all 200ms',
        }}
      >
        {canTrade
          ? t('tradeReady', { rarity: targetRarity ? rarity(targetRarity) : '' })
          : t('tradeSelect', { rarity: rarity(selectedRarity) })}
      </button>

      {/* Available cards table */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(234,242,255,.1)',
          background: '#0B121D',
        }}
      >
        <div
          style={{
            flex: 'none',
            padding: '10px 12px',
            background: 'rgba(234,242,255,.05)',
            borderBottom: '1px solid rgba(234,242,255,.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#5C7391' }}>
            {t('availableCards', { rarity: rarity(selectedRarity) })}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#5C7391' }}>
            {ownedOfRarity.length} UNIQUE CARDS
          </span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {ownedOfRarity.length > 0 ? (
            ownedOfRarity.map(({ member, totalOwned }) => {
              const pc = partyColors(member.partyCode)
              const used = selectedCounts[member.id] || 0
              const remaining = totalOwned - used
              const canAdd = remaining > 0 && selectedMemberIds.length < 5

              return (
                <div
                  key={member.id}
                  onClick={() => canAdd && handleAddCard(member.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 44px',
                    gap: 8,
                    padding: '11px 12px',
                    borderBottom: '1px solid rgba(234,242,255,.07)',
                    borderLeft: `3px solid ${currentTier.c}`,
                    cursor: canAdd ? 'pointer' : 'default',
                    opacity: remaining > 0 ? 1 : 0.4,
                    background: used > 0 ? `${currentTier.c}0D` : 'transparent',
                    transition: 'background 150ms',
                  }}
                >
                  {/* Member info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        style={{
                          fontFamily: AB,
                          fontSize: 13,
                          color: '#EAF2FF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {member.name}
                      </div>
                      {totalOwned > 1 && (
                        <span
                          style={{
                            padding: '1px 5px',
                            borderRadius: 99,
                            background: 'rgba(255,197,61,.16)',
                            border: '1px solid rgba(255,197,61,.4)',
                            fontFamily: MONO,
                            fontSize: 8,
                            color: '#FFD87A',
                          }}
                        >
                          ×{totalOwned}
                        </span>
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
                        {party(member.partyCode, member.party)}
                      </span>
                      <Flag canton={member.canton} height={10} />
                      <span style={{ fontFamily: MONO, fontSize: 9, color: '#7690AE' }}>
                        {member.cantonName}
                      </span>
                    </div>
                  </div>

                  {/* Available count indicator */}
                  <div style={{ alignSelf: 'center', textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 10,
                        color: remaining > 0 ? '#8FEDE3' : '#5C7391',
                      }}
                    >
                      {t('availableShort', { count: remaining })}
                    </span>
                  </div>

                  {/* OVR */}
                  <div
                    style={{
                      fontFamily: AB,
                      fontSize: 15,
                      textAlign: 'right',
                      alignSelf: 'center',
                      color: currentTier.ovrTint,
                    }}
                  >
                    {member.ratings.ovr}
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '30px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: AB, fontSize: 14, color: '#3E5170' }}>
                {t('noRarityOwned', { rarity: rarity(selectedRarity) })}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#5C7391' }}>
                {t('acquireRarity', { rarity: rarity(selectedRarity) })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
