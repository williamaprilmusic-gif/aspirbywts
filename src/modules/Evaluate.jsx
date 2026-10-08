import React, { useState } from 'react'
import {
  Stethoscope, Lightbulb, TrendingUp, TrendingDown, Download, Save, RotateCcw, CheckCircle2, AlertTriangle, History, ListPlus, Check, Printer,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, ProgressBar, ScoreRing } from '../components/ui.jsx'
import {
  EVAL_DIMENSIONS, scoreEvaluation, recommendations, evaluationToMarkdown,
} from '../engine/evaluation.js'
import { downloadText } from '../engine/exporters.js'

const SEV_COLOR = { High: 'rose', Medium: 'amber' }
const RATING_LABELS = ['', 'Poor', 'Weak', 'Okay', 'Good', 'Excellent']

export default function Evaluate() {
  const { evaluation, setEvalAnswer, resetEvaluation, evalSnapshots, saveEvalSnapshot, activeBlueprint, addTask, setTab, notify, printAs } = useApp()
  const [added, setAdded] = useState({})

  const res = scoreEvaluation(evaluation)
  const recs = recommendations(evaluation, 8)

  // Push an improvement idea into the active blueprint's roadmap (Phase 1)
  const sendToRoadmap = (rec, idx) => {
    if (!activeBlueprint) {
      notify('Open or generate a blueprint first to add roadmap tasks', 'info')
      return
    }
    const firstPhase = activeBlueprint.roadmap[0]?.id || 'p1'
    addTask(firstPhase, `[${rec.dimensionLabel}] ${rec.fix}`)
    setAdded((a) => ({ ...a, [idx]: true }))
    notify('Added to roadmap (Phase 1)')
  }

  const exportMd = () => {
    downloadText('business-evaluation.md', evaluationToMarkdown(evaluation, { name: activeBlueprint?.concept?.productName }))
    notify('Evaluation exported as Markdown')
  }

  // Trend sparkline points
  const trend = evalSnapshots.map((s) => s.overall)
  const trendMax = Math.max(100, ...trend)

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge color="emerald" className="mb-2"><Stethoscope className="h-3 w-3" /> Business Health Check</Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Business Evaluation</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Rate your business honestly across 8 dimensions. See where you're strong, where you're leaking value, and
            get prioritized ideas to fix it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={Save} onClick={() => saveEvalSnapshot(res.overall)}>Save snapshot</Button>
          <Button variant="ghost" icon={Printer} onClick={() => printAs('evaluation')}>Print</Button>
          <Button variant="ghost" icon={Download} onClick={exportMd}>Export</Button>
          <Button variant="subtle" icon={RotateCcw} onClick={() => { if (confirm('Reset all evaluation ratings?')) resetEvaluation() }}>Reset</Button>
        </div>
      </div>

      {/* Overall + dimension scores */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card strong className="flex flex-col items-center justify-center text-center">
          <ScoreRing score={res.overall} />
          <div className="mt-2 text-xs uppercase tracking-widest text-slate-400">Overall health</div>
          <Badge color={res.overallBand.color} className="mt-1">{res.overallBand.label}</Badge>
          {trend.length > 1 && (
            <div className="mt-4 w-full">
              <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><History className="h-3 w-3" /> Trend</span>
                <span>{trend[0]}% → {trend[trend.length - 1]}%</span>
              </div>
              <div className="flex h-10 items-end gap-0.5">
                {trend.map((v, i) => (
                  <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/50 to-violet-500/70" style={{ height: `${Math.max(6, (v / trendMax) * 100)}%` }} title={`${v}%`} />
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-100">Scores by dimension</h2>
          <div className="space-y-2.5">
            {res.dimensions.map((d) => (
              <div key={d.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-300">{d.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{d.score}%</span>
                    <Badge color={d.band.color}>{d.band.label}</Badge>
                  </span>
                </div>
                <ProgressBar value={d.score} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Strengths / weaknesses */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-slate-100">Where you're doing well</h2>
          </div>
          {res.strengths.length ? (
            <ul className="space-y-2">
              {res.strengths.map((d) => (
                <li key={d.key} className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-slate-200"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{d.label}</span>
                  <span className="text-sm font-semibold text-emerald-300">{d.score}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No dimension is in the "Strong" zone yet — focus on the fixes below to get there.</p>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-rose-400" />
            <h2 className="font-semibold text-slate-100">Where you're losing ground</h2>
          </div>
          {res.weaknesses.length ? (
            <ul className="space-y-2">
              {res.weaknesses.map((d) => (
                <li key={d.key} className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-slate-200"><AlertTriangle className="h-4 w-4 text-rose-400" />{d.label}</span>
                  <span className="text-sm font-semibold text-rose-300">{d.score}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Nothing in the danger zone — solid across the board. Keep pushing the lowest scores up.</p>
          )}
        </Card>
      </div>

      {/* Recommendations */}
      <Card strong>
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-violet-400" />
          <h2 className="font-semibold text-slate-100">How to improve — prioritized ideas</h2>
        </div>
        {recs.length ? (
          <div className="space-y-3">
            {recs.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-xs font-bold text-emerald-300">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge color={SEV_COLOR[r.severity]}>{r.severity} priority</Badge>
                    <span className="text-xs text-slate-500">{r.dimensionLabel}</span>
                  </div>
                  <div className="text-sm text-slate-300">{r.fix}</div>
                </div>
                <div className="shrink-0">
                  {added[i] ? (
                    <Button variant="subtle" icon={Check} disabled>Added</Button>
                  ) : (
                    <Button variant="ghost" icon={ListPlus} onClick={() => sendToRoadmap(r, i)}>To roadmap</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
            🎉 Every area is rated Good or Excellent. Save a snapshot to track that you hold the line.
          </div>
        )}
      </Card>

      {/* Questionnaire */}
      <Card>
        <h2 className="mb-1 font-semibold text-slate-100">The assessment</h2>
        <p className="mb-5 text-sm text-slate-400">Drag each slider from 1 (poor) to 5 (excellent). Scores update live above.</p>
        <div className="grid gap-6 md:grid-cols-2">
          {EVAL_DIMENSIONS.map((d) => {
            const dScore = res.dimensions.find((x) => x.key === d.key)
            return (
              <div key={d.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">{d.label}</h3>
                  <Badge color={dScore.band.color}>{dScore.score}%</Badge>
                </div>
                <div className="space-y-4">
                  {d.questions.map((q) => {
                    const val = evaluation[q.id] ?? 3
                    return (
                      <div key={q.id}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-300">{q.text}</span>
                          <span className="shrink-0 text-xs font-medium text-emerald-300">{RATING_LABELS[val]}</span>
                        </div>
                        <input
                          type="range" min={1} max={5} step={1} value={val}
                          onChange={(e) => setEvalAnswer(q.id, Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
