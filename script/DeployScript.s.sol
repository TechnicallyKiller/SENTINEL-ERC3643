// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "forge-std/Script.sol";
import "../src/SentinelToken.sol";
import "../src/SignatureRegistry.sol";
import "../src/SentinelCompliance.sol";
import "../src/Verifier.sol"; 
// REMOVED: import "../src/SentinelIoTAdapter.sol"; <--- Caused the version crash

contract DeploySentinel is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("-----------------------------------------");
        console.log(" STARTING HYBRID DEPLOYMENT");
        console.log("-----------------------------------------");

        // 1. Deploy Core (0.8.17 Compatible)
        Groth16Verifier verifier = new Groth16Verifier();
        console.log(" Verifier deployed:", address(verifier));

        SignatureRegistry registry = new SignatureRegistry();
        console.log(" Registry deployed:", address(registry));

        SentinelCompliance compliance = new SentinelCompliance(deployer, address(verifier));
        console.log(" Compliance deployed:", address(compliance));

        // 2. Deploy IoT Adapter (0.8.19) - USING CHEATCODE
        address router = 0xf9B8fc078197181C841c296C876945aaa425B278;
        bytes32 donId = 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000;
        uint64 subId = 548; 

   
        bytes memory args = abi.encode(router, donId, subId, address(compliance));
        
       
        address adapter = deployCode("SentinelIoTAdapter", args);
        console.log(" IoT Adapter deployed:", adapter);

        // 3. Deploy Token
        SentinelToken token = new SentinelToken();
        console.log(" Token deployed:", address(token));

        token.init(
            address(registry),
            address(compliance),
            "Sentinel License",
            "SENT",
            0, 
            deployer 
        );
        console.log(" Token Initialized");

        // 4. Wiring
        token.addAgent(deployer);
        token.unpause();
        
        compliance.bindToken(address(token));
        compliance.setOracle(adapter); // Link to the cheatcode-deployed address
        console.log(" Wiring Complete");

        vm.stopBroadcast();
    }
}