// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "forge-std/Script.sol";
import "../src/SentinelToken.sol";
import "../src/SignatureRegistry.sol";
import "../src/SentinelCompliance.sol";
import "../src/Verifier.sol"; // Ensure you have this file in src/

contract DeploySentinel is Script {
    function run() external {
        // 1. Setup Environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // ----------------------------------------
        // Step 1: Deploy Dependencies
        // ----------------------------------------
        
        // A. Deploy Verifier (Mock for now)
        Groth16Verifier verifier = new Groth16Verifier();
        console.log("Verifier deployed at:", address(verifier));

        // B. Deploy Registry
        SignatureRegistry registry = new SignatureRegistry();
        console.log("Registry deployed at:", address(registry));

        // C. Deploy Compliance
        // Note: We set 'deployer' as the initial Oracle so you can test it manually
        SentinelCompliance compliance = new SentinelCompliance(deployer, address(verifier));
        console.log("Compliance deployed at:", address(compliance));

        // ----------------------------------------
        // Step 2: Deploy & Configure Token
        // ----------------------------------------

        // D. Deploy Token
        SentinelToken token = new SentinelToken();
        console.log("Token deployed at:", address(token));

        // E. Initialize Token
        // _onchainID is set to 'deployer' as a placeholder
        token.init(
            address(registry),
            address(compliance),
            "Sentinel License",
            "SENT",
            0, 
            deployer 
        );
        console.log("Token Initialized.");

        // F. Add Deployer as Agent (To allow minting)
        token.addAgent(deployer);
        console.log("Agent Added.");

        // G. Unpause (Open for business)
        token.unpause();
        console.log("Token Unpaused.");

        vm.stopBroadcast();
    }
}