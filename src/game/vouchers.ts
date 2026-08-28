// Voucher code generation and verification.
//
// This app has no backend (static GitHub Pages site, `localStorage` only),
// so there is no central authority that can enforce a code being used only
// once *globally*. Instead, redemption is tracked per-device (see
// `loadRedeemedVouchers`/`persistRedeemedVouchers` in `./storage`): a code
// can't be redeemed twice on the same browser, but nothing stops it being
// redeemed once per device, or reused after clearing site data.
//
// A code encodes its voucher type/rarity plus a random nonce, signed with an
// HMAC-SHA256 key so codes can't be trivially guessed or hand-typed by
// accident. The key ships inside the client bundle (there's nowhere else for
// it to live without a server), so this only raises the bar against casual
// guessing — not against someone extracting the key from the bundle and
// minting their own codes.
//
// Isomorphic on purpose: this module only uses Web Crypto (`crypto.subtle`,
// `crypto.getRandomValues`), available in both browsers and Node 20+. That
// lets `scripts/generate-vouchers.mts` import it directly as the single
// source of truth for the encoding, instead of keeping a second
// implementation in sync.

import type { RarityKey } from '../theme'

export const VOUCHER_TYPES = ['refill', 'rarity', 'timer'] as const
export type VoucherType = (typeof VOUCHER_TYPES)[number]

/** Rarities a rarity voucher can target. Mythic is the seven sitting Federal
 * Councillors (fixed membership, not a percentile score), so it's excluded. */
export const VOUCHER_RARITIES: RarityKey[] = ['common', 'uncommon', 'rare', 'ultra', 'legend']

/** Default number of packs a refill voucher grants when none is specified. */
export const DEFAULT_REFILL_AMOUNT = 5

const VERSION = 1
const TYPE_CODES: Record<VoucherType, number> = Object.fromEntries(
  VOUCHER_TYPES.map((type, i) => [type, i]),
) as Record<VoucherType, number>
const NO_PARAM = 0xff

// Crockford base32: excludes I, L, O, U so handwritten or read-aloud codes
// don't get confused with 1/1/0/V.
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/**
 * Signing key for voucher codes — see the file-level note above on why this
 * is not a secret against a determined reverse-engineer. Keep this file as
 * the single source of truth; do not duplicate the key elsewhere.
 */
const SECRET_KEY_HEX = '095637d7bee2a54beb2acacfb78f40133fc086cb47e17c06ffa7b5b091154bf8'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

let keyPromise: Promise<CryptoKey> | null = null
function getKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey(
    'raw',
    hexToBytes(SECRET_KEY_HEX) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  return keyPromise
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}

function base32Decode(str: string): Uint8Array | null {
  const clean = str.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (!clean) return null
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) return null
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** Cosmetic grouping only — `XXXX-XXXX-...` is easier to read/type than one long run. */
function formatCode(raw: string): string {
  return raw.match(/.{1,4}/g)?.join('-') ?? raw
}

export interface VoucherPayload {
  type: VoucherType
  /** Target rarity for `rarity` vouchers; null for `refill`/`timer`. */
  rarity: RarityKey | null
  /** Packs granted, for `refill` vouchers; null for `rarity`/`timer`. */
  amount: number | null
}

const NONCE_BYTES = 4
const TAG_BYTES = 4
const BODY_BYTES = 3 + NONCE_BYTES // version + type + param + nonce

/** Builds and signs a new voucher code. Used by the offline generator script. */
export async function generateVoucherCode(payload: VoucherPayload): Promise<string> {
  const typeCode = TYPE_CODES[payload.type]
  let param = NO_PARAM
  if (payload.type === 'rarity') {
    param = VOUCHER_RARITIES.indexOf(payload.rarity as RarityKey)
    if (param < 0) throw new Error(`invalid voucher rarity: ${String(payload.rarity)}`)
  } else if (payload.type === 'refill') {
    param = payload.amount ?? DEFAULT_REFILL_AMOUNT
    if (!Number.isInteger(param) || param < 1 || param > 255) {
      throw new Error(`invalid voucher refill amount: ${String(payload.amount)}`)
    }
  }
  const nonce = new Uint8Array(NONCE_BYTES)
  crypto.getRandomValues(nonce)
  const body = new Uint8Array([VERSION, typeCode, param, ...nonce])
  const key = await getKey()
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, body as BufferSource))
  const full = new Uint8Array([...body, ...sig.slice(0, TAG_BYTES)])
  return formatCode(base32Encode(full))
}

export type VoucherVerifyResult =
  | { ok: true; payload: VoucherPayload; nonce: string }
  | { ok: false; reason: 'malformed' | 'signature' }

/**
 * Verifies a voucher code's signature and decodes its payload. Does not
 * check whether it has already been redeemed on this device — pair with
 * `loadRedeemedVouchers`/`persistRedeemedVouchers` from `./storage` for that.
 */
export async function verifyVoucherCode(code: string): Promise<VoucherVerifyResult> {
  const bytes = base32Decode(code)
  if (!bytes || bytes.length !== BODY_BYTES + TAG_BYTES) return { ok: false, reason: 'malformed' }
  const body = bytes.slice(0, BODY_BYTES)
  const tag = bytes.slice(BODY_BYTES)
  const [version, typeCode, param] = body
  const type = version === VERSION ? VOUCHER_TYPES[typeCode] : undefined
  if (!type) return { ok: false, reason: 'malformed' }
  const rarity = type === 'rarity' ? (VOUCHER_RARITIES[param] ?? null) : null
  if (type === 'rarity' && !rarity) return { ok: false, reason: 'malformed' }
  const amount = type === 'refill' ? param : null
  if (type === 'refill' && (amount === null || amount < 1)) return { ok: false, reason: 'malformed' }

  const key = await getKey()
  const expectedSig = new Uint8Array(await crypto.subtle.sign('HMAC', key, body as BufferSource))
  if (!timingSafeEqual(expectedSig.slice(0, TAG_BYTES), tag)) return { ok: false, reason: 'signature' }

  // Stable per-code id for the redeemed-set: the nonce bytes, re-encoded.
  const nonce = base32Encode(body.slice(3))
  return { ok: true, payload: { type, rarity, amount }, nonce }
}
