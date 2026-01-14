// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@erc-3643/contracts/compliance/modular/IModularCompliance.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@erc-3643/contracts/token/IToken.sol";

interface ISignatureRegistry {
    function getScore(address) external view returns (uint256);
}

interface IVerifier {
    function verifyProof(uint[2] calldata a, uint[2][2] calldata b, uint[2] calldata c, uint[2] calldata input) external view returns (bool);
}

contract SentinelCompliance is IModularCompliance, Ownable {

    address public _tokenBound;
    address public oracleAddress;
    address public verifierAddress;
    address public inspectorAddress;

    mapping(address => bool) public isFrozen;
    mapping(address => uint256) public s_violationCount;
    mapping(uint256 => bool) public s_usedNullifiers;
    mapping(uint256 => uint256) public s_escrowedBonds; 
    mapping(uint256 => address) public s_reporters;      

    uint256 public constant PENALTY_PER_STRIKE = 50; 
    uint256 public constant MIN_SCORE_TO_SURVIVE = 300;
    uint256 public constant SCORE_FOR_UNLIMITED = 700;    
    uint256 public constant REPORT_BOND = 0.001 ether;

    event AssetFrozen(address indexed user, string reason);
    event AssetUnfrozen(address indexed user, string reason);
    event StrikeReceived(address indexed user, uint256 newCount);
    event ReportSubmitted(uint256 indexed receiptHash, address reporter, uint256 bond);
    event ReportResolved(uint256 indexed receiptHash, bool isValid, string verdict);
    event OracleUpdated(address newOracle);

    error InvalidAddress();
    error InsufficientStake();
    error TransferFailed();

    modifier onlyOracle() { require(msg.sender == oracleAddress, "Only Oracle"); _; }
    modifier onlyToken() { require(msg.sender == _tokenBound, "Only Token"); _; }
    modifier onlyInspector() { require(msg.sender == inspectorAddress || msg.sender == owner(), "Only Inspector"); _; }

    constructor(address _oracle, address _verifier) {
        if (_oracle == address(0) || _verifier == address(0)) revert InvalidAddress();
        oracleAddress = _oracle;
        verifierAddress = _verifier;
        inspectorAddress = msg.sender;
    }

    // OPTIMIZATION: Use 'calldata' for array inputs to save gas on copying
    function reportViolationZK(
        address _badActor,
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[2] calldata input
    ) external payable {
        if (msg.value < REPORT_BOND) revert InsufficientStake();

        // Note: IVerifier might need 'memory' in interface. If needed, cast here.
        // But for pure gas, calldata input is best if Verifier supports it.
        require(IVerifier(verifierAddress).verifyProof(a, b, c, input), "Invalid ZK Proof");
        
        uint256 receiptNullifier = input[0];
        require(!s_usedNullifiers[receiptNullifier], "Receipt already used");
        
        s_usedNullifiers[receiptNullifier] = true;
        s_escrowedBonds[receiptNullifier] = msg.value;
        s_reporters[receiptNullifier] = msg.sender;
        
        // OPTIMIZATION: Unchecked math for counter (saves gas)
        unchecked {
            s_violationCount[_badActor]++;
        }
        
        if (calculateEffectiveScore(_badActor) < MIN_SCORE_TO_SURVIVE) {
             isFrozen[_badActor] = true; 
             emit AssetFrozen(_badActor, "Score dropped below threshold");
        }

        emit ReportSubmitted(receiptNullifier, msg.sender, msg.value);
        emit StrikeReceived(_badActor, s_violationCount[_badActor]);
    }

    function resolveIncident(uint256 _receiptHash, bool _isValid) external onlyInspector {
        uint256 bond = s_escrowedBonds[_receiptHash];
        address reporter = s_reporters[_receiptHash];
        require(bond > 0, "No bond found");

        // SECURITY FIX: Effects BEFORE Interactions (CEI Pattern)
        // 1. Update State
        s_escrowedBonds[_receiptHash] = 0; 

        // 2. Interact (Transfer)
        address recipient = _isValid ? reporter : owner();
        
        (bool success, ) = recipient.call{value: bond}("");
        if (!success) revert TransferFailed();

        emit ReportResolved(_receiptHash, _isValid, _isValid ? "Bond Refunded" : "Bond Slashed");
    }

    // ... (Rest of functions remain same, updateFranchiseStatus, calculateEffectiveScore, canTransfer etc.) ...

    function updateFranchiseStatus(address _target, bool _shouldFreeze) external onlyOracle {
        isFrozen[_target] = _shouldFreeze;
        if(_shouldFreeze) emit AssetFrozen(_target, "IoT Sensor Triggered");
        else emit AssetUnfrozen(_target, "IoT Sensor Normal");
    }

    function calculateEffectiveScore(address _user) public view returns (uint256){
        address registry = address(IToken(_tokenBound).identityRegistry());
        try ISignatureRegistry(registry).getScore(_user) returns (uint256 base) {
            uint256 penalty = s_violationCount[_user] * PENALTY_PER_STRIKE;
            if (penalty >= base) return 0;
            return base - penalty;
        } catch { return 0; }
    }

    // ERC-3643 Core Logic
    function canTransfer(address _from, address _to, uint256 _value) external view override returns (bool) {
        if (_from != address(0)) {
            if (isFrozen[_from]) return false;
            if (calculateEffectiveScore(_from) < MIN_SCORE_TO_SURVIVE) return false;
        }

        uint256 receiverScore = calculateEffectiveScore(_to);
        if (receiverScore < MIN_SCORE_TO_SURVIVE) return false;    

        if (receiverScore < SCORE_FOR_UNLIMITED) {
            uint256 currentBalance = IToken(_tokenBound).balanceOf(_to);
            if (currentBalance + _value > 1) return false; 
        }
        return true;
    }

    // Boilerplate ...
    function bindToken(address _token) external override { _tokenBound = _token; }
    function unbindToken(address _token) external override { _tokenBound = address(0); }
    function isModuleBound(address) external view override returns (bool) { return false; }
    function transferred(address, address, uint256) external override onlyToken {}
    function created(address, uint256) external override onlyToken {}
    function destroyed(address, uint256) external override onlyToken {}
    function addModule(address) external override {}
    function removeModule(address) external override {}
    function callModuleFunction(bytes calldata, address) external override {}
    function getModules() external view override returns (address[] memory) { return new address[](0); }
    function getTokenBound() external view override returns (address) { return _tokenBound; }
    function setOracle(address _n) external onlyOwner { oracleAddress = _n; emit OracleUpdated(_n); }
    function setInspector(address _n) external onlyOwner { inspectorAddress = _n; }
}