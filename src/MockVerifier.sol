// src/MockVerifier.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract MockVerifier {
    function verifyProof(uint[2] memory, uint[2][2] memory, uint[2] memory, uint[1] memory) external pure returns (bool) {
        return true;
    }
}