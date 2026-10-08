import React, { useState } from 'react'
import {
  BrainCircuit, Save, Download, FileText, Target, Shield, TrendingUp, Megaphone,
  Rocket, Zap, AlertTriangle, Lightbulb, Gem, ArrowRight, Swords, Printer, Share2, Crosshair, Wand2, Copy,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, ScoreRing, EmptyState, Stat, Modal } from '../components/ui.jsx'
import { money } from '../engine/blueprintEngine.js'
import { blueprintToMarkdown, downloadText, slugify, copyToClipboard } from '../engine/exporters.js'
import { generateCompetitors } from '../engine/competitors.js'
import { generatePromptPack, promptPackToMarkdown } from '../engine/prompts.js'
import { buildShareUrl } from '../engine/share.js'

const EXEC_TABS = [
  { id: 'summary', label: 'Executive Summary', icon: FileText },
  { id: 'value', label: 'Value & Offer', icon: Target },
  { id: 'gtm', label: 'Go-To-Market', icon: Megaphone },
  { id: 'economics', label: 'Unit Economics', icon: TrendingUp },
]

export default function Blueprint() {
  const { activeBlueprint: bp, saveActive, setTab, notify, readOnly } = useApp()
  const [exec, setExec] = useState('summary')
  const [showPrompts, setShowPrompts] = useState(false)

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
  const printPdf = () => {
    notify('Opening print dialog — choose "Save as PDF"', 'info')
    setTimeout(() => window.print(), 250)
  }
  const shareLink = async () => {
    const ok = await copyToClipboard(buildShareUrl(bp))
    notify(ok ? 'Read-only share link copied' : 'Could not copy link', ok ? 'success' : 'info')
  }
  const competitors = generateCompetitors(bp)

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
              {!readOnly && <Button icon={Save} onClick={saveActive}>Save Enterprise</Button>}
              <Button variant="ghost" icon={Printer} onClick={printPdf}>Export PDF</Button>
              <Button variant="ghost" icon={Download} onClick={exportMd}>Markdown</Button>
              {!readOnly && <Button variant="ghost" icon={Share2} onClick={shareLink}>Share link</Button>}
              <Button variant="ghost" icon={Wand2} onClick={() => setShowPrompts(true)}>AI prompts</Button>
              <Button variant="ghost" icon={Rocket} onClick={() => setTab('roadmap')}>Roadmap</Button>
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

      <PromptPackModal bp={bp} open={showPrompts} onClose={() => setShowPrompts(false)} notify={notify} />

      {/* Competitive landscape */}
      {competitors && <CompetitorSnapshot data={competitors} />}

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

function PromptPackModal({ bp, open, onClose, notify }) {
  if (!open) return null
  const pack = generatePromptPack(bp)
  const copy = async (text, title) => {
    const ok = await copyToClipboard(text)
    notify(ok ? `${title} prompt copied` : 'Copy failed', ok ? 'success' : 'info')
  }
  const downloadAll = () => {
    downloadText(`${slugify(bp.concept.productName)}-ai-prompts.md`, promptPackToMarkdown(bp))
    notify('Prompt pack downloaded')
  }
  return (
    <Modal open={open} onClose={onClose} title="AI Prompt Pack" maxWidth="max-w-2xl">
      <p className="mb-4 text-sm text-slate-400">
        Ready-to-paste prompts, pre-filled with your blueprint. Drop any one into your favourite AI assistant to generate
        the real asset.
      </p>
      <div className="mb-4">
        <Button variant="ghost" icon={Copy} onClick={downloadAll}>Download all as Markdown</Button>
      </div>
      <div className="space-y-3">
        {pack.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">{p.title}</span>
              <button onClick={() => copy(p.prompt, p.title)} className="flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200">
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-400">{p.prompt}</pre>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function CompetitorSnapshot({ data }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Swords className="h-5 w-5 text-violet-400" />
        <h2 className="font-semibold text-slate-100">Competitive Landscape</h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Positioning map */}
        <div className="lg:col-span-2">
          <div className="relative aspect-square w-full rounded-2xl border border-white/10 bg-white/5 p-3">
            {/* axes labels */}
            <span className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[10px] text-slate-500">High price</span>
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">Low price</span>
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-slate-500">Generic</span>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 rotate-90 text-[10px] text-slate-500">Niche-deep</span>
            <div className="absolute inset-8 rounded-xl border border-dashed border-white/10" />
            {data.competitors.map((c, i) => (
              <div
                key={i}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${12 + c.focus * 76}%`, top: `${12 + (1 - c.price) * 76}%` }}
                title={c.type}
              >
                <span className={`h-3 w-3 rounded-full ${c.isYou ? 'bg-emerald-400 shadow-glow ring-2 ring-emerald-300' : 'bg-violet-400/70'}`} />
                <span className={`mt-1 max-w-[80px] text-center text-[9px] leading-tight ${c.isYou ? 'font-semibold text-emerald-300' : 'text-slate-400'}`}>
                  {c.isYou ? 'You' : c.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Competitors + gaps */}
        <div className="space-y-3 lg:col-span-3">
          {data.competitors.filter((c) => !c.isYou).map((c, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div className="font-medium text-slate-200">{c.type}</div>
              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                <span className="text-emerald-300">+ {c.strength}</span>
                <span className="text-rose-300">− {c.weakness}</span>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
              <Crosshair className="h-4 w-4" /> Your wedge
            </div>
            <ul className="space-y-1 text-sm text-slate-300">
              {data.wedges.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
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
