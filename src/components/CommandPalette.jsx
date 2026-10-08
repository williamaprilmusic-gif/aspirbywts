import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutDashboard, Inbox, BrainCircuit, Map, Target, Wallet, LineChart, MapPin, Workflow, GitCompare,
  Stethoscope, FolderOpen, Search, CornerDownLeft,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', hint: 'Home & attention feed', icon: LayoutDashboard },
  { id: 'intake', label: 'Intake', hint: 'Profile & aspirations', icon: Inbox },
  { id: 'blueprint', label: 'Blueprint', hint: 'Your business plan', icon: BrainCircuit },
  { id: 'roadmap', label: 'Roadmap', hint: '90-day plan', icon: Map },
  { id: 'goals', label: 'Goals', hint: 'Targets & scoreboard', icon: Target },
  { id: 'planner', label: 'Launch Plan', hint: 'Capital & validation', icon: Wallet },
  { id: 'financials', label: 'Financials', hint: 'Economics & scenarios', icon: LineChart },
  { id: 'finder', label: 'Finder', hint: 'Find clients by location', icon: MapPin },
  { id: 'pipeline', label: 'Pipeline', hint: 'Track prospects', icon: Workflow },
  { id: 'compare', label: 'Compare', hint: 'Compare enterprises', icon: GitCompare },
  { id: 'evaluate', label: 'Evaluate', hint: 'Business health check', icon: Stethoscope },
  { id: 'saved', label: 'Saved', hint: 'Load, export, backup', icon: FolderOpen },
]

export default function CommandPalette() {
  const { setTab, readOnly } = useApp()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return ITEMS
    return ITEMS.filter((i) => i.label.toLowerCase().includes(t) || i.hint.toLowerCase().includes(t))
  }, [q])

  useEffect(() => {
    if (active >= results.length) setActive(0)
  }, [results, active])

  if (readOnly || !open) return null

  const go = (id) => {
    setTab(id)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      go(results[active].id)
    }
  }

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="glass-strong relative w-full max-w-lg overflow-hidden p-0" role="dialog" aria-label="Command palette">
        <div className="flex items-center gap-2 border-b border-white/10 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to…"
            className="w-full bg-transparent py-3.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block">esc</kbd>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No matches</li>}
          {results.map((r, i) => {
            const Icon = r.icon
            return (
              <li key={r.id}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    i === active ? 'bg-gradient-to-r from-emerald-500/20 to-violet-500/20' : 'hover:bg-white/5'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${i === active ? 'text-emerald-300' : 'text-slate-400'}`} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-slate-100">{r.label}</span>
                    <span className="block text-xs text-slate-500">{r.hint}</span>
                  </span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-500" />}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="border-t border-white/10 px-4 py-2 text-[10px] text-slate-500">
          ↑↓ to navigate · ↵ to open · ⌘K / Ctrl K to toggle
        </div>
      </div>
    </div>
  )
}
