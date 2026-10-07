import React, { useState } from 'react'
import {
  BrainCircuit, Save, Download, FileText, Target, Shield, TrendingUp, Megaphone,
  Rocket, Zap, AlertTriangle, Lightbulb, Gem, ArrowRight,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, ScoreRing, EmptyState, Stat } from '../components/ui.jsx'
import { money } from '../engine/blueprintEngine.js'
import { blueprintToMarkdown, downloadText, slugify } from '../engine/exporters.js'

const EXEC_TABS = [
  { id: 'summary', label: 'Executive Summary', icon: FileText },
  { id: 'value', label: 'Value & Offer', icon: Target },
  { id: 'gtm', label: 'Go-To-Market', icon: Megaphone },
  { id: 'economics', label: 'Unit Economics', icon: TrendingUp },
]

export default function Blueprint() {
  const { activeBlueprint: bp, saveActive, setTab, notify } = useApp()
  const [exec, setExec] = useState('summary')

  if (!bp) {
    return (
      <EmptyState
        icon={BrainCircuit}
        title="No blueprint yet"
        action={<Button className="mt-2" icon={ArrowRight} onClick={() => setTab('intake')}>Start intake</Button>}
      >
        Complete the intake wizard and hit <span className="font-semibold text-emerald-300">Generate Blueprint</span> to
        see your market-validated enterprise plan here.
      </EmptyState>
    )
  }

  const m = (v) => money(bp.currency, v)
  const exportMd = () => {
    downloadText(`${slugify(bp.concept.productName)}-blueprint.md`, blueprintToMarkdown(bp))
    notify('Markdown exported')
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      {/* Hero */}
      <Card strong className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge color="emerald">{bp.modelLabel}</Badge>
              <Badge color="violet">Auto-synthesized</Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">{bp.concept.productName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{bp.concept.valueProp}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button icon={Save} onClick={saveActive}>Save Enterprise</Button>
              <Button variant="ghost" icon={Download} onClick={exportMd}>Export Markdown</Button>
              <Button variant="ghost" icon={Rocket} onClick={() => setTab('roadmap')}>View Roadmap</Button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={bp.fitScore} />
            <span className="text-xs text-slate-400">Founder-Market Fit</span>
          </div>
        </div>
      </Card>

      {/* Concept + Moat */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card glow>
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-slate-100">Viable Business Concept</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Target audience</dt>
              <dd className="text-slate-200">{bp.concept.audience}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Core pain solved</dt>
              <dd className="text-slate-200">{bp.concept.corePain}</dd>
            </div>
          </dl>
        </Card>
        <Card glow>
          <div className="mb-3 flex items-center gap-2">
            <Gem className="h-5 w-5 text-violet-400" />
            <h2 className="font-semibold text-slate-100">Competitive Advantage (Moat)</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{bp.moat}</p>
        </Card>
      </div>

      {/* SWOT */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-emerald-400" />
          <h2 className="font-semibold text-slate-100">SWOT Analysis Matrix</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SwotQuadrant title="Strengths" color="emerald" icon={Zap} items={bp.swot.strengths} />
          <SwotQuadrant title="Weaknesses" color="rose" icon={AlertTriangle} items={bp.swot.weaknesses} />
          <SwotQuadrant title="Opportunities" color="violet" icon={Lightbulb} items={bp.swot.opportunities} />
          <SwotQuadrant title="Threats" color="amber" icon={Shield} items={bp.swot.threats} />
        </div>
      </Card>

      {/* Executive tabbed views */}
      <Card strong>
        <div className="mb-5 flex flex-wrap gap-2">
          {EXEC_TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setExec(t.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                  exec === t.id
                    ? 'bg-gradient-to-r from-emerald-500/20 to-violet-500/20 text-white shadow-glow'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {exec === 'summary' && (
          <div className="space-y-5 text-sm">
            <p className="leading-relaxed text-slate-300">{bp.execSummary.elevator}</p>
            <div>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">Primary revenue streams</h3>
              <div className="flex flex-wrap gap-2">
                {bp.execSummary.revenueStreams.map((r, i) => (
                  <Badge key={i} color={i % 2 ? 'violet' : 'emerald'}>{r}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">Core differentiator</h3>
              <p className="leading-relaxed text-slate-300">{bp.execSummary.differentiator}</p>
            </div>
          </div>
        )}

        {exec === 'value' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-500">Primary customer pain solved</span>
              <p className="mt-1 text-slate-200">{bp.concept.corePain}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {bp.economics.priceTiers.map((t, i) => (
                <div
                  key={t.name}
                  className={`rounded-2xl border p-4 ${
                    i === 1 ? 'border-emerald-500/40 bg-emerald-500/5 shadow-glow' : 'border-white/10 bg-white/5'
                  }`}
                >
                  {i === 1 && <Badge color="emerald" className="mb-2">Most popular</Badge>}
                  <div className="text-sm font-semibold text-slate-200">{t.name}</div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-100">
                    {m(t.price)}
                    <span className="text-sm font-normal text-slate-500">{t.cadence}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
                    {t.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {exec === 'gtm' && (
          <div className="space-y-5 text-sm">
            <InfoRow label="Sales motion">{bp.gtm.salesMotion}</InfoRow>
            <InfoRow label="First 100 customers">{bp.gtm.first100}</InfoRow>
            <InfoRow label="Content engine">{bp.gtm.contentEngine}</InfoRow>
            <div>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">Acquisition channels</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {bp.gtm.channels.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/20 text-xs font-bold text-emerald-300">
                      {i + 1}
                    </span>
                    <span className="text-slate-300">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {exec === 'economics' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="CAC" value={m(bp.economics.cac)} icon={Megaphone} color="amber" />
            <Stat label="LTV" value={m(bp.economics.ltv)} icon={TrendingUp} color="emerald" />
            <Stat label="LTV : CAC" value={`${bp.economics.ltvCacRatio}:1`} icon={Zap} color="violet" sub={bp.economics.ltvCacRatio >= 3 ? 'Healthy' : 'Watch'} />
            <Stat label="Break-even" value={`Mo. ${bp.economics.breakeven}`} icon={Target} color="emerald" />
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-violet-500/10 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Projected Year-1 gross revenue</div>
                <div className="text-3xl font-extrabold text-slate-100">{m(bp.economics.year1Gross)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Full projections and the risk matrix live in the Financial & Risk Modeling tab.
                </div>
                <Button variant="ghost" className="mt-3" icon={ArrowRight} onClick={() => setTab('financials')}>
                  Open financial model
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function SwotQuadrant({ title, items, color, icon: Icon }) {
  const ring = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
    rose: 'border-rose-500/30 bg-rose-500/5 text-rose-300',
    violet: 'border-violet-500/30 bg-violet-500/5 text-violet-300',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  }
  return (
    <div className={`rounded-2xl border p-4 ${ring[color]}`}>
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <ul className="space-y-1.5 text-sm text-slate-300">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

function InfoRow({ label, children }) {
  return (
    <div>
      <h3 className="mb-1 text-xs uppercase tracking-wide text-slate-500">{label}</h3>
      <p className="leading-relaxed text-slate-300">{children}</p>
    </div>
  )
}
