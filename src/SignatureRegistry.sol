// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.17;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SignatureRegistry is Ownable {
    using ECDSA for bytes32;

    mapping (address => bool) public approvedSigners;
    mapping (address => uint256) public baseScore;

    event SignerApproved(address indexed signer);
    event SignerRevoked(address indexed signer);
    event ScoreUpdated(address indexed user, uint256 newScore);

    error SignerAlreadyApproved(address signer);
    error SignerNotApproved(address signer);
    error NotOwner(address signer);
    constructor() {}

    function registerWithTicket(bytes calldata signature, uint256 _baseScore) external {
        if(approvedSigners[msg.sender]){
            revert SignerAlreadyApproved(msg.sender);
        }

        bytes32 messageHash = keccak256(abi.encode("Verify:", msg.sender, ":", _baseScore));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        if(signer != owner()){
            revert NotOwner(signer);
        }
        baseScore[msg.sender] = _baseScore;
        approvedSigners[msg.sender] = true;
        emit SignerApproved(msg.sender);
    }

    function addSigner(address signer, uint256 _baseScore) external onlyOwner {
        if(approvedSigners[signer]){
            revert SignerAlreadyApproved(signer);
        }
        baseScore[signer] = _baseScore;
        approvedSigners[signer] = true;
        emit SignerApproved(signer);
    }

    function revokeSigner(address signer) external onlyOwner {
        if(!approvedSigners[signer]){
            revert SignerNotApproved(signer);
        }
        approvedSigners[signer] = false;
        emit SignerRevoked(signer);
    }

    function getScore(address _user) external view returns (uint256) {
        return baseScore[_user];
    }

    function isVerified(address _user) external view returns (bool) {
        return approvedSigners[_user];
    }
    function identity(address) external pure returns (address) { return address(0); }
    function investorCountry(address) external pure returns (uint16) { return 0; } 

}