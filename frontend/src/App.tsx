import { useState, useEffect } from 'react'
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers'
import { SENTINEL_ADDRESSES, SENTINEL_ABIS } from './configs/contracts' 
import { generateProof } from './lib/zk'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function App() {
  const [account, setAccount] = useState<string | null>(null)
  const [balance, setBalance] = useState("0")
  const [strikes, setStrikes] = useState("0") // <--- NEW STATE
  const [secret, setSecret] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (msg: string) => setLogs(prev => [`> ${msg}`, ...prev])

  // Refresh both Balance AND Strikes
  const refreshStats = async (user: string, provider: BrowserProvider) => {
    try {
      const token = new Contract(SENTINEL_ADDRESSES.token, SENTINEL_ABIS.token, provider)
      const bal = await token.balanceOf(user)
      setBalance(formatUnits(bal, 18))

      // FETCH STRIKES FROM COMPLIANCE CONTRACT
      // MAKE SURE ADDRESS IS CORRECT HERE TOO
      const compliance = new Contract("0x852BC6A2f8053E639A518fEBB31b041FF19E9398", SENTINEL_ABIS.compliance, provider)
      const count = await compliance.s_violationCount(user)
      setStrikes(count.toString())
    } catch (e) { console.error("Stats error", e) }
  }

  const connect = async () => {
    if (!window.ethereum) return alert("Install MetaMask")
    const provider = new BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const user = await signer.getAddress()
    setAccount(user)
    addLog("Wallet Connected: " + user)
    await refreshStats(user, provider)
  }

  const mintTokens = async () => {
    if (!account) return;
    setLoading(true);
    addLog("🚰 Requesting 100 SENT...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(SENTINEL_ADDRESSES.token, SENTINEL_ABIS.token, signer);
      
      const tx = await token.mint(account, parseUnits("100", 18));
      addLog(`Mint TX: ${tx.hash}`);
      await tx.wait();
      addLog("✅ Licensed!");
      await refreshStats(account, provider);
    } catch (e: any) {
      addLog("❌ Mint Failed: " + e.reason);
    } finally {
      setLoading(false);
    }
  }

  const submitProof = async () => {
    if (!account || !secret) return alert("Enter a secret first!")
    setLoading(true)
    setLogs([]) 
    addLog(`INITIATING ZK SEQUENCE...`)
    await sleep(100);

    try {
      const proofData = await generateProof(secret, addLog);
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      addLog("🚀 BROADCASTING TO BASE SEPOLIA...")
      
      // HARDCODED COMPLIANCE ADDRESS (Keep this!)
      const contract = new Contract("0x852BC6A2f8053E639A518fEBB31b041FF19E9398", SENTINEL_ABIS.compliance, signer)

      const tx = await contract.reportViolationZK(
        account, 
        proofData.a,
        proofData.b,
        proofData.c,
        proofData.input,
        { gasLimit: 500000 } 
      )
      
      addLog(`TX SENT: ${tx.hash}`)
      addLog("⏳ Waiting for confirmation...")
      await tx.wait()
      
      addLog("✅ SUCCESS: VIOLATION RECORDED!")
      addLog("⚠️ STRIKE ADDED TO PERMANENT RECORD")
      
      await refreshStats(account, provider); // Update UI

    } catch (e: any) {
      console.error(e)
      addLog("❌ ERROR: " + (e.reason || e.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <header className="border-b border-green-800 pb-4 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white">SENTINEL_LIVE</h1>
            <p className="text-xs text-green-700">BASE SEPOLIA // ZK-SNARK VERIFIER</p>
          </div>
          <div className="text-right">
             <div className="text-xs text-gray-500">STATUS</div>
             <div className="font-bold text-white">{account ? "ONLINE" : "OFFLINE"}</div>
          </div>
        </header>

        {!account ? (
          <button onClick={connect} className="w-full py-4 bg-green-900/20 border border-green-600 hover:bg-green-600/20 text-xl font-bold rounded">
            [ CONNECT WALLET ]
          </button>
        ) : (
          <div className="space-y-6">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900 border border-gray-800 rounded">
                <div className="text-xs text-gray-500">COMPLIANCE TOKENS</div>
                <div className="text-2xl font-bold text-white">{parseFloat(balance).toFixed(0)}</div>
              </div>
              {/* NEW STRIKES BOX */}
              <div className="p-4 bg-red-900/20 border border-red-900 rounded">
                <div className="text-xs text-red-500">ACTIVE STRIKES</div>
                <div className="text-2xl font-bold text-red-500">{strikes}</div>
              </div>
            </div>

            {parseFloat(balance) === 0 && (
               <div className="p-4 border border-dashed border-yellow-700 bg-yellow-900/10 rounded flex justify-between items-center">
                  <div className="text-sm text-yellow-500">⚠️ LICENSE REQUIRED</div>
                  <button onClick={mintTokens} disabled={loading} className="px-4 py-2 bg-yellow-600 text-black font-bold text-sm rounded hover:bg-yellow-500">
                    {loading ? "MINTING..." : "MINT 100 TOKENS"}
                  </button>
               </div>
            )}

            <div className="p-6 border border-green-600 bg-green-900/10 rounded-xl">
              <h2 className="text-white font-bold mb-4">GENERATE PROOF</h2>
              <div className="mb-4">
                <label className="block text-xs mb-2">ENTER SECRET (INVOICE ID)</label>
                <input 
                  type="text" 
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="e.g. 998877"
                  className="w-full bg-black border border-green-800 p-3 text-white focus:border-green-500 outline-none font-mono"
                />
              </div>
              <button onClick={submitProof} disabled={loading} className={`w-full py-4 font-bold text-black rounded transition-all ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-500 hover:bg-green-400'}`}>
                {loading ? "CALCULATING..." : "SUBMIT PROOF"}
              </button>
            </div>

            <div className="bg-black border border-gray-800 p-4 h-64 overflow-y-auto font-xs text-gray-400 rounded font-mono text-sm">
              {logs.length === 0 && <span className="opacity-50">System ready. Waiting for input...</span>}
              {logs.map((log, i) => (
                <div key={i} className="mb-1 break-all border-b border-gray-900 pb-1">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}