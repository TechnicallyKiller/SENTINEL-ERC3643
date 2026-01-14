// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SignatureRegistry is Ownable {
    using ECDSA for bytes32;

    
    struct Franchise {
        uint248 score; // 0 to 400/800 fits easily in 248 bits
        bool isVerified;
    }

    mapping(address => Franchise) public franchises;

    event SignerApproved(address indexed signer);
    event SignerRevoked(address indexed signer);
    event ScoreUpdated(address indexed user, uint256 newScore);

    error SignerAlreadyApproved(address signer);
    error SignerNotApproved(address signer);
    error NotOwner(address signer);

    constructor() {}

    function registerFranchise() external {
        if (franchises[msg.sender].isVerified) {
            revert SignerAlreadyApproved(msg.sender);
        }

        // OPTIMIZATION: One SSTORE instead of two
        franchises[msg.sender] = Franchise({
            score: 400,
            isVerified: true
        });
        
        emit SignerApproved(msg.sender);
        emit ScoreUpdated(msg.sender, 400);
    }

    function registerWithTicket(bytes calldata signature, uint248 _baseScore) external {
        if (franchises[msg.sender].isVerified) {
            revert SignerAlreadyApproved(msg.sender);
        }

        bytes32 messageHash = keccak256(abi.encode("Verify:", msg.sender, ":", _baseScore));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        if (ethSignedMessageHash.recover(signature) != owner()) {
            revert NotOwner(msg.sender);
        }
        
        franchises[msg.sender] = Franchise({
            score: _baseScore,
            isVerified: true
        });

        emit SignerApproved(msg.sender);
        emit ScoreUpdated(msg.sender, _baseScore);
    }

    function addSigner(address signer, uint248 _baseScore) external onlyOwner {
        if (franchises[signer].isVerified) revert SignerAlreadyApproved(signer);
        
        franchises[signer] = Franchise({
            score: _baseScore,
            isVerified: true
        });
        
        emit SignerApproved(signer);
        emit ScoreUpdated(signer, _baseScore);
    }

    function revokeSigner(address signer) external onlyOwner {
        if (!franchises[signer].isVerified) revert SignerNotApproved(signer);
        
        delete franchises[signer]; // Refunds gas
        emit SignerRevoked(signer);
    }

    // --- VIEW FUNCTIONS ---
    function getScore(address _user) external view returns (uint256) {
        return uint256(franchises[_user].score);
    }

    function isVerified(address _user) external view returns (bool) {
        return franchises[_user].isVerified;
    }

    // ERC-3643 Placeholders
    function identity(address) external pure returns (address) { return address(0); }
    function investorCountry(address) external pure returns (uint16) { return 0; } 
}