import React, { useState } from 'react'
import { Map, Plus, Trash2, Download, FileJson, FileText, CheckCircle2, Circle, Flag } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, ProgressBar, EmptyState, TextInput } from '../components/ui.jsx'
import { roadmapToMarkdown, downloadText, downloadJSON, slugify } from '../engine/exporters.js'

export default function Roadmap() {
  const { activeBlueprint: bp, toggleTask, addTask, removeTask, setTab, notify } = useApp()
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
      </Card>

      <div className="space-y-5">
        {bp.roadmap.map((phase, idx) => {
          const pdone = phase.tasks.filter((t) => t.done).length
          const ppct = phase.tasks.length ? Math.round((pdone / phase.tasks.length) * 100) : 0
          const complete = ppct === 100
          return (
            <Card key={phase.id} className={complete ? 'border-emerald-500/30' : ''}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold ${
                    complete ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-emerald-300'
                  }`}>
                    {complete ? <Flag className="h-5 w-5" /> : idx + 1}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-100">{phase.title}</h2>
                    <span className="text-xs text-slate-500">{phase.window}</span>
                  </div>
                </div>
                <Badge color={complete ? 'emerald' : 'slate'}>{pdone}/{phase.tasks.length}</Badge>
              </div>
              <ProgressBar value={ppct} className="mb-4" />

              <ul className="space-y-1.5">
                {phase.tasks.map((t) => (
                  <li
                    key={t.id}
                    className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 transition hover:border-white/15"
                  >
                    <button onClick={() => toggleTask(phase.id, t.id)} className="shrink-0 text-emerald-400">
                      {t.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-slate-500" />}
                    </button>
                    <span className={`flex-1 text-sm ${t.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                      {t.text}
                    </span>
                    {t.custom && <Badge color="violet">custom</Badge>}
                    <button
                      onClick={() => removeTask(phase.id, t.id)}
                      className="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                      title="Remove task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

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
            </Card>
          )
        })}
      </div>
    </div>
  )
}
