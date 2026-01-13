// src/config/contracts.ts

// 1. PASTE YOUR BASE SEPOLIA ADDRESSES HERE
export const SENTINEL_ADDRESSES = {
  verifier: "0xF68FdE75D33B535A9Dc3E229E357D6C3bCdABc1B", // Paste Verifier Address
  registry: "0x7de5Cd779B77356348aDf870d74fD9c6A0261eC1", // Paste Registry Address
  compliance: "0x852BC6A2f8053E639A518fEBB31b041FF19E9398", // Paste Compliance Address
  token: "0x4b6c70CE4Fbaff07fE6A83C93A871E0dE58C9Dd7",    // Paste Token Address
} as const;

// 2. HUMAN-READABLE ABIS (Simplified for frontend)
export const SENTINEL_ABIS = {
  // Token: We need to check balance and mint
  token: [
    "function balanceOf(address owner) view returns (uint256)",
    "function mint(address to, uint256 amount) external",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ],
  // Compliance: We need to submit ZK proofs AND READ STRIKES
  compliance: [
    // 1. The Submit Function
    "function reportViolationZK(address _badActor, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256[2] memory input) external",
    
    // 2. THE MISSING LINE (Add this!) 👇
    "function s_violationCount(address) external view returns (uint256)" 
  ],
  // Registry: We need to check if user is verified (optional for now)
  registry: [
    "function isVerified(address user) view returns (bool)"
  ]
} as const;