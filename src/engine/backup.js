// ============================================================================
//  Aspir by WTS — Workspace backup / restore
//  Serialize the whole workspace (blueprints, pipeline, evaluation) to a
//  portable JSON file, and safely parse/validate one on import.
// ============================================================================

export const BACKUP_VERSION = 1

export function buildBackup({ savedBlueprints = [], prospects = [], evaluation = {}, evalSnapshots = [] }) {
  return {
    app: 'aspir-by-wts',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    blueprints: savedBlueprints,
    prospects,
    evaluation,
    evalSnapshots,
  }
}

// Returns { ok, data?, error? }. Tolerant: accepts partial files.
export function parseBackup(text) {
  let obj
  try {
    obj = typeof text === 'string' ? JSON.parse(text) : text
  } catch {
    return { ok: false, error: 'Not valid JSON.' }
  }
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'Empty or malformed file.' }
  if (obj.app && obj.app !== 'aspir-by-wts') {
    return { ok: false, error: 'This file is not an Aspir workspace export.' }
  }
  const data = {
    blueprints: Array.isArray(obj.blueprints) ? obj.blueprints.filter((b) => b && b.id && b.concept) : [],
    prospects: Array.isArray(obj.prospects) ? obj.prospects.filter((p) => p && p.key) : [],
    evaluation: obj.evaluation && typeof obj.evaluation === 'object' ? obj.evaluation : {},
    evalSnapshots: Array.isArray(obj.evalSnapshots) ? obj.evalSnapshots : [],
  }
  if (!data.blueprints.length && !data.prospects.length && !Object.keys(data.evaluation).length) {
    return { ok: false, error: 'No importable data found in this file.' }
  }
  return { ok: true, data }
}

// Merge two lists keyed by a field, incoming taking precedence.
export function mergeBy(existing = [], incoming = [], key) {
  const map = new Map()
  existing.forEach((x) => map.set(x[key], x))
  incoming.forEach((x) => map.set(x[key], x))
  return Array.from(map.values())
}

export function backupSummary(data) {
  return `${data.blueprints.length} blueprint${data.blueprints.length === 1 ? '' : 's'}, ` +
    `${data.prospects.length} prospect${data.prospects.length === 1 ? '' : 's'}` +
    `${Object.keys(data.evaluation).length ? ', 1 evaluation' : ''}`
}
