// ============================================================================
//  Aspir by WTS — Guided onboarding steps
//  Computes a simple, ordered "getting started" checklist from app state so the
//  UI can always tell the user exactly what to do next.
// ============================================================================

import { roadmapStats } from './insights.js'

export function getStartedSteps({ activeBlueprint: bp, savedBlueprints = [], prospects = [], evaluation = {} }) {
  const hasBlueprint = !!bp
  const saved = bp ? savedBlueprints.some((b) => b.id === bp.id) : false
  const started = bp ? !!bp.startDate : false
  const mineProspects = bp ? prospects.filter((p) => p.blueprintId === bp.id).length : prospects.length
  const evaluated = Object.keys(evaluation || {}).length > 0
  const hasGoal = bp ? (bp.goals || []).length > 0 : false

  return [
    {
      key: 'blueprint',
      label: 'Create your blueprint',
      help: 'Answer a few questions about yourself — we build your business plan.',
      cta: 'Start the intake',
      tab: 'intake',
      done: hasBlueprint,
    },
    {
      key: 'save',
      label: 'Save your enterprise',
      help: 'Keep your blueprint so it’s here next time.',
      cta: 'Open blueprint',
      tab: 'blueprint',
      done: saved,
    },
    {
      key: 'start',
      label: 'Set your launch date',
      help: 'Pick a start date to turn on your 90-day plan.',
      cta: 'Open roadmap',
      tab: 'roadmap',
      done: started,
    },
    {
      key: 'prospects',
      label: 'Find 3 clients to pursue',
      help: 'Enter a city and country to get a list of companies to contact.',
      cta: 'Open finder',
      tab: 'finder',
      done: mineProspects >= 3,
    },
    {
      key: 'goal',
      label: 'Set one goal',
      help: 'Pick a target — customers, revenue, or a launch date.',
      cta: 'Open goals',
      tab: 'goals',
      done: hasGoal,
    },
    {
      key: 'evaluate',
      label: 'Run a health check',
      help: 'Rate your business to see what to improve.',
      cta: 'Open evaluation',
      tab: 'evaluate',
      done: evaluated,
    },
  ]
}

export function nextStep(state) {
  const steps = getStartedSteps(state)
  const idx = steps.findIndex((s) => !s.done)
  const doneCount = steps.filter((s) => s.done).length
  return {
    steps,
    doneCount,
    total: steps.length,
    allDone: idx === -1,
    current: idx === -1 ? null : { ...steps[idx], number: idx + 1 },
  }
}
