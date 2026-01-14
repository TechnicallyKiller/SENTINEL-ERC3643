import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { SENTINEL_ADDRESSES, SENTINEL_ABIS } from './configs/contracts';
import { supabase } from './configs/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Gavel,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Activity,
  Wallet
} from 'lucide-react';

// 1. Import Reown Hooks
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';

// --- CONSTANTS ---
const AUTHORIZED_ADMIN = "0x364edc06254874e62ff4ad8fa4d9a45238cb5609";

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
  status: string; 
  tx_hash: string;
  created_at: string;
}

export default function AdminPage() {
  // 2. Use Reown reactive state
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');

  const [franchises, setFranchises] = useState<FranchiseData[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalStrikes, setTotalStrikes] = useState(0);
  const [treasuryBalance, setTreasuryBalance] = useState("0.0");

  // Helper to check if current wallet is the super-admin
  const isAdmin = isConnected && address?.toLowerCase() === AUTHORIZED_ADMIN.toLowerCase();

  // 3. Effect to fetch data when provider or account changes
  useEffect(() => {
    if (isConnected && walletProvider) {
      const provider = new BrowserProvider(walletProvider as any);
      fetchAllData(provider);
      fetchReports();
    }
  }, [isConnected, walletProvider, address]);

  const fetchAllData = async (provider: BrowserProvider) => {
    setLoading(true);
    try {
      const balanceWei = await provider.getBalance(SENTINEL_ADDRESSES.compliance);
      setTreasuryBalance(formatEther(balanceWei));

      const { data: dbData } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (!dbData) return;

      const registry = new Contract(SENTINEL_ADDRESSES.registry, SENTINEL_ABIS.registry, provider);
      const compliance = new Contract(SENTINEL_ADDRESSES.compliance, SENTINEL_ABIS.compliance, provider);

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
      console.error("Sync Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (data) setReports(data);
  };

  // 4. Admin Action: handlePayout using Reown Provider
  const handlePayout = async (report: Report, isApprove: boolean) => {
    if (!isAdmin) return toast.error("Unauthorized: Admin Access Only");
    if (report.status !== 'PENDING') return;

    if (!isApprove) {
      await supabase.from('reports').update({ status: 'REJECTED' }).eq('id', report.id);
      toast.error("Report Rejected.");
      fetchReports();
      return;
    }

    const toastId = toast.loading("Processing Payout...");
    try {
      const provider = new BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: report.reporter_wallet,
        value: parseEther("0.002") 
      });
      
      await tx.wait();
      await supabase.from('reports').update({ status: 'PAID' }).eq('id', report.id);
      toast.success("Payout Successful", { id: toastId });
      fetchReports();
    } catch (e: any) {
      toast.error("Action Failed", { id: toastId });
    }
  };

  // 5. Admin Action: manualBan using Reown Provider
  const manualBan = async (targetWallet: string, currentStatus: boolean) => {
    if (!isAdmin) return toast.error("Unauthorized: Admin Access Only");
    if (currentStatus) return toast.error("Already Revoked");
    if(!confirm("⚠️ FORCE REVOKE LICENSE?")) return;

    const toastId = toast.loading("Executing Ban...");
    try {
      const provider = new BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      const adapter = new Contract(SENTINEL_ADDRESSES.iotAdapter, SENTINEL_ABIS.iotAdapter, signer);
      
      const tx = await adapter.checkSensors(targetWallet, "FORCE_BAN", ["sensor-99"]);
      await tx.wait();
      
      toast.success("License Revoked.", { id: toastId });
      fetchAllData(provider);
    } catch (e) {
      toast.error("Failed to revoke", { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
      <Toaster position="bottom-right" />

      {/* NAVBAR */}
      <nav className="border-b border-slate-900 bg-slate-950/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gavel className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-lg text-slate-100">Sentinel Auditor</span>
          </div>
          
          <div className="flex items-center gap-4">
              {/* AUTH ALERT */}
              {isConnected && !isAdmin && (
                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-md border border-red-500/20 animate-pulse">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Unauthorized</span>
                </div>
              )}

              {/* REOWN BUTTON (Handles Connect/Disconnect automatically) */}
              <appkit-button size="sm" />
          </div>
        </div>
      </nav>

      <main className={`max-w-7xl mx-auto px-6 py-8 transition-all duration-500 ${!isAdmin ? 'opacity-40 pointer-events-none blur-sm' : 'opacity-100'}`}>
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 relative">
             <div className="text-slate-500 text-xs font-bold uppercase mb-1">Total Staked</div>
             <div className="text-3xl font-black text-emerald-400">{treasuryBalance} ETH</div>
             <Wallet className="absolute top-4 right-4 w-10 h-10 text-slate-800 opacity-20" />
          </div>
          
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Active Nodes</div>
            <div className="text-3xl font-black text-white">{franchises.length}</div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Total Violations</div>
            <div className="text-3xl font-black text-orange-500">{totalStrikes}</div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col justify-center">
             <div className="flex items-center gap-2 text-green-500 font-mono text-xs">
                <Activity className="w-4 h-4" /> SYSTEM_ACTIVE
             </div>
          </div>
        </div>

        {/* CLAIM RESOLUTION */}
        <div className="mb-12">
           <h2 className="text-2xl font-bold text-white mb-6 font-mono tracking-tight">Pending Resolution</h2>
           <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-950/30 text-xs font-bold text-slate-500 uppercase border-b border-slate-800 font-mono">
                   <th className="px-6 py-4 tracking-widest">Reporter_ID</th>
                   <th className="px-6 py-4 tracking-widest">Status</th>
                   <th className="px-6 py-4 text-right tracking-widest">Final_Decision</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {reports.map((report) => (
                   <tr key={report.id} className="hover:bg-slate-800/20 transition-colors">
                     <td className="px-6 py-4 text-sm font-mono text-slate-400">
                        {report.reporter_wallet.slice(0,10)}...{report.reporter_wallet.slice(-4)}
                     </td>
                     <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                            report.status === 'PAID' ? 'text-green-500 border-green-900/50 bg-green-900/10' : 
                            report.status === 'REJECTED' ? 'text-red-500 border-red-900/50 bg-red-900/10' :
                            'text-yellow-500 border-yellow-900/50 bg-yellow-900/10'
                        }`}>
                            {report.status}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-3">
                         <button 
                            onClick={() => handlePayout(report, false)} 
                            disabled={!isAdmin || report.status !== 'PENDING'} 
                            className="p-2 rounded-lg bg-red-500/5 hover:bg-red-500/20 text-red-500 disabled:opacity-10 transition-all border border-red-500/10"
                          >
                           <XCircle className="w-5 h-5" />
                         </button>
                         <button 
                            onClick={() => handlePayout(report, true)} 
                            disabled={!isAdmin || report.status !== 'PENDING'} 
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg disabled:bg-slate-800 disabled:text-slate-600 transition-all"
                          >
                           <CheckCircle className="w-4 h-4" /> APPROVE_PAYOUT
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        {/* LIVE NETWORK STATE */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
           <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
              <h2 className="font-bold text-lg font-mono">Global_Network_Registry</h2>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">Node Count: {franchises.length}</div>
           </div>
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="border-b border-slate-800 text-xs font-bold text-slate-500 uppercase bg-slate-950/30 font-mono">
                 <th className="px-6 py-4 tracking-widest">Authorized_Franchise</th>
                 <th className="px-6 py-4 text-right tracking-widest">Operation_Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800">
               {franchises.map((rest) => (
                 <tr key={rest.id} className="hover:bg-slate-800/30 transition-colors">
                   <td className="px-6 py-4">
                      <div className="font-bold text-white mb-1 tracking-tight">{rest.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">{rest.location}</div>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => manualBan(rest.wallet_address, rest.isFrozen || false)} 
                        disabled={!isAdmin || rest.isFrozen} 
                        className={`text-[10px] font-black tracking-widest px-4 py-2 rounded-md border transition-all
                            ${rest.isFrozen 
                                ? 'bg-red-500/10 border-red-500/30 text-red-500 cursor-not-allowed' 
                                : 'bg-slate-800 border-slate-700 hover:bg-red-600 hover:border-red-500 text-slate-300 hover:text-white'
                            }
                        `}
                      >
                        {rest.isFrozen ? "TERMINATED" : "REVOKE_ACCESS"}
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </main>

      {/* OVERLAY FOR UNAUTHORIZED USERS */}
      {!isAdmin && isConnected && (
          <div className="fixed inset-0 top-16 z-20 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-sm">
             <div className="bg-slate-900 p-8 border border-red-500/20 rounded-2xl text-center max-w-md shadow-2xl">
                <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
                <h1 className="text-2xl font-black text-white mb-2 font-mono uppercase tracking-widest">Access_Denied</h1>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    Detected unauthorized signature. Auditor clearance is required to interact with the Sentinel Registry.
                </p>
                <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/10 mb-6">
                    <code className="text-[10px] text-red-400 font-mono break-all">{address}</code>
                </div>
                <button onClick={() => window.location.href = '/'} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all font-mono text-xs uppercase tracking-[0.2em]">
                    Return to Surface
                </button>
             </div>
          </div>
      )}
    </div>
  );
}