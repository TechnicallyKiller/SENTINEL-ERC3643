// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@erc-3643/contracts/compliance/modular/IModularCompliance.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@erc-3643/contracts/token/IToken.sol";

interface ISignatureRegistry {
    function getScore(address) external view returns (uint256);
}

interface IVerifier {
    function verifyProof(uint[2] memory a, uint[2][2] memory b, uint[2] memory c, uint[1] memory input) external view returns (bool);
}

contract SentinelCompliance is IModularCompliance, Ownable {

    address public _tokenBound;
    address public oracleAddress;
    address public verifierAddress;

    mapping(address => bool) public isFrozen;
    mapping(address => uint256) public s_violationCount;
    mapping(uint256 => bool) public s_usedNullifiers;

    uint256 public constant PENALTY_PER_STRIKE = 50; 
    uint256 public constant MIN_SCORE_TO_SURVIVE = 300;
    uint256 public constant SCORE_FOR_UNLIMITED = 700;    

    event AssetFrozen(address indexed user, string reason);
    event StrikeReceived(address indexed user, uint256 newPenaltyCount);
    event OracleUpdated(address newOracle);

    error InvalidAddress();

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Only Oracle");
        _;
    }

    modifier onlyToken() {
        require(msg.sender == _tokenBound, "Only Token");
        _;
    }

    constructor(address _oracle, address _verifier) {
        if (_oracle == address(0) || _verifier == address(0)) {
            revert InvalidAddress();
        }
        oracleAddress = _oracle;
        verifierAddress = _verifier;
    }

    function reportViolationZK(
        address _badActor,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[1] memory input
    ) external {
        require(IVerifier(verifierAddress).verifyProof(a, b, c, input), "Invalid ZK Proof");
        require(!s_usedNullifiers[input[0]], "Receipt already used");
        s_usedNullifiers[input[0]] = true;

        s_violationCount[_badActor]++;
        emit StrikeReceived(_badActor, s_violationCount[_badActor]);
    }

    function updateFranchiseStatus(address _target, bool _status) external onlyOracle {
        isFrozen[_target] = _status;
        if(_status) emit AssetFrozen(_target, "Chainlink IoT Triggered");
    }

    function calculateEffectiveScore(address _user) public view returns (uint256){
        address registry= address(IToken(_tokenBound).identityRegistry());
        try ISignatureRegistry(registry).getScore(_user) returns (uint256 base) {
            uint256 penalty = s_violationCount[_user] * PENALTY_PER_STRIKE;
            
            if (penalty >= base) {
                return 0;
            }
            return base - penalty;
        } catch {
            return 0;
        }
    }

    function canTransfer(address _from, address _to, uint256 _value) external view override returns (bool) {
        // --- FIX: ALLOW MINTING (Ignore Sender if 0x0) ---
        if (_from != address(0)) {
            // A. Chainlink Override
            if (isFrozen[_from]) return false;

            // B. Check SENDER's Score
            if (calculateEffectiveScore(_from) < MIN_SCORE_TO_SURVIVE) return false;
        }

        // --- CHECK RECEIVER (Always check this) ---
        
        // C. Check RECEIVER's Score
        uint256 receiverScore = calculateEffectiveScore(_to);
        if (receiverScore < MIN_SCORE_TO_SURVIVE) return false;    

        // D. Cap Check for Average Users
        if (receiverScore < SCORE_FOR_UNLIMITED) {
            uint256 currentBalance = IToken(_tokenBound).balanceOf(_to);
            if (currentBalance + _value > 1) return false; 
        }

        return true;
    }

    function bindToken(address _token) external override {
        if(_token == address(0)) { revert InvalidAddress(); }
        _tokenBound = _token;
        emit TokenBound(_token);
    }

    function unbindToken(address _token) external override {
        _tokenBound = address(0);
        emit TokenUnbound(_token);
    }

    function transferred(address, address, uint256) external override onlyToken {}
    function created(address, uint256) external override onlyToken {}
    function destroyed(address, uint256) external override onlyToken {}
    function addModule(address) external override {}
    function removeModule(address) external override {}
    function callModuleFunction(bytes calldata, address) external override {}
    function isModuleBound(address) external view override returns (bool) { return false; }
    function getModules() external view override returns (address[] memory) { return new address[](0); }
    function getTokenBound() external view override returns (address) { return _tokenBound; }
    
    function setOracle(address _newOracle) external onlyOwner {
        if (_newOracle == address(0)) { revert InvalidAddress(); } 
        oracleAddress = _newOracle;
        emit OracleUpdated(_newOracle);
    }
}