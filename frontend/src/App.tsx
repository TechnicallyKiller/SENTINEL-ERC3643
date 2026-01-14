import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import CustomerPage from "./CustomerPage"
import OwnerPage from "./OwnerPage"
import AdminPage from "./Admin"
import { Shield, Building2 } from "lucide-react"

// Simple Landing Page Component
function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-bold mb-4 tracking-tighter">Sentinel<span className="text-blue-500">Protocol</span></h1>
        <p className="text-slate-400">Decentralized Compliance & Safety Operating System</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Customer Door */}
        <Link to="/report" className="group">
          <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500 transition-all text-center h-full">
            <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-500/20">
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">I am a Customer</h2>
            <p className="text-slate-400">Report a safety violation securely. Your identity is protected by ZK-SNARKs.</p>
          </div>
        </Link>

        {/* Owner Door */}
        <Link to="/dashboard" className="group">
          <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-green-500 transition-all text-center h-full">
            <div className="bg-green-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-500/20">
              <Building2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">I am a Franchise Owner</h2>
            <p className="text-slate-400">Manage operating licenses, view sensor data, and monitor compliance strikes.</p>
          </div>
        </Link>
      </div>
    </div>
  )
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