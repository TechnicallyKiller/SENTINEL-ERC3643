import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ShieldCheck, Building2, Gavel, Github, Globe, Zap, LogOut } from 'lucide-react'; 
import CustomerPage from "./CustomerPage";
import OwnerPage from "./OwnerPage";
import AdminPage from "./Admin";
import ThreatMap from "./components/ThreatMap";
import TextEffect from "./components/TextEffect"; 
import "./configs/reown"; 
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';

function LandingPage() {
  // 2. Use Reown Hooks for reactive state
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden font-sans selection:bg-red-500/30">

      {/* 1. BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950" />
        <ThreatMap /> 
      </div>

      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />

      {/* --- HEADER --- */}
      <div className="relative z-50 w-full px-8 py-6 flex justify-between items-center">
        {/* Left: System Status */}
        <div className="hidden md:flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 animate-pulse'}`} />
           <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
             {isConnected ? 'UPLINK ESTABLISHED' : 'WAITING FOR CONNECTION...'}
           </span>
        </div>

        {/* Right: REOWN SMART CONNECT BUTTON */}
        <div className="flex items-center gap-4">
          {/* Custom Styled Trigger for Reown Modal */}
          <button 
            onClick={() => open()}
            className={`
              group relative px-6 py-2 rounded-none border font-mono text-xs tracking-widest uppercase transition-all duration-300
              ${isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-red-500/10 hover:border-red-500 hover:text-red-500' 
                : 'bg-slate-900/80 border-slate-700 hover:bg-red-500 hover:border-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]'
              }
            `}
          >
            {isConnected ? (
              <>
                <div className="flex items-center gap-2 group-hover:hidden">
                  <Zap className="w-3 h-3" />
                  <span>{address?.slice(0,6)}...{address?.slice(-4)}</span>
                </div>
                <div className="hidden group-hover:flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                  <LogOut className="w-3 h-3" />
                  <span>TERMINATE UPLINK</span>
                </div>
              </>
            ) : (
               <div className="flex items-center gap-2">
                 <span className="group-hover:animate-pulse">INITIALIZE_UPLINK</span>
               </div>
            )}
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center p-4 -mt-20">

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
          <Link 
            to="/report" 
            onClick={(e) => !isConnected && e.preventDefault()}
            className={`hud-card group relative bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-xl overflow-hidden hover:border-red-500 transition-colors duration-300 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
          >
            {!isConnected && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs text-red-500">⚠ AUTH REQUIRED</div>}
            
            {isConnected && <div className="absolute top-4 right-4 text-[10px] font-mono text-red-500 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300 flex items-center gap-1"><span>●</span> ACCESS_GRANT</div>}
            
            <ShieldCheck className="w-12 h-12 text-slate-700 group-hover:text-red-500 transition-colors duration-300 mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform duration-300">Reporter</h3>
            <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors">Submit anonymous ZK-proof reports.</p>
          </Link>

          {/* OWNER */}
          <Link 
            to="/dashboard" 
            onClick={(e) => !isConnected && e.preventDefault()}
            className={`hud-card group relative bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-xl overflow-hidden hover:border-blue-500 transition-colors duration-300 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
          >
            {!isConnected && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs text-blue-500">⚠ AUTH REQUIRED</div>}
            
            {isConnected && <div className="absolute top-4 right-4 text-[10px] font-mono text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300 flex items-center gap-1"><span>●</span> ACCESS_GRANT</div>}
            
            <Building2 className="w-12 h-12 text-slate-700 group-hover:text-blue-500 transition-colors duration-300 mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform duration-300">Franchise Owner</h3>
            <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors">Manage node & simulate telemetry.</p>
          </Link>

          {/* ADMIN */}
          <Link 
            to="/admin" 
            onClick={(e) => !isConnected && e.preventDefault()}
            className={`hud-card group relative bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-xl overflow-hidden hover:border-purple-500 transition-colors duration-300 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
          >
            {!isConnected && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs text-purple-500">⚠ AUTH REQUIRED</div>}
            
            {isConnected && <div className="absolute top-4 right-4 text-[10px] font-mono text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300 flex items-center gap-1"><span>●</span> ACCESS_GRANT</div>}
            
            <Gavel className="w-12 h-12 text-slate-700 group-hover:text-purple-500 transition-colors duration-300 mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform duration-300">Auditor</h3>
            <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors">Adjudicate claims & ban nodes.</p>
          </Link>
        </div>
      </div>

      {/* FOOTER */}
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
            <a href="https://github.com/TechnicallyKiller" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors group">
              <Github className="w-4 h-4 group-hover:text-white transition-colors" />
              <span className="hidden sm:inline">SOURCE_CODE</span>
            </a>
            <a href="https://0xdivyanshh.vercel.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-emerald-400 transition-colors group">
              <Globe className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
              <span>ARCHITECT: <span className="text-slate-300 group-hover:text-white font-bold">0xDivyanshh</span></span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

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