import React, { useState } from 'react'
import {
  MapPin, Search, Flame, ThermometerSun, Sprout, ExternalLink, User, Eye, Loader2,
  BookmarkPlus, Check, Mail, Copy, Globe, Map as MapIcon, Linkedin, Target, Building2, Phone,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, Field, TextInput, EmptyState, ProgressBar, Modal, Select } from '../components/ui.jsx'
import { generateLeads, leadsToCSV } from '../engine/leadFinder.js'
import { findRealCompanies, companyLinks } from '../engine/liveFinder.js'
import { generateOutreach } from '../engine/outreach.js'
import { downloadText, slugify, copyToClipboard } from '../engine/exporters.js'
import { BUSINESS_MODELS } from '../engine/blueprintEngine.js'

const PRIORITY_META = {
  Hot: { color: 'rose', icon: Flame },
  Warm: { color: 'amber', icon: ThermometerSun },
  Nurture: { color: 'emerald', icon: Sprout },
}

// Plain-language explanation of each model + who the finder targets for it.
const MODEL_INFO = {
  'b2b-saas': 'Software sold to other businesses on a subscription. Targets offices, IT, finance & logistics firms.',
  ecommerce: 'Selling physical products online. Targets shops, retailers & wholesalers.',
  agency: 'A done-for-you service business (marketing, design, dev). Targets restaurants, shops, salons, gyms & hotels.',
  'micro-saas': 'A small, often one-person software tool. Targets small offices, startups & coworking spaces.',
  consulting: 'High-value expert advice sold to organisations. Targets corporates, finance, logistics & industrial firms.',
  'digital-products': 'Courses, templates & downloads you sell once and resell. Targets schools, colleges, universities & offices.',
  'local-service': 'A service sold to employers — staff transport, cleaning, security, catering, maintenance. Targets large workplaces: offices, factories, warehouses, hospitals, hotels & call centres.',
}

