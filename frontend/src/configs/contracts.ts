// src/config/contracts.ts

// 1. PASTE YOUR BASE SEPOLIA ADDRESSES HERE
export const SENTINEL_ADDRESSES = {
  verifier:   "0xb01e1eC56031FF6ad555642AeFfDe4396D055502",
  registry:   "0x766A31355bE7e190B6DE5fAA25678349Dff1DE26",
  compliance: "0xaf200948C6485962c79156AA4F3cF08bfe0D2519",
  iotAdapter: "0x51E4340c878a9E4cfbC7638c2EF9a5830B43b9cc",
  token:      "0x645407ff10F22273c73c739552A22dA632C5366A"
};


export const SENTINEL_ABIS = {
  registry: [
    "function registerFranchise() external",
    "function getScore(address) view returns (uint256)",
    "function isVerified(address) view returns (bool)"
  ],
  compliance: [
    "function reportViolationZK(address,uint256[2],uint256[2][2],uint256[2],uint256[2]) external payable",
    "function s_violationCount(address) view returns (uint256)",
    "function isFrozen(address) view returns (bool)"
  ],
  iotAdapter: [
    "function checkSensors(address,string,string[]) external returns (bytes32)"
  ],
  token: [
    "function balanceOf(address) view returns (uint256)",
    "function mint(address,uint256) external"
  ]
}