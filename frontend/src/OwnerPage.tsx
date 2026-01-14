import { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { SENTINEL_ADDRESSES, SENTINEL_ABIS } from './configs/contracts';
import { SENSOR_SOURCE_CODE } from './configs/sensorScript';
import { supabase } from './configs/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { Building2, Signal, ShieldCheck, Server, Radio, Zap, LogOut } from 'lucide-react';

// 1. Import Reown Hooks
import { useAppKitAccount, useAppKitProvider, useAppKit } from '@reown/appkit/react';

export default function OwnerPage() {
  // 2. Use Reown reactive state
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { open } = useAppKit();

  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbRecord, setDbRecord] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");

  // 3. Effect to fetch data when provider or account changes
  useEffect(() => {
    if (isConnected && walletProvider && address) {
      const provider = new BrowserProvider(walletProvider as any);
      refreshChainStats(address, provider);
      fetchDbRecord(address);
    }
  }, [isConnected, walletProvider, address]);

  const refreshChainStats = async (user: string, provider: BrowserProvider) => {
    try {
      const registry = new Contract(SENTINEL_ADDRESSES.registry, SENTINEL_ABIS.registry, provider);
      const compliance = new Contract(SENTINEL_ADDRESSES.compliance, SENTINEL_ABIS.compliance, provider);
      
      const [s_score, s_strikes, s_frozen] = await Promise.all([
        registry.getScore(user), 
        compliance.s_violationCount(user), 
        compliance.isFrozen(user)
      ]);
      
      setScore(Number(s_score)); 
      setStrikes(Number(s_strikes)); 
      setIsFrozen(s_frozen);
    } catch (e) { 
      console.error("Chain Stats Sync Failed:", e); 
    }
  };

  const fetchDbRecord = async (wallet: string) => {
    const { data } = await supabase.from('restaurants').select('*').eq('wallet_address', wallet).maybeSingle();
    if (data) setDbRecord(data);
    else setDbRecord(null);
  };

  const handleRegister = async () => {
    if (!formName || !formLocation) return toast.error("Details required");
    if (!walletProvider) return;

    setLoading(true);
    const toastId = toast.loading("Registering Node...");
    try {
      const provider = new BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      
      const registry = new Contract(SENTINEL_ADDRESSES.registry, SENTINEL_ABIS.registry, signer);
      const tx = await registry.registerFranchise();
      await tx.wait();
      
      await supabase.from('restaurants').upsert([{ wallet_address: address, name: formName, location: formLocation }]);
      
      toast.success("Franchise Live!", { id: toastId });
      refreshChainStats(address!, provider);
      fetchDbRecord(address!);
    } catch (e) { 
      toast.error("Registration Failed", { id: toastId }); 
    } finally { 
      setLoading(false); 
    }
  };

  const triggerIoT = async (isDanger: boolean) => {
    if (!walletProvider || !address) return;
    setLoading(true);
    const toastId = toast.loading("Broadcasting Signal...");
    try {
      const provider = new BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      const adapter = new Contract(SENTINEL_ADDRESSES.iotAdapter, SENTINEL_ABIS.iotAdapter, signer);
      
      const tx = await adapter.checkSensors(address, SENSOR_SOURCE_CODE, isDanger ? ["sensor-99"] : ["sensor-01"]);
      await tx.wait();
      
      toast.success("Signal Verified by Oracle", { id: toastId });
      // Refresh stats after a brief delay to allow oracle callback to process
      setTimeout(() => refreshChainStats(address, provider), 5000);
    } catch (e) { 
      toast.error("Signal Transmission Failed", { id: toastId }); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- RENDER: DISCONNECTED STATE ---
  if (!isConnected) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="text-center space-y-6">
        <div className="inline-block p-4 rounded-full bg-blue-500/10 ring-1 ring-blue-500/30">
          <Server className="w-12 h-12 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold font-mono tracking-tighter">Sentinel_Dashboard</h1>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">Establish a secure uplink to manage your franchise node.</p>
        <button onClick={() => open()} className="bg-white text-slate-950 px-8 py-3 rounded-none font-mono text-xs font-bold hover:bg-red-500 hover:text-white transition-all shadow-lg uppercase tracking-widest">
          Initialize_Uplink
        </button>
      </div>
    </div>
  );

  // --- RENDER: REGISTRATION STATE ---
  if (score === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-200">
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-md w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
        <div className="text-center mb-8">
          <Building2 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white font-mono uppercase tracking-tighter">Initialize Node</h2>
          <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Registering Address: {address?.slice(0,6)}...{address?.slice(-4)}</p>
        </div>
        <div className="space-y-4">
          <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-all" placeholder="Franchise Name" value={formName} onChange={e => setFormName(e.target.value)} />
          <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-all" placeholder="Location" value={formLocation} onChange={e => setFormLocation(e.target.value)} />
          <button onClick={handleRegister} disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-all uppercase tracking-[0.2em] text-xs">
            {loading ? "Syncing_Network..." : "Launch_Node"}
          </button>
          <button onClick={() => open()} className="w-full text-slate-600 text-[10px] font-mono hover:text-red-400 transition-colors uppercase">Switch_Identity</button>
        </div>
      </div>
    </div>
  );

  // --- RENDER: ACTIVE DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-950 scanline text-slate-200 p-6 md:p-12 font-sans selection:bg-blue-500/30">
      <Toaster position="top-right" />
      
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
            UPLINK: {address?.slice(0,6)}...{address?.slice(-4)}
          </p>
        </div>
        
        {/* Reown Smart Button */}
        <button 
          onClick={() => open()}
          className="group relative px-6 py-2 border border-slate-700 font-mono text-[10px] tracking-[0.3em] uppercase transition-all hover:border-red-500 hover:text-red-500"
        >
          <div className="flex items-center gap-2 group-hover:hidden">
            <Zap className="w-3 h-3 text-blue-500" /> MANAGED_IDENTITY
          </div>
          <div className="hidden group-hover:flex items-center gap-2">
            <LogOut className="w-3 h-3" /> TERMINATE_SESSION
          </div>
        </button>
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
          <div className="mt-4 text-xs font-mono opacity-60 text-slate-300 uppercase tracking-widest">
            {isFrozen ? "PROTOCOL_HALTED" : "OPERATIONAL"}
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
                <h3 className="text-xl font-bold text-white flex items-center gap-3 font-mono">
                  <Radio className="w-5 h-5 text-blue-500 animate-pulse" />
                  Sensor Simulation Uplink
                </h3>
                <p className="text-slate-500 text-sm mt-2 max-w-lg">
                  Inject telemetry data into the Chainlink Oracle Network. Compliance logic is executed on-chain via Functions.
                </p>
              </div>
              <div className="bg-slate-900 px-3 py-1 rounded border border-slate-800 text-[10px] font-mono text-blue-500 tracking-widest">
                UPLINK_STATUS: READY
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => triggerIoT(false)} disabled={loading} className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-800 p-6 rounded-2xl text-left transition-all hover:border-green-500/30 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-green-400 font-bold mb-1 group-hover:text-green-300 font-mono tracking-tighter">Safe Telemetry</div>
                <div className="text-[10px] text-slate-600 font-mono uppercase">Payload: Temp_Normal (4°C)</div>
              </button>
              
              <button onClick={() => triggerIoT(true)} disabled={loading} className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-800 p-6 rounded-2xl text-left transition-all hover:border-red-500/30 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-red-400 font-bold mb-1 group-hover:text-red-300 font-mono tracking-tighter">Hazard Telemetry</div>
                <div className="text-[10px] text-slate-600 font-mono uppercase">Payload: Temp_Critical (50°C)</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}