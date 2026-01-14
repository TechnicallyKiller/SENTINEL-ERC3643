import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import CustomerPage from "./CustomerPage"
import OwnerPage from "./OwnerPage"
import AdminPage from "./Admin"
import { ShieldCheck, Building2, Gavel, Github, Globe } from 'lucide-react'; // Added Icons
import ThreatMap from "./components/ThreatMap"
import TextEffect from "./components/TextEffect"

// Simple Landing Page Component
function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden font-sans selection:bg-red-500/30">

      {/* 1. BACKGROUND VISUALS */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950" />
        <ThreatMap /> {/* The Threat Map we made earlier */}
      </div>

      {/* 2. SCANLINE OVERLAY (Optional, if you added the CSS) */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />

      {/* 3. MAIN CONTENT */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center p-4">

        {/* HEADER */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-500 text-[10px] font-bold tracking-widest uppercase font-mono">
              System Online v2.4.0
            </span>
          </div>

          <TextEffect
            text="SENTINEL PROTOCOL"
            className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-2xl font-mono"
          />

          <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light leading-relaxed">
            The decentralized standard for <span className="text-slate-200 font-medium">staked compliance</span>.
            <br className="hidden md:block" /> Powered by ZK-Snarks and Chainlink Oracles.
          </p>
        </div>

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-4">

          {/* REPORTER */}
          <Link to="/report" className="group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-3xl hover:border-red-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(239,68,68,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
            <ShieldCheck className="w-12 h-12 text-slate-700 group-hover:text-red-500 transition-colors mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">Reporter</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Submit anonymous ZK-proof reports. Stake ETH to earn rewards for valid claims.</p>
          </Link>

          {/* OWNER */}
          <Link to="/dashboard" className="group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-3xl hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
            <Building2 className="w-12 h-12 text-slate-700 group-hover:text-blue-500 transition-colors mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">Franchise Owner</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Manage your node, view strikes, and simulate IoT sensor telemetry.</p>
          </Link>

          {/* ADMIN */}
          <Link to="/admin" className="group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-3xl hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
            <Gavel className="w-12 h-12 text-slate-700 group-hover:text-purple-500 transition-colors mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">Auditor</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Adjudicate claims, issue payouts, and ban non-compliant network nodes.</p>
          </Link>
        </div>

      </div>

      {/* 4. THE "TERMINAL" FOOTER (Credits) */}
      <footer className="relative z-10 w-full border-t border-slate-900/50 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between text-xs font-mono text-slate-500">

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>LATENCY: 12ms</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>ENCRYPTION: AES-256</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* GITHUB LINK */}
            <a
              href="https://github.com/TechnicallyKiller"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors group"
            >
              <Github className="w-4 h-4 group-hover:text-white transition-colors" />
              <span className="hidden sm:inline">SOURCE_CODE</span>
            </a>

            {/* PORTFOLIO LINK */}
            <a
              href="https://0xdivyanshh.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-emerald-400 transition-colors group"
            >
              <Globe className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
              <span>ARCHITECT: <span className="text-slate-300 group-hover:text-white font-bold">0xDivyanshh</span></span>
            </a>
          </div>

        </div>
      </footer>
    </div>
  );
}

// The Router Configuration
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/report" element={<CustomerPage />} />
        <Route path="/dashboard" element={<OwnerPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  )
}