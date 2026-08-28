import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Game } from '../game/useGame'
import { useI18n } from '../i18n'
import type { TranslationKey } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

const ERROR_KEYS: Record<string, TranslationKey> = {
  invalid: 'voucherErrorInvalid',
  'already-redeemed': 'voucherErrorUsed',
  'no-timer': 'voucherErrorNoTimer',
}

/** A code-entry dialog for redeeming vouchers. Refill/timer vouchers apply in
 * place and show a confirmation here; rarity vouchers hand off to the normal
 * pack-tear flow, so the dialog just closes on success. */
export function VoucherModal({ open, onClose, game }: { open: boolean; onClose: () => void; game: Game }) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCode('')
      setBusy(false)
      setSuccessMessage(null)
      setErrorMessage(null)
    }
  }, [open])

  if (!open) return null

  const handleRedeem = async () => {
    const trimmed = code.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setErrorMessage(null)
    const result = await game.redeemVoucher(trimmed)
    if (result.ok) {
      if (result.type === 'rarity') {
        onClose()
        return
      }
      setBusy(false)
      setCode('')
      setSuccessMessage(
        result.type === 'refill' ? t('voucherSuccessRefill', { count: result.packs }) : t('voucherSuccessTimer'),
      )
    } else {
      setBusy(false)
      setErrorMessage(t(ERROR_KEYS[result.reason] ?? 'voucherErrorInvalid'))
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(4,7,12,.86)',
        backdropFilter: 'blur(4px)',
        padding: 20,
        animation: 'fadeIn 200ms ease-out backwards',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('voucherModalTitle')}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          borderRadius: 16,
          background: '#0B121D',
          border: '1px solid rgba(234,242,255,.12)',
          padding: '22px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          animation: 'riseIn 200ms ease-out backwards',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: AB, fontSize: 16, letterSpacing: '.02em', color: '#EAF2FF' }}>{t('voucherModalTitle')}</div>
          <button
            onClick={onClose}
            aria-label={t('voucherCloseAria')}
            style={{ color: '#5C7391', fontSize: 20, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#9FB6D2', lineHeight: 1.5 }}>{t('voucherModalSubtitle')}</div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleRedeem()
          }}
          placeholder={t('voucherCodePlaceholder')}
          autoFocus
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(234,242,255,.05)',
            border: '1px solid rgba(234,242,255,.14)',
            color: '#EAF2FF',
            fontFamily: MONO,
            fontSize: 14,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}
        />
        {errorMessage && (
          <div role="alert" style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.04em', color: '#FF6B6B' }}>
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div role="status" style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.04em', color: '#2FD3C4' }}>
            {successMessage}
          </div>
        )}
        <button
          onClick={() => void handleRedeem()}
          disabled={!code.trim() || busy}
          style={{
            padding: '13px 18px',
            borderRadius: 11,
            textAlign: 'center',
            fontFamily: AB,
            fontSize: 13,
            letterSpacing: '.06em',
            background: code.trim() && !busy ? 'linear-gradient(100deg,#FFC53D,#FF9E3D)' : 'rgba(234,242,255,.05)',
            color: code.trim() && !busy ? '#0A0F18' : '#3E5170',
          }}
        >
          {t('voucherRedeemBtn')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
