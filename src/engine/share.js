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

export function decodeBlueprint(str) {
  try {
    return JSON.parse(fromB64(str))
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