const CONTACT_BY_MODEL = {
  'b2b-saas': 'Head of Operations',
  'micro-saas': 'Founder / Owner',
  ecommerce: 'Buyer / Owner',
  agency: 'Marketing lead / Founder',
  consulting: 'Owner / General Manager',
  'digital-products': 'Team / L&D lead',
  'local-service': 'Operations / Facilities / HR manager',
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
  const [count, setCount] = useState(24)

  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState(null) // 'live' | 'search'
  const [companies, setCompanies] = useState([])
  const [searchResult, setSearchResult] = useState(null)
  const [liveMeta, setLiveMeta] = useState(null)
  const [liveError, setLiveError] = useState('')

  const buildFallback = () => generateLeads({ city, country, industry, domain, targetModel: model, count: 12 })

  const run = async (e) => {
    e && e.preventDefault()
    if (!city.trim() && !country.trim()) {
      notify('Enter a city or country first', 'info')
      return
    }
    setLoading(true)
    setMode(null)
    setCompanies([])
    setSearchResult(null)
    setLiveError('')
    try {
      const res = await findRealCompanies({ city, country, industry, model, limit: Number(count) })
      const narrowing = industry.trim() || 'your target market'
      if (res.companies.length > 0 && res.filtered) {
        setCompanies(res.companies)
        setLiveMeta({ location: res.location, lat: res.lat, lon: res.lon, filtered: res.filtered })
        setMode('live')
        notify(`${res.companies.length} matching companies found in ${res.location}`)
      } else if (res.companies.length > 0 && !res.filtered) {
        // Businesses exist nearby, but none match the industry / model fit.
        setLiveError(`No businesses matching ${narrowing} are tagged in OpenStreetMap around ${res.location}, so we won't show unrelated ones.`)
        setSearchResult(buildFallback())
        setMode('search')
        notify('No close matches there — showing ready-to-run searches instead', 'info')
      } else {
        setLiveError(`No businesses are listed in OpenStreetMap for ${res.location} yet.`)
        setSearchResult(buildFallback())
        setMode('search')
        notify('No listings found there — showing ready-to-run searches instead', 'info')
      }
    } catch (err) {
      setLiveError(err && err.message ? err.message : 'The live company directory was unreachable.')
      setSearchResult(buildFallback())
      setMode('search')
      notify('Live lookup unavailable — showing ready-to-run searches instead', 'info')
    } finally {
      setLoading(false)
    }
  }

  const suggestedContact = CONTACT_BY_MODEL[model] || 'Decision-maker'

  const saveCompany = (c) => {
    const links = companyLinks(c, { city, country })
    saveProspect(
      {
        name: c.name,
        sector: c.kind,
        location: c.location || liveMeta?.location,
        city: c.city || city,
        country: c.country || country,
        buyerRole: suggestedContact,
        signal: c.address ? `Based at ${c.address}` : 'Research recent activity before reaching out',
        reason: `Real ${c.kind} in ${c.location || liveMeta?.location} — a potential fit for your offer.`,
        outreach: `Reach the ${suggestedContact} at ${c.name}; reference a specific challenge they likely face and offer a quick, free teardown.`,
        fit: 60 + (c.relevance ? 25 : 0),
        priority: c.relevance ? 'Warm' : 'Nurture',
        website: links.website,
        phone: c.phone,
        address: c.address,
        links,
      },
      bp,
    )
  }

  const exportLive = () => {
    const rows = companies.map((c) => {
      const l = companyLinks(c, { city, country })
      return { name: c.name, sector: c.kind, location: c.location || liveMeta?.location, buyerRole: suggestedContact, priority: c.relevance ? 'Warm' : 'Nurture', fit: '', lookFor: c.address, outreach: '', links: { google: l.website, maps: l.maps, linkedin: l.search } }
    })
    downloadText(`${slugify(liveMeta?.location || 'companies')}-companies.csv`, leadsToCSV(rows, { title: `Aspir by WTS — Companies in ${liveMeta?.location}` }), 'text/csv')
    notify('Company list exported as CSV')
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      <div>
        <Badge color="emerald" className="mb-2"><MapPin className="h-3 w-3" /> Client & Company Finder</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Find real companies to pursue</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Enter a location and industry. Aspir pulls <span className="text-emerald-300">real, named local businesses</span>{' '}
          live from OpenStreetMap — with addresses and websites where available.
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
            <Field label="Industry / sector" hint="helps rank results">
              <TextInput value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="logistics, retail, IT" />
            </Field>
            <Field label="Your domain / specialty">
              <TextInput value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="supply chain, marketing" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <Field label="Your business model" hint="filters to your ideal customers & sets who to contact">
              <Select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                options={BUSINESS_MODELS.map((m) => ({ value: m.id, label: m.label }))}
              />
              {MODEL_INFO[model] && (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{MODEL_INFO[model]}</p>
              )}
            </Field>
            <Field label="Max results" hint={`${count}`}>
              <input type="range" min={6} max={40} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full" />
            </Field>
            <Button type="submit" icon={loading ? undefined : Search} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</> : 'Find companies'}
            </Button>
          </div>
        </form>
        {bp && (
          <p className="mt-3 text-xs text-slate-500">
            Pre-filled from your active blueprint <span className="text-emerald-300">{bp.concept.productName}</span>. Adjust any field above.
          </p>
        )}
      </Card>

      {!mode && !loading && (
        <EmptyState icon={Building2} title="Find real companies">
          Enter a city or country and hit <span className="font-semibold text-emerald-300">Find companies</span>. You'll
          get real local businesses by name (via OpenStreetMap), each with a contact suggestion, outreach template, and
          working links — or ready-to-run searches if the live directory can't be reached.
        </EmptyState>
      )}

      {/* LIVE: real companies */}
      {mode === 'live' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-300">
              <span className="font-semibold text-slate-100">{companies.length} real companies</span> in {liveMeta?.location}
              <span className="ml-2 text-xs text-slate-500">· live from OpenStreetMap</span>
            </div>
            <Button variant="ghost" icon={ExternalLink} onClick={exportLive}>Export CSV</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {companies.map((c, i) => {
              const links = companyLinks(c, { city, country })
              const saved = isProspectSaved({ name: c.name }, bp)
              return (
                <Card key={`${c.name}-${i}`} glow>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-emerald-300">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-100">{c.name}</h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span className="capitalize">{c.kind}</span>
                          {c.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.address}</span>}
                        </div>
                      </div>
                    </div>
                    {c.relevance > 0 && <Badge color="emerald">match</Badge>}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <LinkBtn href={links.website} icon={Globe} label={c.website ? 'Website' : 'Find online'} small />
                    <LinkBtn href={links.maps} icon={MapIcon} label="Map" small />
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10">
                        <Phone className="h-3.5 w-3.5" /> {c.phone}
                      </a>
                    )}
                  </div>

                  <div className="mt-3 flex items-start gap-2 text-sm">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                    <span className="text-slate-300"><span className="text-slate-500">Try contacting:</span> {suggestedContact}</span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {saved ? (
                      <Button variant="subtle" icon={Check} className="flex-1" disabled>In pipeline</Button>
                    ) : (
                      <Button variant="ghost" icon={BookmarkPlus} className="flex-1" onClick={() => saveCompany(c)}>Save</Button>
                    )}
                    <Button variant="ghost" icon={Mail} onClick={() => setOutreachLead({ ...c, buyerRole: suggestedContact })}>Outreach</Button>
                  </div>
                </Card>
              )
            })}
          </div>
          <p className="text-xs text-slate-500">
            Data © OpenStreetMap contributors. Coverage varies by area — not every business is listed. Use the Export or a
            segment search below to widen your net.
          </p>
        </>
      )}

      {/* FALLBACK: ready-to-run searches */}
      {mode === 'search' && searchResult && <SearchLaunchpad result={searchResult} reason={liveError} notify={notify} bp={bp} saveProspect={saveProspect} isProspectSaved={isProspectSaved} setOutreachLead={setOutreachLead} />}

      <OutreachModal lead={outreachLead} blueprint={bp} onClose={() => setOutreachLead(null)} notify={notify} />
    </div>
  )
}

