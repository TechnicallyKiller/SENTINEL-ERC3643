pragma circom 2.0.0;

// Import Poseidon Hash (Standard ZK Hash function)
include "../node_modules/circomlib/circuits/poseidon.circom";

template Whistleblower() {
    // ---------------------------------------------------------
    // 1. INPUTS
    // ---------------------------------------------------------
    
    // PRIVATE: The user's secret key (Never revealed)
    signal input secret; 
    
    // PUBLIC: The ID of the violation (e.g., 404)
    // We make this public so the contract knows WHICH violation you are reporting
    signal input reportId; 

    // ---------------------------------------------------------
    // 2. OUTPUTS
    // ---------------------------------------------------------

    // The "Receipt" (Prevents double-reporting the same event)
    signal output nullifierHash;

    // ---------------------------------------------------------
    // 3. LOGIC
    // ---------------------------------------------------------

    // Generate Nullifier (The Unique Receipt)
    // nullifier = Poseidon(secret, reportId)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== reportId;
    nullifierHash <== nullifierHasher.out;
}

// Define Public Inputs 
// We verify the Proof against the 'reportId' and the resulting 'nullifierHash'
component main {public [reportId]} = Whistleblower();