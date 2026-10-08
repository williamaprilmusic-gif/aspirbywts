import React, { useState } from 'react'
import {
  MapPin, Search, Building2, Download, Target, Flame, ThermometerSun, Sprout, ExternalLink, User, TrendingUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, Field, TextInput, EmptyState, ProgressBar } from '../components/ui.jsx'
import { generateLeads, leadsToCSV } from '../engine/leadFinder.js'
import { downloadText, slugify } from '../engine/exporters.js'
import { BUSINESS_MODELS } from '../engine/blueprintEngine.js'
import { Select } from '../components/ui.jsx'

const PRIORITY_META = {
  Hot: { color: 'rose', icon: Flame },
  Warm: { color: 'amber', icon: ThermometerSun },
  Nurture: { color: 'emerald', icon: Sprout },
}

export default function Finder() {
  const { activeBlueprint: bp, intake, notify } = useApp()

  // Seed industry/domain/model from the active blueprint if present, else intake
  const seedIndustry = (bp && bp.intake.industries) || intake.industries || ''
  const seedDomain = (bp && bp.intake.domainExpertise) || intake.domainExpertise || ''
  const seedModel = (bp && bp.intake.targetModel) || intake.targetModel || 'b2b-saas'

  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [industry, setIndustry] = useState(seedIndustry)
  const [domain, setDomain] = useState(seedDomain)
  const [model, setModel] = useState(seedModel)
  const [count, setCount] = useState(12)
  const [filter, setFilter] = useState('All')
  const [leads, setLeads] = useState([])
  const [searched, setSearched] = useState(false)

  const run = (e) => {
    e && e.preventDefault()
    if (!city.trim() && !country.trim()) {
      notify('Enter a city or country first', 'info')
      return
    }
    const result = generateLeads({ city, country, industry, domain, targetModel: model, count: Number(count) })
    setLeads(result)
    setSearched(true)
    notify(`${result.length} prospects found in ${[city, country].filter(Boolean).join(', ')}`)
  }

  const visible = filter === 'All' ? leads : leads.filter((l) => l.priority === filter)

  const exportCsv = () => {
    const loc = [city, country].filter(Boolean).join(', ')
    downloadText(
      `${slugify(loc || 'prospects')}-prospects.csv`,
      leadsToCSV(leads, { title: `Aspir by WTS — Prospects in ${loc}` }),
      'text/csv',
    )
    notify('Prospect list exported as CSV')
  }

  const counts = {
    Hot: leads.filter((l) => l.priority === 'Hot').length,
    Warm: leads.filter((l) => l.priority === 'Warm').length,
    Nurture: leads.filter((l) => l.priority === 'Nurture').length,
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      <div>
        <Badge color="emerald" className="mb-2"><MapPin className="h-3 w-3" /> Pipeline Growth Engine</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Client & Company Finder</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Target prospects by city and country. The engine builds a ranked list of companies and clients that match your
          domain and business model — so you know exactly who to reach out to next.
        </p>
      </div>

      {/* Search form */}
      <Card strong>
        <form onSubmit={run} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" hint="where to prospect">
              <TextInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Cape Town" />
            </Field>
            <Field label="Country">
              <TextInput value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. South Africa" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Industry / sector" hint="comma separated">
              <TextInput value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="logistics, retail, SaaS" />
            </Field>
            <Field label="Your domain / specialty">
              <TextInput value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="supply chain, marketing" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <Field label="Target business model">
              <Select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                options={BUSINESS_MODELS.map((m) => ({ value: m.id, label: m.label }))}
              />
            </Field>
            <Field label="Results" hint={`${count}`}>
              <input type="range" min={6} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full" />
            </Field>
            <Button type="submit" icon={Search}>Find prospects</Button>
          </div>
        </form>
        {bp && (
          <p className="mt-3 text-xs text-slate-500">
            Pre-filled from your active blueprint <span className="text-emerald-300">{bp.concept.productName}</span>. Adjust any field above.
          </p>
        )}
      </Card>

      {!searched && (
        <EmptyState icon={Building2} title="Ready to find clients">
          Enter a city or country and hit <span className="font-semibold text-emerald-300">Find prospects</span>. You'll get a
          ranked list of target companies with the best contact, a buying signal, why they fit, and a tailored outreach angle.
        </EmptyState>
      )}

      {searched && leads.length > 0 && (
        <>
          {/* Summary + filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {['All', 'Hot', 'Warm', 'Nurture'].map((f) => {
                const active = filter === f
                const n = f === 'All' ? leads.length : counts[f]
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {f} <span className="opacity-70">({n})</span>
                  </button>
                )
              })}
            </div>
            <Button variant="ghost" icon={Download} onClick={exportCsv}>Export CSV</Button>
          </div>

          {/* Lead cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((l) => {
              const meta = PRIORITY_META[l.priority]
              const Icon = meta.icon
              return (
                <Card key={l.id} glow>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-emerald-300">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100">{l.name}</h3>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />{l.location}
                        </div>
                      </div>
                    </div>
                    <Badge color={meta.color}><Icon className="h-3 w-3" />{l.priority}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge color="slate">{l.sector}</Badge>
                    <Badge color="slate">{l.size}</Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                      <span className="text-slate-300"><span className="text-slate-500">Best contact:</span> {l.buyerRole}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span className="text-slate-300"><span className="text-slate-500">Signal:</span> {l.signal}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-slate-300">{l.reason}</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
                    <span className="font-semibold text-emerald-300">Outreach angle → </span>{l.outreach}
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-slate-500"><ExternalLink className="h-3 w-3" />{l.website}</span>
                      <span className="font-semibold text-emerald-300">{l.fit}% fit</span>
                    </div>
                    <ProgressBar value={l.fit} />
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
