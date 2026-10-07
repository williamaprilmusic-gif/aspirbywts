import React from 'react'
import { useApp } from './context/AppContext.jsx'
import Header from './components/Header.jsx'
import Toast from './components/Toast.jsx'
import Intake from './modules/Intake.jsx'
import Blueprint from './modules/Blueprint.jsx'
import Roadmap from './modules/Roadmap.jsx'
import Financials from './modules/Financials.jsx'
import Saved from './modules/Saved.jsx'

export default function App() {
  const { tab } = useApp()

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {tab === 'intake' && <Intake />}
        {tab === 'blueprint' && <Blueprint />}
        {tab === 'roadmap' && <Roadmap />}
        {tab === 'financials' && <Financials />}
        {tab === 'saved' && <Saved />}
      </main>
      <footer className="no-print border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <span className="font-semibold text-slate-400">Aspir</span> by WTS — Experience-to-Enterprise Blueprint Engine ·
        your data stays in your browser.
      </footer>
      <Toast />
    </div>
  )
}
