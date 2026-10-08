import React, { useState } from 'react'
import { Map, Plus, Trash2, FileJson, FileText, CheckCircle2, Circle, Flag, Lock, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, ProgressBar, EmptyState, TextInput } from '../components/ui.jsx'
import { roadmapToMarkdown, downloadText, downloadJSON, slugify } from '../engine/exporters.js'
import { roadmapGating, phaseDates, phaseStatus, fmtDate } from '../engine/execution.js'

export default function Roadmap() {
  const { activeBlueprint: bp, toggleTask, addTask, removeTask, setTab, notify, updateActiveBlueprint, readOnly } = useApp()
  const [drafts, setDrafts] = useState({})

  if (!bp) {
    return (
      <EmptyState icon={Map} title="No roadmap yet" action={<Button className="mt-2" onClick={() => setTab('intake')}>Start intake</Button>}>
        Generate a blueprint first — your interactive 90-day execution tracker will appear here.
      </EmptyState>
    )
  }

  const allTasks = bp.roadmap.flatMap((p) => p.tasks)
  const done = allTasks.filter((t) => t.done).length
  const total = allTasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const exportMd = () => {
    downloadText(`${slugify(bp.concept.productName)}-roadmap.md`, roadmapToMarkdown(bp))
    notify('Roadmap exported as Markdown')
  }
  const exportJson = () => {
    downloadJSON(`${slugify(bp.concept.productName)}-roadmap.json`, { product: bp.concept.productName, roadmap: bp.roadmap })
    notify('Roadmap exported as JSON')
  }

  const startDate = bp.startDate || ''
  const setStartDate = (v) => updateActiveBlueprint({ startDate: v })
  const gating = roadmapGating(bp.roadmap)

  return (
    <div className="mx-auto max-w-5xl animate-fade-up space-y-6">
      <Card strong>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge color="violet" className="mb-2"><Map className="h-3 w-3" /> 90-Day Execution Tracker</Badge>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">Operational Roadmap</h1>
            <p className="mt-1 text-sm text-slate-400">Execute {bp.concept.productName} phase by phase.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" icon={FileText} onClick={exportMd}>Markdown</Button>
            <Button variant="ghost" icon={FileJson} onClick={exportJson}>JSON</Button>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-300">Overall completion</span>
            <span className="font-semibold text-emerald-300">{done}/{total} · {pct}%</span>
          </div>
          <ProgressBar value={pct} />
        </div>
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <CalendarDays className="h-4 w-4 text-violet-400" />
            Launch start date
          </label>
          <input
            type="date"
            value={startDate}
            disabled={readOnly}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-400/50 disabled:opacity-60 [color-scheme:dark]"
          />
        </div>
      </Card>

      <div className="space-y-5">
        {bp.roadmap.map((phase, idx) => {
          const pdone = phase.tasks.filter((t) => t.done).length
          const ppct = phase.tasks.length ? Math.round((pdone / phase.tasks.length) * 100) : 0
          const complete = ppct === 100
          const locked = gating[phase.id]?.locked
          const status = phaseStatus(startDate, phase)
          const { start, end } = phaseDates(startDate, phase.id)
          return (
            <Card key={phase.id} className={complete ? 'border-emerald-500/30' : locked ? 'opacity-80' : ''}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold ${
                    complete ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-emerald-300'
                  }`}>
                    {complete ? <Flag className="h-5 w-5" /> : idx + 1}
                  </div>
                  <div>
                    <h2 className="flex items-center gap-2 font-semibold text-slate-100">
                      {phase.title}
                      {locked && !complete && (
                        <span title="Finish 60% of the previous phase to unlock">
                          <Lock className="h-3.5 w-3.5 text-slate-500" />
                        </span>
                      )}
                    </h2>
                    <span className="text-xs text-slate-500">
                      {phase.window}
                      {startDate && <> · {fmtDate(start)} – {fmtDate(end)}</>}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={status.color}>{status.label}</Badge>
                  <span className="text-xs text-slate-500">{pdone}/{phase.tasks.length}</span>
                </div>
              </div>

              {locked && !complete && (
                <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                  🔒 Soft-gated — recommended once the previous phase is 60%+ done. You can still work ahead.
                </div>
              )}
              <ProgressBar value={ppct} className="mb-4" />

              <ul className="space-y-1.5">
                {phase.tasks.map((t) => (
                  <li
                    key={t.id}
                    className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 transition hover:border-white/15"
                  >
                    <button onClick={() => !readOnly && toggleTask(phase.id, t.id)} disabled={readOnly} aria-pressed={t.done} aria-label={`${t.done ? 'Mark incomplete' : 'Mark complete'}: ${t.text}`} className="shrink-0 text-emerald-400 disabled:opacity-60">
                      {t.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-slate-500" />}
                    </button>
                    <span className={`flex-1 text-sm ${t.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                      {t.text}
                    </span>
                    {t.custom && <Badge color="violet">custom</Badge>}
                    {!readOnly && (
                      <button
                        onClick={() => removeTask(phase.id, t.id)}
                        className="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100 focus-visible:opacity-100"
                        title="Remove task"
                        aria-label={`Remove task: ${t.text}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {!readOnly && (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    addTask(phase.id, drafts[phase.id] || '')
                    setDrafts((d) => ({ ...d, [phase.id]: '' }))
                  }}
                >
                  <TextInput
                    value={drafts[phase.id] || ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [phase.id]: e.target.value }))}
                    placeholder="Add a custom task…"
                  />
                  <Button type="submit" variant="ghost" icon={Plus}>Add</Button>
                </form>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
