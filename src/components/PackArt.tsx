import type { CSSProperties, ReactNode } from 'react'
import { PACK_CLIP } from '../theme'
import { SwissCross } from './CardBack'
import { useI18n } from '../i18n'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"

export const PACK_W = 212
export const PACK_H = 318
/** Height of the perforated band that gets torn off when opening. */
export const PACK_TOP_H = 38

export const packBodyBg = 'linear-gradient(168deg,#1B2A44 0%,#101B2E 46%,#0A121F 100%)'

/** Foil sheen + top glow overlays that sit inside a pack body. */
export function PackFoil() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(112deg,rgba(255,197,61,.05) 0 1px,transparent 1px 9px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(112deg,transparent 28%,rgba(255,255,255,.11) 45%,rgba(255,255,255,.02) 53%,transparent 68%)',
        }}
      />
    </>
  )
}

/** Bottom label block — Swiss cross, wordmark, subtext. */
export function PackLabel({ subtext, rarityColor }: { subtext?: string; rarityColor?: string }) {
  const { t } = useI18n()
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '16px 15px 22px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 9,
        background: 'linear-gradient(180deg,transparent,rgba(7,12,19,.88) 46%)',
      }}
    >
      <SwissCross size={36} />
      <div style={{ fontFamily: AB, fontSize: 24, lineHeight: 0.95, color: '#fff', letterSpacing: '-.03em', textAlign: 'center' }}>
        BUNDES
        <br />
        HAUS
        <br />
        PACK
      </div>
      <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg,${rarityColor ?? 'rgba(255,197,61,.6)'},transparent)` }} />
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: rarityColor ?? '#FFD87A', textAlign: 'center' }}>{subtext ?? t('packLabel', { count: 5 })}</div>
    </div>
  )
}

/** Tear label ("TEAR ↓") pinned top-right of the pack. */
export function TearTab() {
  const { t } = useI18n()
  return (
    <div style={{ position: 'absolute', right: 11, top: 9, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: '.18em', color: '#FFD87A' }}>{t('tear')}</span>
      <span style={{ fontFamily: AB, fontSize: 9, color: '#FFC53D' }}>↓</span>
    </div>
  )
}

/** The complete, sealed pack shown on Home. */
export function PackFace({ style }: { style?: CSSProperties }) {
  return (
    <PackShell style={style}>
      <PackTop />
      <PackLabel />
    </PackShell>
  )
}

/** Pack silhouette + body gradient + foil sheen. Content is layered on top. */
export function PackShell({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  const shape: CSSProperties = {
    position: 'relative',
    width: PACK_W,
    height: PACK_H,
    background: packBodyBg,
    overflow: 'hidden',
    clipPath: PACK_CLIP,
    ...style,
  }
  return (
    <div style={shape}>
      <PackFoil />
      {children}
    </div>
  )
}

/** Top band art — gold glow, perforation dashes and the tear tab. */
export function PackTop() {
  return (
    <>
      <div
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 32, background: 'linear-gradient(180deg,rgba(255,197,61,.17),transparent)' }}
      />
      <div
        style={{ position: 'absolute', left: 0, right: 0, top: 31, height: 8, background: 'repeating-linear-gradient(90deg,rgba(7,12,19,.85) 0 4px,transparent 4px 9px)' }}
      />
      <div
        style={{ position: 'absolute', left: 0, right: 0, top: 36, height: 1, background: 'repeating-linear-gradient(90deg,rgba(255,197,61,.75) 0 5px,transparent 5px 10px)' }}
      />
      <TearTab />
    </>
  )
}
