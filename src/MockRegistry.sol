// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract MockRegistry {
    // Defines that everyone is "Verified" so we can test transfers easily
    function isVerified(address) external pure returns (bool) {
        return true;
    }
    
    // Boilerplate to satisfy interface checks if needed
    function identity(address) external pure returns (address) {
        return address(0);
    }
    function investorCountry(address) external pure returns (uint16) {
        return 0;
    }
}