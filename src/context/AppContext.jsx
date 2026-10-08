import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { EMPTY_INTAKE } from '../engine/presets.js'
import { generateBlueprint } from '../engine/blueprintEngine.js'
import { readSharedFromUrl } from '../engine/share.js'

const AppContext = createContext(null)

const LS_KEYS = {
  intake: 'aspir.intake',
  saved: 'aspir.saved',
  active: 'aspir.active',
  theme: 'aspir.theme',
  prospects: 'aspir.prospects',
  tour: 'aspir.tourSeen',
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
      setActiveBlueprint((cur) => (cur && cur.id === id ? cur : cur))
      notify('Enterprise deleted', 'info')
    },
    [notify],
  )

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
    setProspects((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
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
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
