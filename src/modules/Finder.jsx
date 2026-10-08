import React, { useState } from 'react'
import {
  MapPin, Search, Download, Flame, ThermometerSun, Sprout, ExternalLink, User, Eye,
  BookmarkPlus, Check, Mail, Copy, Globe, Map as MapIcon, Linkedin, Target,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, Field, TextInput, EmptyState, ProgressBar, Modal, Select } from '../components/ui.jsx'
import { generateLeads, leadsToCSV } from '../engine/leadFinder.js'
import { generateOutreach } from '../engine/outreach.js'
import { downloadText, slugify, copyToClipboard } from '../engine/exporters.js'
import { BUSINESS_MODELS } from '../engine/blueprintEngine.js'

const PRIORITY_META = {
  Hot: { color: 'rose', icon: Flame },
  Warm: { color: 'amber', icon: ThermometerSun },
  Nurture: { color: 'emerald', icon: Sprout },
}

export default function Finder() {
  const { activeBlueprint: bp, intake, notify, saveProspect, isProspectSaved } = useApp()
  const [outreachLead, setOutreachLead] = useState(null)

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
  const [result, setResult] = useState(null)
  const [searched, setSearched] = useState(false)

  const run = (e) => {
    e && e.preventDefault()
    if (!city.trim() && !country.trim()) {
      notify('Enter a city or country first', 'info')
      return
    }
    const res = generateLeads({ city, country, industry, domain, targetModel: model, count: Number(count) })
    setResult(res)
    setSearched(true)
    notify(`Search targets ready for ${res.location}`)
  }

  const targets = result?.targets || []
  const visible = filter === 'All' ? targets : targets.filter((t) => t.priority === filter)
  const counts = {
    Hot: targets.filter((t) => t.priority === 'Hot').length,
    Warm: targets.filter((t) => t.priority === 'Warm').length,
    Nurture: targets.filter((t) => t.priority === 'Nurture').length,
  }

  const exportCsv = () => {
    downloadText(
      `${slugify(result.location)}-prospect-searches.csv`,
      leadsToCSV(result, { title: `Aspir by WTS — Prospect searches for ${result.location}` }),
      'text/csv',
    )
    notify('Prospect searches exported as CSV')
  }

  // Save a target segment to the pipeline (user fills in the real company found)
  const saveTarget = (t) => {
    saveProspect(
      {
        name: t.title,
        sector: t.sector,
        location: t.location,
        city: t.city,
        country: t.country,
        buyerRole: t.buyerRole,
        signal: t.lookFor,
        reason: t.reason,
        outreach: t.outreach,
        fit: t.fit,
        priority: t.priority,
        website: t.links.google,
        links: t.links,
      },
      bp,
    )
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      <div>
        <Badge color="emerald" className="mb-2"><MapPin className="h-3 w-3" /> Prospecting Launchpad</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Client & Company Finder</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Enter your location and industry and get <span className="text-emerald-300">ready-to-run searches</span> that
          surface <span className="text-emerald-300">real local companies</span> on Google, Maps and LinkedIn — plus who
          to contact and how to approach them.
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
            <Field label="Searches" hint={`${count}`}>
              <input type="range" min={4} max={24} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full" />
            </Field>
            <Button type="submit" icon={Search}>Build searches</Button>
          </div>
        </form>
        {bp && (
          <p className="mt-3 text-xs text-slate-500">
            Pre-filled from your active blueprint <span className="text-emerald-300">{bp.concept.productName}</span>. Adjust any field above.
          </p>
        )}
      </Card>

      {!searched && (
        <EmptyState icon={Search} title="Find real companies to pursue">
          Enter a city or country and hit <span className="font-semibold text-emerald-300">Build searches</span>. You'll
          get working Google, Google Maps and LinkedIn searches that list real local companies — plus the best contact
          and a tailored outreach angle for each segment.
        </EmptyState>
      )}

      {searched && result && (
        <>
          {/* Honest note + broad searches */}
          <Card className="border-emerald-400/20">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-violet-500/25 text-emerald-300">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100">Real companies in {result.location}</div>
                <div className="mb-3 text-xs text-slate-500">
                  Aspir can't list live businesses itself, so it opens real searches instead — every link below finds
                  actual companies you can research and contact.
                </div>
                <div className="flex flex-wrap gap-2">
                  <LinkBtn href={result.broad.google} icon={Globe} label="Search Google" />
                  <LinkBtn href={result.broad.maps} icon={MapIcon} label="Google Maps" />
                  <LinkBtn href={result.broad.linkedin} icon={Linkedin} label="LinkedIn" />
                </div>
              </div>
            </div>
          </Card>

          {/* Filters + export */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {['All', 'Hot', 'Warm', 'Nurture'].map((f) => {
                const active = filter === f
                const n = f === 'All' ? targets.length : counts[f]
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

          {/* Target segment cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((t) => {
              const meta = PRIORITY_META[t.priority]
              const Icon = meta.icon
              const saved = isProspectSaved({ name: t.title }, bp)
              return (
                <Card key={t.id} glow>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-emerald-300">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100">{t.title}</h3>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />{t.location}
                        </div>
                      </div>
                    </div>
                    <Badge color={meta.color}><Icon className="h-3 w-3" />{t.priority}</Badge>
                  </div>

                  {/* Real search links */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <LinkBtn href={t.links.google} icon={Globe} label="Google" small />
                    <LinkBtn href={t.links.maps} icon={MapIcon} label="Maps" small />
                    <LinkBtn href={t.links.linkedin} icon={Linkedin} label="LinkedIn" small />
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                      <span className="text-slate-300"><span className="text-slate-500">Best contact:</span> {t.buyerRole}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span className="text-slate-300">{t.lookFor}</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
                    <span className="font-semibold text-emerald-300">Outreach angle → </span>{t.outreach}
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Relevance to your offer</span>
                      <span className="font-semibold text-emerald-300">{t.fit}%</span>
                    </div>
                    <ProgressBar value={t.fit} />
                  </div>

                  <div className="mt-3 flex gap-2">
                    {saved ? (
                      <Button variant="subtle" icon={Check} className="flex-1" disabled>In pipeline</Button>
                    ) : (
                      <Button variant="ghost" icon={BookmarkPlus} className="flex-1" onClick={() => saveTarget(t)}>Track</Button>
                    )}
                    <Button variant="ghost" icon={Mail} onClick={() => setOutreachLead(t)}>Outreach</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <OutreachModal lead={outreachLead} blueprint={bp} onClose={() => setOutreachLead(null)} notify={notify} />
    </div>
  )
}

function LinkBtn({ href, icon: Icon, label, small = false }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 font-medium text-slate-200 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 ${
        small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      }`}
    >
      <Icon className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {label}
      <ExternalLink className="h-3 w-3 opacity-60" />
    </a>
  )
}

function OutreachModal({ lead, blueprint, onClose, notify }) {
  if (!lead) return null
  const msg = generateOutreach({ prospect: { ...lead, name: lead.title || lead.name }, blueprint })
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
    <Modal open={!!lead} onClose={onClose} title={`Outreach — ${lead.title || lead.name}`} maxWidth="max-w-2xl">
      <p className="mb-4 text-sm text-slate-400">
        A template for the <span className="text-violet-300">{lead.buyerRole}</span> at a company you find in this
        segment. Swap in the real company name and a specific detail before sending.
      </p>
      <div className="space-y-3">
        <Block title="Cold email" sub={`Subject: ${msg.emailSubject}`} text={msg.email} />
        <Block title="LinkedIn / DM" text={msg.dm} />
        <Block title="Follow-up" text={msg.followUp} />
      </div>
    </Modal>
  )
}
