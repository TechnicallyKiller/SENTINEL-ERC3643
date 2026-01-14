import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { SENTINEL_ADDRESSES, SENTINEL_ABIS } from './configs/contracts';
import { supabase } from './configs/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { ShieldAlert, Receipt, Search, AlertTriangle, Lock } from 'lucide-react';
import { generateProof } from './lib/zk'; 

interface Restaurant {
  id: number;
  name: string;
  location: string;
  wallet_address: string;
  created_at: string;
}

export default function CustomerPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("Wallet Switched:", accounts[0]);
        // Reload page to clear old state/cache and re-connect cleanly
        window.location.reload();
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      // Listen for events
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup listeners on unmount
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  

  useEffect(() => {
    fetchDirectory();
    const channel = supabase
      .channel('public:restaurants')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'restaurants' }, (payload) => {
        setRestaurants((prev) => [payload.new as Restaurant, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDirectory = async () => {
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    if (data) setRestaurants(data);
  };

  const submitReport = async () => {
    if (!receiptId) return toast.error("Receipt ID is required");
    if (!selectedWallet) return toast.error("Select a venue");

    setLoading(true);
    const toastId = toast.loading("Initializing ZK Worker...");

    try {
      if (!window.ethereum) throw new Error("No Wallet Found");

      // 1. GENERATE PROOF
      const zkData = await generateProof(receiptId, (msg) => toast.loading(msg, { id: toastId }));

      // 2. SUBMIT TO CHAIN
      toast.loading("Proof Verified! Staking 0.001 ETH...", { id: toastId });
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const compliance = new Contract(SENTINEL_ADDRESSES.compliance, SENTINEL_ABIS.compliance, signer);

      const tx = await compliance.reportViolationZK(
        selectedWallet,
        zkData.a, zkData.b, zkData.c, zkData.input,
        { value: parseEther("0.001") }
      );
      
      toast.loading(`Verifying On-Chain: ${tx.hash.slice(0,6)}...`, { id: toastId });
      await tx.wait();
      toast.loading("Indexing Report...", { id: toastId });

// SAVE TO DB FOR AUDITOR REVIEW
await supabase.from('reports').insert([{
  franchise_wallet: selectedWallet,
  reporter_wallet: (await signer.getAddress()), // The user's address
  receipt_id: receiptId,
  tx_hash: tx.hash,
  status: 'PENDING'
}]);

toast.success("Report Verified! Awaiting Auditor Payout.", { id: toastId });
      
      setReceiptId("");

    } catch (e: any) {
      console.error(e);
      if (e.reason === "rejected") toast.error("Transaction Rejected", { id: toastId });
      else toast.error(`Failed: ${e.message.slice(0, 25)}...`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 scanline text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-red-500/30">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
      
      <div className="max-w-xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Sentinel <span className="text-red-500">Reporter</span>
          </h1>
          <p className="mt-3 text-lg text-slate-400">
             Decentralized Whistleblowing Protocol
          </p>
        </div>

        <div className="mt-4 flex justify-center">
  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
    {window.ethereum?.selectedAddress 
      ? `Connected: ${window.ethereum.selectedAddress.slice(0,6)}...${window.ethereum.selectedAddress.slice(-4)}`
      : "Wallet Not Connected"}
  </div>
</div>

        {/* MAIN CARD */}
        <div className="bg-slate-900/50 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-slate-800 sm:px-10 relative overflow-hidden">
            {/* Glow Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 opacity-50"></div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Franchise</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-4 h-5 w-5 text-slate-500 group-focus-within:text-red-400 transition-colors" />
                  <select
                    value={selectedWallet}
                    onChange={(e) => setSelectedWallet(e.target.value)}
                    className="block w-full pl-12 pr-10 py-4 text-base bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-slate-200 shadow-inner transition-all hover:border-slate-700 appearance-none"
                  >
                    <option value="" disabled>Select a venue...</option>
                    {restaurants.map((rest) => (
                      <option key={rest.id} value={rest.wallet_address}>
                        {rest.name} — {rest.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Receipt ID</label>
                <div className="relative group">
                  <Receipt className="absolute left-4 top-4 h-5 w-5 text-slate-500 group-focus-within:text-red-400 transition-colors" />
                  <input
                    type="number"
                    value={receiptId}
                    onChange={(e) => setReceiptId(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-white placeholder-slate-600 shadow-inner transition-all hover:border-slate-700"
                    placeholder="e.g. 8841"
                  />
                </div>
              </div>

              <button
                onClick={submitReport}
                disabled={loading || !selectedWallet}
                className={`w-full flex justify-center items-center gap-2 py-5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-8
                  ${loading 
                    ? 'bg-slate-800 cursor-not-allowed text-slate-500' 
                    : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-900/20'}
                `}
              >
                {loading ? (
                   <span className="flex items-center gap-2">
                     <Lock className="w-4 h-4 animate-pulse" /> Generating ZK Proof...
                   </span>
                ) : (
                  "Generate ZK Proof & Report"
                )}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/50">
              <p className="text-xs text-center text-slate-500 flex items-center justify-center gap-2">
                 <AlertTriangle className="w-3 h-3 text-orange-500" />
                 <span>Zero-Knowledge Architecture: Your data is never revealed.</span>
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}