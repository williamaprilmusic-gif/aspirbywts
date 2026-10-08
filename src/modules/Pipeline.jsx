import React, { useState } from 'react'
import {
  Workflow, Building2, MapPin, User, Trash2, Mail, Copy, Download, Filter,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, EmptyState, Modal, Select } from '../components/ui.jsx'
import { generateOutreach } from '../engine/outreach.js'
import { leadsToCSV } from '../engine/leadFinder.js'
import { downloadText, copyToClipboard } from '../engine/exporters.js'
import { pipelineFunnel } from '../engine/insights.js'

const STATUS_COLOR = {
  Saved: 'slate',
  Contacted: 'violet',
  Replied: 'amber',
  Won: 'emerald',
  Lost: 'rose',
}
const STATUSES = ['Saved', 'Contacted', 'Replied', 'Won', 'Lost']

export default function Pipeline() {
  const { prospects, updateProspect, removeProspect, savedBlueprints, activeBlueprint, setTab, notify } = useApp()
  const [outreach, setOutreach] = useState(null)
  const [filter, setFilter] = useState('All')

  if (!prospects.length) {
    return (
      <EmptyState icon={Workflow} title="Your pipeline is empty" action={<Button className="mt-2" onClick={() => setTab('finder')}>Find prospects</Button>}>
        Save prospects from the <span className="font-semibold text-emerald-300">Client & Company Finder</span> and track
        them here from Saved → Contacted → Replied → Won/Lost.
      </EmptyState>
    )
  }

  const funnel = pipelineFunnel(prospects)
  const visible = filter === 'All' ? prospects : prospects.filter((p) => p.status === filter)
  const won = funnel.counts.Won
  const conversion = funnel.total ? Math.round((won / funnel.total) * 100) : 0

  const blueprintFor = (id) => savedBlueprints.find((b) => b.id === id) || (activeBlueprint && activeBlueprint.id === id ? activeBlueprint : null)

  const exportCsv = () => {
    downloadText('pipeline-prospects.csv', leadsToCSV(prospects.map((p) => ({ ...p })), { title: 'Aspir by WTS — Pipeline' }), 'text/csv')
    notify('Pipeline exported as CSV')
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge color="violet" className="mb-2"><Workflow className="h-3 w-3" /> Sales Pipeline</Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Prospect Pipeline</h1>
          <p className="mt-1 text-sm text-slate-400">{funnel.total} prospects · {won} won · {conversion}% conversion</p>
        </div>
        <Button variant="ghost" icon={Download} onClick={exportCsv}>Export CSV</Button>
      </div>

      {/* Funnel */}
      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? 'All' : s)}
              className={`rounded-xl border p-3 text-left transition ${
                filter === s ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-2xl font-extrabold text-slate-100">{funnel.counts[s]}</div>
              <Badge color={STATUS_COLOR[s]}>{s}</Badge>
            </button>
          ))}
        </div>
        {filter !== 'All' && (
          <button onClick={() => setFilter('All')} className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
            <Filter className="h-3 w-3" /> Showing {filter} — clear filter
          </button>
        )}
      </Card>

      {/* Prospect rows */}
      <div className="space-y-3">
        {visible.map((p) => (
          <Card key={p.key}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-emerald-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">{p.name}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{p.buyerRole}</span>
                    {p.productName && <span className="text-violet-300">{p.productName}</span>}
                    <span className="text-emerald-300">{p.fit}% fit</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Select
                    value={p.status}
                    onChange={(e) => updateProspect(p.key, { status: e.target.value })}
                    options={STATUSES.map((s) => ({ value: s, label: s }))}
                    className="!py-1.5 pr-8 text-xs"
                  />
                </div>
                <Button variant="ghost" icon={Mail} onClick={() => setOutreach(p)} />
                <Button variant="danger" icon={Trash2} onClick={() => removeProspect(p.key)} />
              </div>
            </div>

            <textarea
              value={p.notes || ''}
              onChange={(e) => updateProspect(p.key, { notes: e.target.value })}
              placeholder="Notes — last touch, next step, who you spoke to…"
              className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-emerald-400/50"
              rows={1}
            />
          </Card>
        ))}
      </div>

      <OutreachModal lead={outreach} blueprint={outreach ? blueprintFor(outreach.blueprintId) : null} onClose={() => setOutreach(null)} notify={notify} />
    </div>
  )
}

function OutreachModal({ lead, blueprint, onClose, notify }) {
  if (!lead) return null
  const msg = generateOutreach({ prospect: lead, blueprint })
  const copy = async (text, label) => {
    const ok = await copyToClipboard(text)
    notify(ok ? `${label} copied` : 'Copy failed', ok ? 'success' : 'info')
  }
  const Block = ({ title, text, sub }) => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</span>
        <button onClick={() => copy(text, title)} className="flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200">
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      {sub && <div className="mb-1 text-xs text-slate-500">{sub}</div>}
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">{text}</pre>
    </div>
  )
  return (
    <Modal open={!!lead} onClose={onClose} title={`Outreach — ${lead.name}`} maxWidth="max-w-2xl">
      <div className="space-y-3">
        <Block title="Cold email" sub={`Subject: ${msg.emailSubject}`} text={msg.email} />
        <Block title="LinkedIn / DM" text={msg.dm} />
        <Block title="Follow-up" text={msg.followUp} />
      </div>
    </Modal>
  )
}
