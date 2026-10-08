import React, { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

// Shows an "Install" button when the browser offers the install prompt
// (Chrome/Edge/Android). On iOS Safari there is no prompt API, so we show a
// one-time hint on how to add to the home screen instead.
export default function InstallButton() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches,
  )
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

  const click = async () => {
    if (deferred) {
      deferred.prompt()
      try {
        await deferred.userChoice
      } catch {
        /* ignore */
      }
      setDeferred(null)
    } else if (isIOS) {
      setIosHint((v) => !v)
    }
  }

  // Only render when we can actually do something useful.
  if (!deferred && !isIOS) return null

  return (
    <div className="relative">
      <button
        onClick={click}
        className="hidden items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 sm:inline-flex"
        aria-label="Install Aspir as an app"
      >
        <Download className="h-4 w-4" />
        Install
      </button>
      {/* Compact icon-only variant on very small screens */}
      <button
        onClick={click}
        className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 transition hover:bg-emerald-500/20 sm:hidden"
        aria-label="Install Aspir as an app"
      >
        <Download className="h-4 w-4" />
      </button>

      {iosHint && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-white/10 bg-slate-900/95 p-3 text-xs text-slate-300 shadow-glow backdrop-blur-xl">
          To install on iPhone/iPad: tap the <span className="font-semibold text-slate-100">Share</span> button, then{' '}
          <span className="font-semibold text-slate-100">Add to Home Screen</span>.
        </div>
      )}
    </div>
  )
}
