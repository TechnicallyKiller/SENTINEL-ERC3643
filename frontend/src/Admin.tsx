import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { SENTINEL_ADDRESSES, SENTINEL_ABIS } from './configs/contracts';
import { supabase } from './configs/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  LayoutDashboard,  
  Activity, 
  Gavel,
  Wallet,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';

// --- INTERFACES ---
interface FranchiseData {
  id: number;
  name: string;
  location: string;
  wallet_address: string;
  score?: number;
  strikes?: number;
  isFrozen?: boolean;
}

interface Report {
  id: number;
  franchise_wallet: string;
  reporter_wallet: string;
  receipt_id: string;
  status: string; // 'PENDING' | 'PAID' | 'REJECTED'
  tx_hash: string;
  created_at: string;
}

export default function AdminPage() {
  // --- STATE ---
  const [account, setAccount] = useState<string>("");
  const [franchises, setFranchises] = useState<FranchiseData[]>([]);
  const [reports, setReports] = useState<Report[]>([]); // <--- NEW STATE FOR CLAIMS
  const [loading, setLoading] = useState(false);
  const [totalStrikes, setTotalStrikes] = useState(0);
  const [treasuryBalance, setTreasuryBalance] = useState("0.0");

  // --- 1. WALLET LISTENER (AUTO-RELOAD) ---
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          console.log("Wallet Switched:", accounts[0]);
          setAccount(accounts[0]);
          window.location.reload(); 
        } else {
          setAccount(""); 
          toast.error("Wallet Disconnected");
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // --- 2. INITIALIZATION ---
  useEffect(() => {
    connectAdmin();
  }, []);

  const connectAdmin = async () => {
    if (!window.ethereum) return toast.error("Admin Wallet Required");
    const provider = new BrowserProvider(window.ethereum);
    
    try {
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAccount(addr);
      // Fetch both datasets
      await fetchAllData(provider);
      await fetchReports();
    } catch (e) {
      console.error(e);
    }
  };

  const disconnect = () => {
    setAccount("");
    toast.success("Disconnected. Please switch account in MetaMask.");
  };

  // --- 3. DATA FETCHING ---
  const fetchAllData = async (provider: any) => {
    setLoading(true);
    try {
      // A. Treasury Balance
      const balanceWei = await provider.getBalance(SENTINEL_ADDRESSES.compliance);
      setTreasuryBalance(formatEther(balanceWei));

      // B. Franchises DB
      const { data: dbData } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (!dbData) return;

      const registry = new Contract(SENTINEL_ADDRESSES.registry, SENTINEL_ABIS.registry, provider);
      const compliance = new Contract(SENTINEL_ADDRESSES.compliance, SENTINEL_ABIS.compliance, provider);

      // C. Merge with Blockchain Data
      const fullData = await Promise.all(dbData.map(async (rest) => {
        try {
          const [score, strikes, isFrozen] = await Promise.all([
            registry.getScore(rest.wallet_address),
            compliance.s_violationCount(rest.wallet_address),
            compliance.isFrozen(rest.wallet_address)
          ]);
          return {
            ...rest,
            score: Number(score),
            strikes: Number(strikes),
            isFrozen
          };
        } catch (e) {
          return { ...rest, score: 0, strikes: 0, isFrozen: false };
        }
      }));

      setFranchises(fullData);
      setTotalStrikes(fullData.reduce((acc, curr) => acc + (curr.strikes || 0), 0));

    } catch (e) {
      console.error(e);
      toast.error("Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReports(data);
  };

  // --- 4. ADMIN ACTIONS ---
  
  // A. Payout Logic
  const handlePayout = async (report: Report, isApprove: boolean) => {
    if (report.status !== 'PENDING') return;

    if (!isApprove) {
      // Reject
      await supabase.from('reports').update({ status: 'REJECTED' }).eq('id', report.id);
      toast.error("Report Rejected. Stake Slashed.");
      fetchReports();
      return;
    }

    // Approve & Pay
    const toastId = toast.loading("Processing Payout...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: report.reporter_wallet,
        value: parseEther("0.002") // 0.001 Refund + 0.001 Reward
      });

      toast.loading(`Sending Reward... (Tx: ${tx.hash.slice(0,6)})`, { id: toastId });
      await tx.wait();

      await supabase.from('reports').update({ status: 'PAID' }).eq('id', report.id);
      
      toast.success("Reporter Rewarded Successfully!", { id: toastId });
      fetchReports();

    } catch (e: any) {
      console.error(e);
      toast.error("Payout Failed", { id: toastId });
    }
  };

  // B. Ban Logic
  const manualBan = async (targetWallet: string, currentStatus: boolean) => {
    if (currentStatus) return toast.error("Already Revoked");
    if(!confirm("⚠️ FORCE REVOKE LICENSE? This cannot be undone.")) return;

    const toastId = toast.loading("Executing Ban...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const adapter = new Contract(SENTINEL_ADDRESSES.iotAdapter, SENTINEL_ABIS.iotAdapter, signer);
      
      const tx = await adapter.checkSensors(targetWallet, "FORCE_BAN", ["sensor-99"]);
      await tx.wait();
      
      toast.success("License Revoked.", { id: toastId });
      // Refresh Data
      fetchAllData(provider);
    } catch (e) {
      toast.error("Authorization Failed", { id: toastId });
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20 selection:bg-purple-500/30">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#0f172a', color: '#fff', border: '1px solid #1e293b' } }} />

      {/* NAVBAR */}
      <nav className="border-b border-slate-900 bg-slate-950/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
              <Gavel className="w-5 h-5 text-purple-400" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-100">Sentinel <span className="text-purple-500">Auditor</span></span>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={disconnect} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
               Disconnect
             </button>
             <div className="text-xs font-mono text-slate-500 flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
               <div className={`w-2 h-2 rounded-full ${account ? 'bg-green-500' : 'bg-red-500'}`}></div>
               {account ? `ADMIN: ${account.slice(0,6)}...${account.slice(-4)}` : 'DISCONNECTED'}
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet className="w-16 h-16 text-emerald-500" /></div>
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Total Staked (Bonds)</div>
            <div className="text-3xl font-black text-emerald-400 flex items-baseline gap-1">
              {treasuryBalance} <span className="text-sm font-normal text-slate-500">ETH</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">Held in Contract</div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Active Franchises</div>
            <div className="text-3xl font-black text-white">{franchises.length}</div>
          </div>
          
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Total Violations</div>
            <div className="text-3xl font-black text-orange-500">{totalStrikes}</div>
          </div>
          
          <div className="bg-purple-900/10 p-5 rounded-xl border border-purple-500/20">
             <div className="text-purple-400 text-xs font-bold uppercase mb-1">System Status</div>
             <div className="text-xl font-bold text-white flex items-center gap-2 mt-2">
                <Activity className="w-5 h-5 text-green-400" /> Online
             </div>
          </div>
        </div>

        {/* --- SECTION 1: CLAIM RESOLUTION (The Payout UI) --- */}
        <div className="mb-12">
           <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Claim Resolution</h2>
                <p className="text-slate-500 text-sm">Review whistleblower reports and release staked ETH.</p>
              </div>
              <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 flex items-center gap-3">
                 <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Pending Review</div>
                    <div className="text-lg font-bold text-white leading-none">
                      {reports.filter(r => r.status === 'PENDING').length}
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-slate-800 text-xs font-bold text-slate-500 uppercase bg-slate-950/30">
                     <th className="px-6 py-4">Reporter</th>
                     <th className="px-6 py-4">Target Franchise</th>
                     <th className="px-6 py-4">Evidence</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Decision</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                   {reports.map((report) => (
                     <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                       <td className="px-6 py-4">
                         <div className="text-sm font-mono text-slate-300">
                           {report.reporter_wallet.slice(0,6)}...{report.reporter_wallet.slice(-4)}
                         </div>
                       </td>
                       <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                         {report.franchise_wallet.slice(0,6)}...
                       </td>
                       <td className="px-6 py-4">
                         <a href={`https://sepolia.basescan.org/tx/${report.tx_hash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                           <FileText className="w-3 h-3" /> View Tx
                         </a>
                       </td>
                       <td className="px-6 py-4">
                          {report.status === 'PENDING' && <span className="px-2 py-1 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">PENDING</span>}
                          {report.status === 'PAID' && <span className="px-2 py-1 rounded text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">PAID</span>}
                          {report.status === 'REJECTED' && <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">REJECTED</span>}
                       </td>
                       <td className="px-6 py-4 text-right">
                         {report.status === 'PENDING' ? (
                           <div className="flex justify-end gap-2">
                             <button onClick={() => handlePayout(report, false)} className="p-2 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-colors" title="Reject">
                               <XCircle className="w-5 h-5" />
                             </button>
                             <button onClick={() => handlePayout(report, true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95">
                               <CheckCircle className="w-4 h-4" /> PAY 0.002
                             </button>
                           </div>
                         ) : (
                           <span className="text-xs text-slate-600 font-mono">RESOLVED</span>
                         )}
                       </td>
                     </tr>
                   ))}
                   {reports.length === 0 && (
                     <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">No claims submitted yet.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>

        {/* --- SECTION 2: LIVE NETWORK STATE (The Ban UI) --- */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
           <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-slate-400" />
              Live Network State
            </h2>
            <button onClick={() => connectAdmin()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
              <Activity className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold text-slate-500 uppercase bg-slate-950/30">
                  <th className="px-6 py-4">Franchise</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Trust Score</th>
                  <th className="px-6 py-4">Strikes</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {franchises.map((rest) => (
                  <tr key={rest.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{rest.name}</div>
                      <div className="text-xs font-mono text-slate-500">{rest.wallet_address.slice(0,8)}...</div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{rest.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <span className={`text-sm font-bold ${rest.score && rest.score > 300 ? 'text-blue-400' : 'text-red-400'}`}>{rest.score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-orange-500 font-bold">{rest.strikes}/3</span>
                    </td>
                    <td className="px-6 py-4">
                      {rest.isFrozen ? 
                        <span className="text-xs font-bold text-red-500 bg-red-950/30 px-2 py-1 rounded border border-red-900/50">REVOKED</span> : 
                        <span className="text-xs font-bold text-green-500 bg-green-950/30 px-2 py-1 rounded border border-green-900/50">ACTIVE</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => manualBan(rest.wallet_address, rest.isFrozen || false)} disabled={rest.isFrozen} className="text-xs font-bold bg-slate-800 hover:bg-red-600 px-3 py-1 rounded transition-colors disabled:opacity-30">
                         {rest.isFrozen ? "BANNED" : "REVOKE"}
                       </button>
                    </td>
                  </tr>
                ))}
                {franchises.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">No franchises found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}