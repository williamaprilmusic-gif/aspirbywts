import React, { useEffect, useRef, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { prefersReducedMotion } from '../utils/format.js'

export function Card({ className = '', strong = false, children, glow = false }) {
  return (
    <div
      className={`${strong ? 'glass-strong' : 'glass'} card-hover p-5 sm:p-6 ${
        glow ? 'hover:border-emerald-400/30 hover:shadow-glow' : 'hover:border-white/20'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function Badge({ children, color = 'emerald', className = '' }) {
  const map = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[color]} ${className}`}
    >
      {children}
    </span>
  )
}

export function Button({ children, variant = 'primary', className = '', icon: Icon, ...props }) {
  const base =
    'group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-400/50'
  const variants = {
    primary:
      'bg-gradient-to-r from-emerald-500 to-violet-500 text-white shadow-glow hover:brightness-110 hover:shadow-glow-violet hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98]',
    ghost: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-white/25 hover:-translate-y-0.5 active:translate-y-0',
    subtle: 'bg-white/5 text-slate-300 hover:bg-white/10',
    danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {variant === 'primary' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
        />
      )}
      {Icon && <Icon className="relative h-4 w-4" />}
      {children && <span className="relative">{children}</span>}
    </button>
  )
}

export function ProgressBar({ value, max = 100, className = '', gradient = true, label }) {
  const pct = Math.min(100, Math.round((value / max) * 100)) || 0
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          gradient ? 'bg-gradient-to-r from-emerald-400 to-violet-400' : 'bg-emerald-400'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-300">
        <span>{label}</span>
        {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

const inputBase =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20'

export function TextInput(props) {
  return <input {...props} className={`${inputBase} ${props.className || ''}`} />
}

export function TextArea(props) {
  return <textarea {...props} className={`${inputBase} min-h-[96px] resize-y ${props.className || ''}`} />
}

export function Select({ options = [], ...props }) {
  return (
    <select {...props} className={`${inputBase} appearance-none ${props.className || ''}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-slate-900">
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Stat({ label, value, sub, color = 'emerald', icon: Icon, info }) {
  const ring = {
    emerald: 'from-emerald-500/20 text-emerald-300',
    violet: 'from-violet-500/20 text-violet-300',
    amber: 'from-amber-500/20 text-amber-300',
    rose: 'from-rose-500/20 text-rose-300',
  }
  return (
    <div className="glass p-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${ring[color]} to-transparent`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
            {label}
            {info && (
              <Tooltip text={info}>
                <HelpCircle className="h-3 w-3" />
              </Tooltip>
            )}
          </div>
          <div className="text-xl font-bold text-slate-100">{value}</div>
          {sub && <div className="text-xs text-slate-500">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-emerald-300">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      <p className="max-w-md text-sm text-slate-400">{children}</p>
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass-strong relative w-full ${maxWidth} max-h-[85vh] overflow-y-auto animate-fade-up p-5 sm:p-6`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200">
            <span className="text-xl leading-none" aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Animated count-up hook (respects reduced-motion)
export function useCountUp(target = 0, duration = 900) {
  const [val, setVal] = useState(() => (prefersReducedMotion() ? target : 0))
  const raf = useRef(null)
  useEffect(() => {
    if (prefersReducedMotion()) {
      setVal(target)
      return
    }
    const start = performance.now()
    const from = 0
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(from + (target - from) * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => raf.current && cancelAnimationFrame(raf.current)
  }, [target, duration])
  return val
}

// Lightweight tooltip — hover on desktop, tap on touch
export function Tooltip({ text, children, className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault()
          setOpen((v) => !v)
        }}
        className="inline-flex cursor-help items-center text-slate-500 hover:text-slate-300 focus:outline-none"
      >
        {children}
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 mb-1.5 w-52 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900/95 px-2.5 py-1.5 text-xs font-normal leading-snug text-slate-300 shadow-glow backdrop-blur-xl">
          {text}
        </span>
      )}
    </span>
  )
}

// Circular score gauge (animated count-up)
export function ScoreRing({ score = 0, size = 132 }) {
  const stroke = 11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const shown = useCountUp(score)
  const offset = c - (shown / 100) * c
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#8b5cf6' : '#f59e0b'
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score ${score} percent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-extrabold text-slate-100">{shown}%</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-400">Fit</span>
      </div>
    </div>
  )
}