function SearchLaunchpad({ result, reason, notify, bp, saveProspect, isProspectSaved, setOutreachLead }) {
  const targets = result.targets || []
  const saveTarget = (t) =>
    saveProspect({ name: t.title, sector: t.sector, location: t.location, city: t.city, country: t.country, buyerRole: t.buyerRole, signal: t.lookFor, reason: t.reason, outreach: t.outreach, fit: t.fit, priority: t.priority, website: t.links.google, links: t.links }, bp)

  return (
    <>
      <Card className="border-amber-400/20">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500/25 to-violet-500/25 text-amber-300">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100">Ready-to-run searches for {result.location}</div>
            <div className="mb-3 text-xs text-slate-500">
              {reason ? <><span className="text-amber-300">{reason}</span> </> : null}
              Here are working searches that surface real companies.
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkBtn href={result.broad.google} icon={Globe} label="Search Google" />
              <LinkBtn href={result.broad.maps} icon={MapIcon} label="Google Maps" />
              <LinkBtn href={result.broad.linkedin} icon={Linkedin} label="LinkedIn" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {targets.map((t) => {
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
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{t.location}</div>
                  </div>
                </div>
                <Badge color={meta.color}><Icon className="h-3 w-3" />{t.priority}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <LinkBtn href={t.links.google} icon={Globe} label="Google" small />
                <LinkBtn href={t.links.maps} icon={MapIcon} label="Maps" small />
                <LinkBtn href={t.links.linkedin} icon={Linkedin} label="LinkedIn" small />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-start gap-2"><User className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" /><span className="text-slate-300"><span className="text-slate-500">Best contact:</span> {t.buyerRole}</span></div>
                <div className="flex items-start gap-2"><Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><span className="text-slate-300">{t.lookFor}</span></div>
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
  const name = lead.name || lead.title
  const msg = generateOutreach({ prospect: { ...lead, name }, blueprint })
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
    <Modal open={!!lead} onClose={onClose} title={`Outreach — ${name}`} maxWidth="max-w-2xl">
      <p className="mb-4 text-sm text-slate-400">
        Drafted for the <span className="text-violet-300">{lead.buyerRole || 'decision-maker'}</span>. Add a specific
        detail about {name} before sending.
      </p>
      <div className="space-y-3">
        <Block title="Cold email" sub={`Subject: ${msg.emailSubject}`} text={msg.email} />
        <Block title="LinkedIn / DM" text={msg.dm} />
        <Block title="Follow-up" text={msg.followUp} />
      </div>
    </Modal>
  )
}
