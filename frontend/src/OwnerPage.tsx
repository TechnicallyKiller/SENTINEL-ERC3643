import { useEffect, useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { SENTINEL_ADDRESSES, SENTINEL_ABIS } from './configs/contracts';
import { SENSOR_SOURCE_CODE } from './configs/sensorScript';
import { supabase } from './configs/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { Building2, Signal, ShieldCheck, Server, Radio } from 'lucide-react';

export default function OwnerPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbRecord, setDbRecord] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          console.log("Wallet Switched:", accounts[0]);
          setAccount(accounts[0]);
          
          // CRITICAL: Reload the page or re-fetch data to update the UI
          // For a portfolio, reloading is the safest way to ensure no stale data remains
          window.location.reload(); 
        } else {
          setAccount(null); // User disconnected
          toast.error("Wallet Disconnected");
        }
      });

      // Listen for chain changes (e.g., wrong network)
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    // Cleanup listener on unmount
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const connect = async () => {
    if (!window.ethereum) return toast.error("No Wallet Found");
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    setAccount(addr);
    refreshChainStats(addr, provider);
    fetchDbRecord(addr);
  };

  const refreshChainStats = async (user: string, provider: any) => {
    try {
      const registry = new Contract(SENTINEL_ADDRESSES.registry, SENTINEL_ABIS.registry, provider);
      const compliance = new Contract(SENTINEL_ADDRESSES.compliance, SENTINEL_ABIS.compliance, provider);
      const [s_score, s_strikes, s_frozen] = await Promise.all([
        registry.getScore(user), compliance.s_violationCount(user), compliance.isFrozen(user)
      ]);
      setScore(Number(s_score)); setStrikes(Number(s_strikes)); setIsFrozen(s_frozen);
    } catch (e) { console.error(e); }
  };

  const fetchDbRecord = async (wallet: string) => {
    const { data } = await supabase.from('restaurants').select('*').eq('wallet_address', wallet).maybeSingle();
    if (data) setDbRecord(data);
  };

  const handleRegister = async () => {
    if (!formName || !formLocation) return toast.error("Details required");
    setLoading(true);
    const toastId = toast.loading("Registering...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const registry = new Contract(SENTINEL_ADDRESSES.registry, SENTINEL_ABIS.registry, signer);
      const tx = await registry.registerFranchise();
      await tx.wait();
      
      await supabase.from('restaurants').upsert([{ wallet_address: account, name: formName, location: formLocation }]);
      toast.success("Franchise Live!", { id: toastId });
      refreshChainStats(account!, provider);
      fetchDbRecord(account!);
    } catch (e) { toast.error("Failed", { id: toastId }); } finally { setLoading(false); }
  };

  const triggerIoT = async (isDanger: boolean) => {
    setLoading(true);
    const toastId = toast.loading("Broadcasting Signal...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const adapter = new Contract(SENTINEL_ADDRESSES.iotAdapter, SENTINEL_ABIS.iotAdapter, signer);
      const tx = await adapter.checkSensors(account, SENSOR_SOURCE_CODE, isDanger ? ["sensor-99"] : ["sensor-01"]);
      await tx.wait();
      toast.success("Signal Verified by Oracle", { id: toastId });
    } catch (e) { toast.error("Signal Failed", { id: toastId }); } finally { setLoading(false); }
  };

  if (!account) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="text-center space-y-6">
        <div className="inline-block p-4 rounded-full bg-blue-500/10 ring-1 ring-blue-500/30">
          <Server className="w-12 h-12 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold">Sentinel Dashboard</h1>
        <button onClick={connect} className="bg-white text-slate-950 px-8 py-3 rounded-full font-bold hover:bg-slate-200 transition-all shadow-lg shadow-white/10">
          Connect Admin Wallet
        </button>
      </div>
    </div>
  );

  if (score === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-200">
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <Building2 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Initialize Node</h2>
          <p className="text-slate-400 text-sm mt-2">Register your franchise on the network.</p>
        </div>
        <div className="space-y-4">
          <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" placeholder="Franchise Name" value={formName} onChange={e => setFormName(e.target.value)} />
          <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" placeholder="Location" value={formLocation} onChange={e => setFormLocation(e.target.value)} />
          <button onClick={handleRegister} disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-colors">
            {loading ? "Syncing..." : "Launch Node"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 scanline text-slate-200 p-6 md:p-12 font-sans selection:bg-blue-500/30">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
      
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-4">
            {dbRecord?.name || "Unregistered Node"}
            <span className="text-xs font-mono font-medium text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              {dbRecord?.location || "Unknown"}
            </span>
          </h1>
          <p className="text-slate-500 mt-2 flex items-center gap-2 font-mono text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Connected: {account.slice(0,6)}...{account.slice(-4)}
          </p>
        </div>
      </header>

      {/* STATS GRID */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldCheck className="w-32 h-32 text-blue-500" /></div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Trust Score</div>
          <div className={`text-6xl font-black mt-4 ${score < 300 ? 'text-red-500' : 'text-blue-500'} tracking-tighter`}>{score}</div>
          <div className="mt-4 text-xs font-mono text-slate-400 bg-slate-950 inline-block px-2 py-1 rounded">REQ: 300+</div>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Signal className="w-32 h-32 text-orange-500" /></div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Strikes</div>
          <div className="text-6xl font-black mt-4 text-orange-500 tracking-tighter">{strikes}<span className="text-2xl text-slate-600 font-medium">/3</span></div>
          <div className="mt-4 text-xs font-mono text-slate-400 bg-slate-950 inline-block px-2 py-1 rounded">PENALTY: -50</div>
        </div>

        <div className={`p-8 rounded-3xl border relative overflow-hidden transition-all ${isFrozen ? 'bg-red-950/20 border-red-900/50' : 'bg-green-950/20 border-green-900/50'}`}>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Node Status</div>
          <div className={`text-4xl font-black mt-6 flex items-center gap-3 ${isFrozen ? 'text-red-500' : 'text-green-500'}`}>
            {isFrozen ? "🛑 REVOKED" : "✅ ACTIVE"}
          </div>
          <div className="mt-4 text-xs font-mono opacity-60 text-slate-300">
            {isFrozen ? "PROTOCOL HALTED" : "OPERATIONAL"}
          </div>
        </div>
      </div>

      {/* IOT CONTROL */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-900 rounded-3xl p-1 border border-slate-800 shadow-2xl">
          <div className="bg-slate-950/50 rounded-[20px] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Radio className="w-5 h-5 text-blue-500 animate-pulse" />
                  Sensor Simulation Uplink
                </h3>
                <p className="text-slate-500 text-sm mt-2 max-w-lg">
                  Inject telemetry data into the Chainlink Oracle Network.
                </p>
              </div>
              <div className="bg-slate-900 px-3 py-1 rounded border border-slate-800 text-xs font-mono text-slate-400">
                UPLINK_STATUS: READY
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => triggerIoT(false)} disabled={loading} className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-800 p-6 rounded-2xl text-left transition-all hover:border-green-500/30 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-green-400 font-bold mb-1 group-hover:text-green-300">Safe Telemetry</div>
                <div className="text-xs text-slate-600 font-mono">PAYLOAD: TEMP_NORMAL (4°C)</div>
              </button>
              
              <button onClick={() => triggerIoT(true)} disabled={loading} className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-800 p-6 rounded-2xl text-left transition-all hover:border-red-500/30 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-red-400 font-bold mb-1 group-hover:text-red-300">Hazard Telemetry</div>
                <div className="text-xs text-slate-600 font-mono">PAYLOAD: TEMP_CRITICAL (50°C)</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}