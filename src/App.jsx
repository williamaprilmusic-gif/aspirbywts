import React from 'react'
import { Eye } from 'lucide-react'
import { useApp } from './context/AppContext.jsx'
import Header from './components/Header.jsx'
import Toast from './components/Toast.jsx'
import Tour from './components/Tour.jsx'
import GuideBar from './components/GuideBar.jsx'
import InstallNudge from './components/InstallNudge.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import PrintArea from './components/PrintArea.jsx'
import Dashboard from './modules/Dashboard.jsx'
import Intake from './modules/Intake.jsx'
import Blueprint from './modules/Blueprint.jsx'
import Roadmap from './modules/Roadmap.jsx'
import Goals from './modules/Goals.jsx'
import Financials from './modules/Financials.jsx'
import Planner from './modules/Planner.jsx'
import Finder from './modules/Finder.jsx'
import Pipeline from './modules/Pipeline.jsx'
import Compare from './modules/Compare.jsx'
import Evaluate from './modules/Evaluate.jsx'
import Saved from './modules/Saved.jsx'

export default function App() {
  const { tab, readOnly, activeBlueprint } = useApp()

  return (
    <div className="min-h-screen">
      <Header />

      {readOnly && (
        <div className="no-print border-b border-violet-500/20 bg-violet-500/10">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs text-violet-200 sm:px-6">
            <Eye className="h-3.5 w-3.5" />
            You're viewing a shared, read-only blueprint. Changes won't be saved. Open the app's home URL to build your own.
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <GuideBar />
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'intake' && <Intake />}
        {tab === 'blueprint' && <Blueprint />}
        {tab === 'roadmap' && <Roadmap />}
        {tab === 'goals' && <Goals />}
        {tab === 'financials' && <Financials />}
        {tab === 'planner' && <Planner />}
        {tab === 'finder' && <Finder />}
        {tab === 'pipeline' && <Pipeline />}
        {tab === 'compare' && <Compare />}
        {tab === 'evaluate' && <Evaluate />}
        {tab === 'saved' && <Saved />}
      </main>

      <footer className="no-print border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <span className="font-semibold text-slate-400">Aspir</span> by WTS — Experience-to-Enterprise Blueprint Engine ·
        your data stays in your browser.
      </footer>

      {/* Hidden on screen; used for PDF / print export */}
      <PrintArea />

      <Tour />
      <CommandPalette />
      <InstallNudge />
      <Toast />
    </div>
  )
}
