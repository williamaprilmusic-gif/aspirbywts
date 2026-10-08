import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { EMPTY_INTAKE } from '../engine/presets.js'
import { generateBlueprint } from '../engine/blueprintEngine.js'
import { readSharedFromUrl } from '../engine/share.js'
import { buildBackup, parseBackup, mergeBy } from '../engine/backup.js'

const AppContext = createContext(null)

const LS_KEYS = {
  intake: 'aspir.intake',
  saved: 'aspir.saved',
  active: 'aspir.active',
  theme: 'aspir.theme',
  prospects: 'aspir.prospects',
  tour: 'aspir.tourSeen',
  evaluation: 'aspir.evaluation',
  evalSnapshots: 'aspir.evalSnapshots',
  guideHidden: 'aspir.guideHidden',
}

function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — fail silently */
  }
}

export function AppProvider({ children }) {
  const [intake, setIntake] = useState(() => ({ ...EMPTY_INTAKE, ...safeLoad(LS_KEYS.intake, {}) }))
  const [savedBlueprints, setSavedBlueprints] = useState(() => safeLoad(LS_KEYS.saved, []))
  const [activeBlueprint, setActiveBlueprint] = useState(() => safeLoad(LS_KEYS.active, null))
  const [theme, setTheme] = useState(() => safeLoad(LS_KEYS.theme, 'dark'))
  const [prospects, setProspects] = useState(() => safeLoad(LS_KEYS.prospects, []))
  const [tourSeen, setTourSeen] = useState(() => safeLoad(LS_KEYS.tour, false))
  const [evaluation, setEvaluation] = useState(() => safeLoad(LS_KEYS.evaluation, {}))
  const [evalSnapshots, setEvalSnapshots] = useState(() => safeLoad(LS_KEYS.evalSnapshots, []))
  const [guideHidden, setGuideHidden] = useState(() => safeLoad(LS_KEYS.guideHidden, false))
  // Read-only shared blueprint (from URL hash #view=...)
  const [shared] = useState(() => {
    try {
      return readSharedFromUrl()
    } catch {
      return null
    }
  })
  const readOnly = !!shared
  const [tab, setTab] = useState(() => (shared ? 'blueprint' : 'dashboard'))
  const [toast, setToast] = useState(null)

  // In read-only mode, surface the shared blueprint as the active one
  useEffect(() => {
    if (shared) setActiveBlueprint(shared)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persistence
  useEffect(() => safeSave(LS_KEYS.intake, intake), [intake])
  useEffect(() => safeSave(LS_KEYS.saved, savedBlueprints), [savedBlueprints])
  useEffect(() => safeSave(LS_KEYS.active, activeBlueprint), [activeBlueprint])
  useEffect(() => safeSave(LS_KEYS.theme, theme), [theme])
  useEffect(() => safeSave(LS_KEYS.prospects, prospects), [prospects])
  useEffect(() => safeSave(LS_KEYS.tour, tourSeen), [tourSeen])
  useEffect(() => safeSave(LS_KEYS.evaluation, evaluation), [evaluation])
  useEffect(() => safeSave(LS_KEYS.evalSnapshots, evalSnapshots), [evalSnapshots])
  useEffect(() => safeSave(LS_KEYS.guideHidden, guideHidden), [guideHidden])

  // Theme class on <html>
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const notify = useCallback((message, kind = 'success') => {
    if (!message) return setToast(null)
    setToast({ message, kind, at: Date.now() })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  const updateIntake = useCallback((patch) => {
    setIntake((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetIntake = useCallback(() => setIntake({ ...EMPTY_INTAKE }), [])

  const generate = useCallback(() => {
    const bp = generateBlueprint(intake)
    setActiveBlueprint(bp)
    return bp
  }, [intake])

  const saveActive = useCallback(() => {
    if (!activeBlueprint) return
    setSavedBlueprints((prev) => {
      const exists = prev.some((b) => b.id === activeBlueprint.id)
      const next = exists
        ? prev.map((b) => (b.id === activeBlueprint.id ? activeBlueprint : b))
        : [activeBlueprint, ...prev]
      return next
    })
    notify('Enterprise saved')
  }, [activeBlueprint, notify])

  const loadBlueprint = useCallback((id) => {
    setSavedBlueprints((prev) => {
      const found = prev.find((b) => b.id === id)
      if (found) setActiveBlueprint(found)
      return prev
    })
  }, [])

  const deleteBlueprint = useCallback(
    (id) => {
      setSavedBlueprints((prev) => prev.filter((b) => b.id !== id))
      // If the deleted enterprise was the one being viewed, clear it.
      setActiveBlueprint((cur) => (cur && cur.id === id ? null : cur))
      notify('Enterprise deleted', 'info')
    },
    [notify],
  )

  // Generic mutation on the active blueprint (and mirror into saved if present)
  const updateActiveBlueprint = useCallback((patch) => {
    setActiveBlueprint((prev) => {
      if (!prev) return prev
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
      setSavedBlueprints((list) => list.map((b) => (b.id === next.id ? next : b)))
      return next
    })
  }, [])

  // Roadmap mutation on the active blueprint (and mirror into saved if present)
  const updateActiveRoadmap = useCallback((updater) => {
    setActiveBlueprint((prev) => {
      if (!prev) return prev
      const nextRoadmap = updater(prev.roadmap)
      const next = { ...prev, roadmap: nextRoadmap }
      setSavedBlueprints((list) => list.map((b) => (b.id === next.id ? next : b)))
      return next
    })
  }, [])

  const toggleTask = useCallback(
    (phaseId, taskId) => {
      updateActiveRoadmap((roadmap) =>
        roadmap.map((p) =>
          p.id === phaseId
            ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
            : p,
        ),
      )
    },
    [updateActiveRoadmap],
  )

  const addTask = useCallback(
    (phaseId, text) => {
      if (!text.trim()) return
      updateActiveRoadmap((roadmap) =>
        roadmap.map((p) =>
          p.id === phaseId
            ? { ...p, tasks: [...p.tasks, { id: `${phaseId}-c${Date.now()}`, text: text.trim(), done: false, custom: true }] }
            : p,
        ),
      )
    },
    [updateActiveRoadmap],
  )

  const removeTask = useCallback(
    (phaseId, taskId) => {
      updateActiveRoadmap((roadmap) =>
        roadmap.map((p) => (p.id === phaseId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p)),
      )
    },
    [updateActiveRoadmap],
  )

  // ---- Prospect pipeline ----
  const saveProspect = useCallback(
    (lead, blueprint) => {
      setProspects((prev) => {
        const key = `${blueprint ? blueprint.id : 'global'}:${lead.name}`
        if (prev.some((p) => p.key === key)) {
          notify('Already in your pipeline', 'info')
          return prev
        }
        notify('Added to pipeline')
        return [
          {
            ...lead,
            key,
            status: 'Saved',
            notes: '',
            blueprintId: blueprint ? blueprint.id : null,
            productName: blueprint ? blueprint.concept.productName : null,
            savedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]
      })
    },
    [notify],
  )

  const isProspectSaved = useCallback(
    (lead, blueprint) => {
      const key = `${blueprint ? blueprint.id : 'global'}:${lead.name}`
      return prospects.some((p) => p.key === key)
    },
    [prospects],
  )

  const updateProspect = useCallback((key, patch) => {
    setProspects((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
    )
  }, [])

  const removeProspect = useCallback(
    (key) => {
      setProspects((prev) => prev.filter((p) => p.key !== key))
      notify('Prospect removed', 'info')
    },
    [notify],
  )

  const markTourSeen = useCallback(() => setTourSeen(true), [])
  const restartTour = useCallback(() => setTourSeen(false), [])
  const hideGuide = useCallback(() => setGuideHidden(true), [])
  const showGuide = useCallback(() => setGuideHidden(false), [])

  // ---- Workspace backup / restore ----
  const exportWorkspace = useCallback(
    () => buildBackup({ savedBlueprints, prospects, evaluation, evalSnapshots }),
    [savedBlueprints, prospects, evaluation, evalSnapshots],
  )

  const importWorkspace = useCallback(
    (text, mode = 'merge') => {
      const res = parseBackup(text)
      if (!res.ok) {
        notify(res.error, 'info')
        return res
      }
      const { data } = res
      if (mode === 'replace') {
        setSavedBlueprints(data.blueprints)
        setProspects(data.prospects)
        setEvaluation(data.evaluation)
        setEvalSnapshots(data.evalSnapshots)
      } else {
        setSavedBlueprints((prev) => mergeBy(prev, data.blueprints, 'id'))
        setProspects((prev) => mergeBy(prev, data.prospects, 'key'))
        setEvaluation((prev) => (Object.keys(data.evaluation).length ? { ...prev, ...data.evaluation } : prev))
        setEvalSnapshots((prev) => [...prev, ...data.evalSnapshots].slice(-24))
      }
      notify(`Imported ${data.blueprints.length} blueprint(s), ${data.prospects.length} prospect(s)`)
      return res
    },
    [notify],
  )

  // ---- Business evaluation ----
  const setEvalAnswer = useCallback((id, value) => {
    setEvaluation((prev) => ({ ...prev, [id]: value }))
  }, [])
  const resetEvaluation = useCallback(() => setEvaluation({}), [])
  const saveEvalSnapshot = useCallback(
    (overall) => {
      setEvalSnapshots((prev) => [
        ...prev,
        { at: new Date().toISOString(), overall, answers: { ...evaluation } },
      ].slice(-24))
      notify('Evaluation snapshot saved')
    },
    [evaluation, notify],
  )

  const value = useMemo(
    () => ({
      intake,
      updateIntake,
      resetIntake,
      setIntake,
      savedBlueprints,
      activeBlueprint,
      setActiveBlueprint,
      generate,
      saveActive,
      loadBlueprint,
      deleteBlueprint,
      toggleTask,
      addTask,
      removeTask,
      updateActiveBlueprint,
      theme,
      setTheme,
      tab,
      setTab,
      toast,
      notify,
      dismissToast,
      prospects,
      saveProspect,
      isProspectSaved,
      updateProspect,
      removeProspect,
      tourSeen,
      markTourSeen,
      restartTour,
      readOnly,
      evaluation,
      setEvalAnswer,
      resetEvaluation,
      evalSnapshots,
      saveEvalSnapshot,
      exportWorkspace,
      importWorkspace,
      guideHidden,
      hideGuide,
      showGuide,
    }),
    [
      intake,
      updateIntake,
      resetIntake,
      savedBlueprints,
      activeBlueprint,
      generate,
      saveActive,
      loadBlueprint,
      deleteBlueprint,
      toggleTask,
      addTask,
      removeTask,
      updateActiveBlueprint,
      theme,
      tab,
      toast,
      notify,
      dismissToast,
      prospects,
      saveProspect,
      isProspectSaved,
      updateProspect,
      removeProspect,
      tourSeen,
      markTourSeen,
      restartTour,
      readOnly,
      evaluation,
      setEvalAnswer,
      resetEvaluation,
      evalSnapshots,
      saveEvalSnapshot,
      exportWorkspace,
      importWorkspace,
      guideHidden,
      hideGuide,
      showGuide,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
