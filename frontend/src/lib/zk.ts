import * as snarkjs from 'snarkjs';

export type ZKProofPayload = {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  input: [string, string];
};

// Update function signature to accept a logger
export async function generateProof(
  secretInput: string, 
  logger: (msg: string) => void // <--- NEW PARAMETER
): Promise<ZKProofPayload> {
  
  logger("🔐 ZK WORKER: Starting calculation...");
  
  const wasmPath = "/zk/whistleblower.wasm";
  const zkeyPath = "/zk/whistleblower_final.zkey";

  try {
    const inputs = {
      secret: secretInput,  
      reportId: "404" 
    };

    logger(`⚙️ INPUTS: secret=****${secretInput.slice(-2)}, reportId=404`);

    // Run Calculation
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs, 
      wasmPath, 
      zkeyPath
    );

    logger("✅ ZK PROOF GENERATED SUCCESSFULLY");
    // Log the first few chars of the proof to look cool
    logger(`📦 PROOF HASH: ${proof.pi_a[0].slice(0,15)}...`);

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