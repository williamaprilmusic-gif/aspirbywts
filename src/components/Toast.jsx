import React from 'react'
import { CheckCircle2, Info, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

export default function Toast() {
  const { toast, dismissToast } = useApp()
  if (!toast) return null
  const Icon = toast.kind === 'info' ? Info : CheckCircle2
  const color = toast.kind === 'info' ? 'text-violet-300' : 'text-emerald-300'
  return (
    <div className="no-print fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-glow backdrop-blur-xl">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-sm font-medium text-slate-100">{toast.message}</span>
        <button onClick={dismissToast} className="text-slate-500 hover:text-slate-300">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
