import * as snarkjs from 'snarkjs';

export type ZKProofPayload = {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  input: [string, string];
};

export async function generateProof(
  secretInput: string, 
  logger: (msg: string) => void 
): Promise<ZKProofPayload> {
  
  logger("🔐 ZK WORKER: Initializing...");
  
  // 1. Add a timestamp cache-buster to force Vercel to fetch the actual binary
  // This prevents the browser from using the cached HTML 404 page
  const cb = `?v=${Date.now()}`;
  const wasmPath = `/v2_zk/whistleblower.wasm${cb}`;
  const zkeyPath = `/v2_zk/whistleblower_final.zkey${cb}`;

  try {
    // 2. Pre-flight check: Verify the WASM is actually binary before handing it to snarkjs
    // This catches the "magic word" error before it crashes the compiler
    const response = await fetch(wasmPath);
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("text/html")) {
      throw new Error("SERVER_CONFIG_ERROR: Received HTML instead of WASM. Check vercel.json rewrites.");
    }

    const inputs = {
      secret: secretInput,  
      reportId: "404" 
    };

    logger(`⚙️ COMPUTING: secret=****${secretInput.slice(-2)}`);

    // 3. Run Groth16 Prover
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs, 
      wasmPath, 
      zkeyPath
    );

    logger("✅ ZK PROOF GENERATED SUCCESSFULLY");
    logger(`📦 PROOF_A[0]: ${proof.pi_a[0].slice(0,10)}...`);

    return {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [
        [proof.pi_b[0][1], proof.pi_b[0][0]], 
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      c: [proof.pi_c[0], proof.pi_c[1]],
      input: [publicSignals[0], publicSignals[1]]
    };

  } catch (error: any) {
    logger("❌ ZK FAILURE: " + error.message);
    throw error;
  }
}