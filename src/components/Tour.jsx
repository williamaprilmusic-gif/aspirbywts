import React, { useState } from 'react'
import { Sparkles, Inbox, BrainCircuit, MapPin, Workflow, ArrowRight, Check } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Modal, Button } from './ui.jsx'

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to Aspir by WTS',
    body: 'Turn your experience, skills, and goals into a complete, market-validated enterprise blueprint — plus the roadmap and prospects to actually build it.',
  },
  {
    icon: Inbox,
    title: '1 · Intake your story',
    body: 'Walk the 4-step wizard (or load a demo). The more specific you are, the sharper your blueprint. Everything auto-saves in your browser.',
  },
  {
    icon: BrainCircuit,
    title: '2 · Generate your blueprint',
    body: 'Get a founder-market fit score, a synthesized concept, SWOT, competitive map, GTM, and unit economics — then export it as PDF or Markdown, or share a read-only link.',
  },
  {
    icon: MapPin,
    title: '3 · Find clients by city & country',
    body: 'The Finder builds a ranked list of target companies with the best contact, buying signals, and ready-to-send outreach you can save to your pipeline.',
  },
  {
    icon: Workflow,
    title: '4 · Execute & track',
    body: 'Work the 90-day roadmap, move prospects through your pipeline, and watch your founder-readiness score climb on the Dashboard.',
  },
]

export default function Tour() {
  const { tourSeen, markTourSeen, readOnly } = useApp()
  const [i, setI] = useState(0)
  if (tourSeen || readOnly) return null
  const step = STEPS[i]
  const Icon = step.icon
  const last = i === STEPS.length - 1

  return (
    <Modal open onClose={markTourSeen} title="" maxWidth="max-w-md">
      <div className="-mt-10 flex flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-violet-500/30 text-emerald-300">
          <Icon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-100">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>

        <div className="mt-5 flex items-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>

        <div className="mt-6 flex w-full items-center justify-between gap-3">
          <button onClick={markTourSeen} className="text-sm text-slate-500 hover:text-slate-300">Skip</button>
          {last ? (
            <Button icon={Check} onClick={markTourSeen}>Get started</Button>
          ) : (
            <Button icon={ArrowRight} onClick={() => setI((x) => x + 1)}>Next</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
