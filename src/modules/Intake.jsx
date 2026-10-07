import React, { useState } from 'react'
import {
  User, Wallet, Target, History, ChevronLeft, ChevronRight, Sparkles, RotateCcw, Rocket, Check,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Field, TextInput, TextArea, Select, Button, ProgressBar, Badge } from '../components/ui.jsx'
import { BUSINESS_MODELS, CURRENCIES, money } from '../engine/blueprintEngine.js'
import { TECH_FOUNDER_DEMO, CONSULTANT_DEMO } from '../engine/presets.js'

const STEPS = [
  { id: 1, title: 'Foundational Profile', icon: User, hint: 'Who you are' },
  { id: 2, title: 'Assets & Constraints', icon: Wallet, hint: 'What you have' },
  { id: 3, title: 'Aspirations & Drivers', icon: Target, hint: 'Where you aim' },
  { id: 4, title: 'Past Lessons', icon: History, hint: 'What you learned' },
]

export default function Intake() {
  const { intake, updateIntake, resetIntake, setIntake, generate, setTab, notify } = useApp()
  const [step, setStep] = useState(1)

  const set = (k) => (e) => updateIntake({ [k]: e.target.value })
  const setNum = (k) => (e) => updateIntake({ [k]: Number(e.target.value) })

  const loadDemo = (demo, name) => {
    setIntake({ ...demo })
    setStep(1)
    notify(`${name} demo loaded`)
  }

  const handleGenerate = () => {
    generate()
    setTab('blueprint')
    notify('Blueprint synthesized')
  }

  const progress = (step / STEPS.length) * 100

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      {/* Intro */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge color="violet" className="mb-2">
            <Sparkles className="h-3 w-3" /> Experience & Goals Engine
          </Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
            Profile & Aspirations Intake
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Feed the engine your raw story. The more specific you are, the sharper your generated enterprise blueprint.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={Rocket} onClick={() => loadDemo(TECH_FOUNDER_DEMO, 'Tech Founder')}>
            Tech Founder
          </Button>
          <Button variant="ghost" icon={Rocket} onClick={() => loadDemo(CONSULTANT_DEMO, 'Consultant')}>
            Consultant
          </Button>
        </div>
      </div>

      {/* Progress + stepper */}
      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">
            Step {step} of {STEPS.length} — {STEPS[step - 1].title}
          </span>
          <span className="text-sm font-semibold text-emerald-300">{Math.round(progress)}%</span>
        </div>
        <ProgressBar value={progress} className="mb-5" />
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon
            const active = s.id === step
            const done = s.id < step
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition sm:flex-row sm:text-left ${
                  active
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : done
                    ? 'border-violet-500/30 bg-violet-500/5'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    active ? 'bg-emerald-500 text-white' : done ? 'bg-violet-500/80 text-white' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="hidden sm:block">
                  <div className={`text-xs font-semibold ${active ? 'text-emerald-200' : 'text-slate-300'}`}>
                    {s.title}
                  </div>
                  <div className="text-[10px] text-slate-500">{s.hint}</div>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Step content */}
      <Card strong className="mb-6">
        {step === 1 && (
          <div className="grid gap-4">
            <Field label="Professional background" hint="narrative">
              <TextArea
                value={intake.background}
                onChange={set('background')}
                placeholder="e.g. 8 years as a product designer, last 3 leading design at a fintech startup…"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hard skills" hint="comma separated">
                <TextInput value={intake.hardSkills} onChange={set('hardSkills')} placeholder="React, SQL, SEO, copywriting" />
              </Field>
              <Field label="Soft skills" hint="comma separated">
                <TextInput value={intake.softSkills} onChange={set('softSkills')} placeholder="leadership, sales, storytelling" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Domain expertise" hint="where you're credible">
                <TextInput
                  value={intake.domainExpertise}
                  onChange={set('domainExpertise')}
                  placeholder="logistics, healthcare, dev tools"
                />
              </Field>
              <Field label="Previous industries">
                <TextInput value={intake.industries} onChange={set('industries')} placeholder="SaaS, e-commerce, agency" />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Working capital" className="sm:col-span-2">
                <TextInput type="number" min={0} value={intake.capital} onChange={setNum('capital')} placeholder="5000" />
              </Field>
              <Field label="Currency">
                <Select
                  value={intake.currency}
                  onChange={set('currency')}
                  options={Object.keys(CURRENCIES).map((c) => ({ value: c, label: c }))}
                />
              </Field>
            </div>

            <Field label="Weekly time commitment" hint={`${intake.weeklyHours} hrs / week`}>
              <input
                type="range"
                min={1}
                max={60}
                value={intake.weeklyHours}
                onChange={setNum('weeklyHours')}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                <span>Side-hustle</span>
                <span>Part-time</span>
                <span>Full-time</span>
              </div>
            </Field>

            <Field label="Risk tolerance" hint={`${intake.riskTolerance} / 10`}>
              <input
                type="range"
                min={1}
                max={10}
                value={intake.riskTolerance}
                onChange={setNum('riskTolerance')}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                <span>Conservative</span>
                <span>Balanced</span>
                <span>Aggressive</span>
              </div>
            </Field>

            <Field label="Technical resources available" hint="tools, credits, assets">
              <TextArea
                value={intake.technicalResources}
                onChange={set('technicalResources')}
                placeholder="e.g. own dev environment, cloud credits, existing audience, freelance network…"
              />
            </Field>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
              Starting with <span className="font-semibold text-emerald-300">{money(intake.currency, Number(intake.capital) || 0)}</span>{' '}
              and <span className="font-semibold text-violet-300">{intake.weeklyHours}h/week</span>.
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <Field label="Passions & drivers" hint="what energises you">
              <TextArea
                value={intake.passions}
                onChange={set('passions')}
                placeholder="e.g. removing busywork, helping small businesses, the craft of design…"
              />
            </Field>
            <Field label="Target business model">
              <Select
                value={intake.targetModel}
                onChange={set('targetModel')}
                options={BUSINESS_MODELS.map((m) => ({ value: m.id, label: m.label }))}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => updateIntake({ targetModel: m.id })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    intake.targetModel === m.id
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <Field label="Target exit strategy or lifestyle goal">
              <TextArea
                value={intake.exitGoal}
                onChange={set('exitGoal')}
                placeholder="e.g. a $5M ARR acquisition in 5 years, or a $300k/yr lifestyle business…"
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4">
            <Field label="Past wins to double down on" hint="what worked">
              <TextArea
                value={intake.pastWins}
                onChange={set('pastWins')}
                placeholder="e.g. built an internal tool that saved the team 40% of time…"
              />
            </Field>
            <Field label="Past failures / lessons to avoid" hint="what to dodge">
              <TextArea
                value={intake.pastFailures}
                onChange={set('pastFailures')}
                placeholder="e.g. built features nobody wanted before validating demand…"
              />
            </Field>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-slate-300">
              <p className="font-semibold text-emerald-300">Ready to synthesize.</p>
              <p className="mt-1 text-slate-400">
                The engine will map your skills to market demand, synthesize a viable concept, score founder-market fit,
                and generate a full blueprint + 90-day roadmap.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Nav controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="subtle" icon={ChevronLeft} disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
            Back
          </Button>
          <Button variant="subtle" icon={RotateCcw} onClick={resetIntake}>
            Reset
          </Button>
        </div>
        {step < STEPS.length ? (
          <Button icon={ChevronRight} onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}>
            Continue
          </Button>
        ) : (
          <Button icon={Sparkles} onClick={handleGenerate}>
            Generate Blueprint
          </Button>
        )}
      </div>
    </div>
  )
}
