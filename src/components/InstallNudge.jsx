import React, { useEffect, useState } from 'react'
import { Download, X, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const LS_KEY = 'aspir.installNudge'

// A one-time, dismissible bottom banner inviting first-time visitors to
// install the app. Appears only when installation is actually possible and
// the user hasn't installed or dismissed it before.
export default function InstallNudge() {
  const { readOnly } = useApp()
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  const dismissed = (() => {
    try {
      return localStorage.getItem(LS_KEY) === '1'
    } catch {
      return false
    }
  })()

  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    if (readOnly || dismissed || standalone) return

    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS has no prompt event — show the hint-style nudge after a short delay.
    let t
    if (isIOS) t = setTimeout(() => setVisible(true), 2500)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      if (t) clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => {
    setVisible(false)
    try {
      localStorage.setItem(LS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const install = async () => {
    if (deferred) {
      deferred.prompt()
      try {
        await deferred.userChoice
      } catch {
        /* ignore */
      }
      setDeferred(null)
      close()
    } else if (isIOS) {
      setIosHint(true)
    }
  }

  if (!visible) return null

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-50 p-3 sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
      <div className="mx-auto flex max-w-md animate-fade-up items-center gap-3 rounded-2xl border border-emerald-400/25 bg-slate-900/95 p-3.5 shadow-glow backdrop-blur-xl">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-violet-500">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-100">Install Aspir</div>
          {iosHint ? (
            <div className="text-xs text-slate-400">
              Tap <span className="font-semibold text-slate-200">Share</span> → <span className="font-semibold text-slate-200">Add to Home Screen</span>.
            </div>
          ) : (
            <div className="text-xs text-slate-400">Add it to your home screen — full screen &amp; works offline.</div>
          )}
        </div>
        {!iosHint && (
          <button
            onClick={install}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Download className="h-4 w-4" /> Install
          </button>
        )}
        <button
          onClick={close}
          aria-label="Dismiss install prompt"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
