// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// Import the T-REX Token implementation
import "@erc-3643/contracts/token/Token.sol";

contract SentinelToken is Token {
    
    // We leave the constructor empty because the logic uses "init()"
    // defined in the parent contract.
    constructor() {}
}