// ============================================================================
//  Aspir by WTS — Shareable read-only links
//  Encodes a blueprint into a URL hash (UTF-8 safe base64) so it can be opened
//  in read-only mode on any device. Round-trips through encodeURIComponent to
//  survive unicode in the blueprint text.
// ============================================================================

function toB64(str) {
  // percent-encode → bytes → base64
  return btoa(unescape(encodeURIComponent(str)))
}
function fromB64(b64) {
  return decodeURIComponent(escape(atob(b64)))
}

export function encodeBlueprint(bp) {
  try {
    return toB64(JSON.stringify(bp))
  } catch {
    return ''
  }
}

// A decoded payload must look like a real blueprint before any module trusts
// it — otherwise a valid-base64 primitive/array (or a blueprint missing core
// fields) would set activeBlueprint and crash downstream reads.
function isBlueprintShape(x) {
  return (
    x &&
    typeof x === 'object' &&
    !Array.isArray(x) &&
    x.concept &&
    typeof x.concept === 'object' &&
    x.economics &&
    typeof x.economics === 'object' &&
    Array.isArray(x.roadmap)
  )
}

export function decodeBlueprint(str) {
  try {
    const parsed = JSON.parse(fromB64(str))
    return isBlueprintShape(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function buildShareUrl(bp) {
  const encoded = encodeBlueprint(bp)
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#view=${encoded}`
}

export function readSharedFromUrl() {
  const hash = window.location.hash || ''
  const m = hash.match(/#view=(.+)$/)
  if (!m) return null
  return decodeBlueprint(m[1])
}
