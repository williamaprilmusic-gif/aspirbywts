import React, { useRef, useState } from 'react'
import {
  FolderOpen, Download, Trash2, Eye, Clock, CheckCircle2, FileText, DatabaseBackup, Upload, HardDriveDownload,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, EmptyState, Modal } from '../components/ui.jsx'
import { money } from '../engine/blueprintEngine.js'
import { blueprintToMarkdown, downloadText, downloadJSON, slugify } from '../engine/exporters.js'
import { parseBackup, backupSummary } from '../engine/backup.js'
import { timeAgo } from '../utils/format.js'

export default function Saved() {
  const {
    savedBlueprints, loadBlueprint, deleteBlueprint, setTab, activeBlueprint, notify,
    exportWorkspace, importWorkspace, readOnly,
  } = useApp()
  const fileRef = useRef(null)
  const [pending, setPending] = useState(null) // { text, data }

  const open = (id) => {
    loadBlueprint(id)
    setTab('blueprint')
  }

  const doExportAll = () => {
    const ts = new Date().toISOString().slice(0, 10)
    downloadJSON(`aspir-workspace-${ts}.json`, exportWorkspace())
    notify('Workspace backup downloaded')
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = parseBackup(String(reader.result))
      if (!res.ok) {
        notify(res.error, 'info')
      } else {
        setPending({ text: String(reader.result), data: res.data })
      }
    }
    reader.onerror = () => notify('Could not read file', 'info')
    reader.readAsText(file)
    e.target.value = '' // allow re-selecting the same file
  }

  const applyImport = (mode) => {
    if (pending) importWorkspace(pending.text, mode)
    setPending(null)
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-up space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge color="violet" className="mb-2"><FolderOpen className="h-3 w-3" /> {savedBlueprints.length} saved</Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Saved Enterprises</h1>
          <p className="mt-1 text-sm text-slate-400">Load, compare, export, or back up and restore your whole workspace.</p>
        </div>
      </div>

      {/* Backup / restore bar — always available */}
      {!readOnly && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <DatabaseBackup className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="text-sm font-semibold text-slate-200">Workspace backup</div>
                <div className="text-xs text-slate-500">Export everything (blueprints, pipeline, evaluation) to a file, or restore it on any device.</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" icon={HardDriveDownload} onClick={doExportAll}>Export all</Button>
              <Button variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>Import</Button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
            </div>
          </div>
        </Card>
      )}

      {!savedBlueprints.length ? (
        <EmptyState icon={FolderOpen} title="No saved enterprises" action={<Button className="mt-2" onClick={() => setTab('intake')}>Build your first</Button>}>
          Generate a blueprint and hit <span className="font-semibold text-emerald-300">Save Enterprise</span>, or{' '}
          <span className="font-semibold text-emerald-300">Import</span> a backup above to restore a previous workspace.
        </EmptyState>
      ) : (
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
                    <div className="flex items-center justify-end gap-1" title={new Date(bp.updatedAt || bp.createdAt).toLocaleString()}>
                      <Clock className="h-3 w-3" />{timeAgo(bp.updatedAt || bp.createdAt)}
                    </div>
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
                    aria-label={`Export ${bp.concept.productName} as Markdown`}
                    onClick={() => {
                      downloadText(`${slugify(bp.concept.productName)}-blueprint.md`, blueprintToMarkdown(bp))
                      notify('Exported')
                    }}
                  />
                  {!readOnly && (
                    <Button
                      variant="danger"
                      icon={Trash2}
                      aria-label={`Delete ${bp.concept.productName}`}
                      onClick={() => {
                        if (confirm(`Delete "${bp.concept.productName}"? This cannot be undone.`)) deleteBlueprint(bp.id)
                      }}
                    />
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Import confirmation */}
      <Modal open={!!pending} onClose={() => setPending(null)} title="Restore workspace">
        {pending && (
          <>
            <p className="text-sm text-slate-300">
              This backup contains <span className="font-semibold text-emerald-300">{backupSummary(pending.data)}</span>.
              How should it be applied?
            </p>
            <div className="mt-5 grid gap-2">
              <button onClick={() => applyImport('merge')} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left transition hover:bg-emerald-500/20">
                <div className="text-sm font-semibold text-emerald-200">Merge (recommended)</div>
                <div className="text-xs text-slate-400">Add/update from the backup, keep everything you already have.</div>
              </button>
              <button onClick={() => applyImport('replace')} className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-left transition hover:bg-rose-500/20">
                <div className="text-sm font-semibold text-rose-200">Replace</div>
                <div className="text-xs text-slate-400">Wipe current workspace and load only the backup. Can't be undone.</div>
              </button>
              <button onClick={() => setPending(null)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-sm text-slate-300 hover:bg-white/10">
                Cancel
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
