import React from 'react'
import { FolderOpen, Download, Trash2, Eye, Clock, CheckCircle2, FileText } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, EmptyState } from '../components/ui.jsx'
import { money } from '../engine/blueprintEngine.js'
import { blueprintToMarkdown, downloadText, slugify } from '../engine/exporters.js'

export default function Saved() {
  const { savedBlueprints, loadBlueprint, deleteBlueprint, setTab, activeBlueprint, notify } = useApp()

  if (!savedBlueprints.length) {
    return (
      <EmptyState icon={FolderOpen} title="No saved enterprises" action={<Button className="mt-2" onClick={() => setTab('intake')}>Build your first</Button>}>
        Generate a blueprint and hit <span className="font-semibold text-emerald-300">Save Enterprise</span>. Saved
        blueprints persist in your browser and can be reloaded or exported anytime.
      </EmptyState>
    )
  }

  const open = (id) => {
    loadBlueprint(id)
    setTab('blueprint')
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-up space-y-5">
      <div>
        <Badge color="violet" className="mb-2"><FolderOpen className="h-3 w-3" /> {savedBlueprints.length} saved</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Saved Enterprises</h1>
        <p className="mt-1 text-sm text-slate-400">Load, compare, or export your generated business iterations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {savedBlueprints.map((bp) => {
          const tasks = bp.roadmap.flatMap((p) => p.tasks)
          const done = tasks.filter((t) => t.done).length
          const isActive = activeBlueprint && activeBlueprint.id === bp.id
          return (
            <Card key={bp.id} glow className={isActive ? 'border-emerald-500/40' : ''}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-100">{bp.concept.productName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge color="emerald">{bp.modelLabel}</Badge>
                    <Badge color="violet">{bp.fitScore}% fit</Badge>
                    {isActive && <Badge color="slate">active</Badge>}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{new Date(bp.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-slate-400">{bp.concept.audience}</p>

              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{done}/{tasks.length} tasks</span>
                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-violet-400" />{money(bp.currency, bp.economics.year1Gross)} Y1</span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="ghost" icon={Eye} onClick={() => open(bp.id)} className="flex-1">Open</Button>
                <Button
                  variant="subtle"
                  icon={Download}
                  onClick={() => {
                    downloadText(`${slugify(bp.concept.productName)}-blueprint.md`, blueprintToMarkdown(bp))
                    notify('Exported')
                  }}
                />
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={() => {
                    if (confirm(`Delete "${bp.concept.productName}"? This cannot be undone.`)) deleteBlueprint(bp.id)
                  }}
                />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
