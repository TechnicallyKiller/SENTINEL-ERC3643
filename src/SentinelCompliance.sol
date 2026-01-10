// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@erc-3643/contracts/compliance/modular/IModularCompliance.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SentinelCompliance is IModularCompliance, Ownable {

    // IoT STATE
    address public oracleAddress;
    mapping(address => bool) public isFrozen;
    address public _tokenBound;

    event LicenseFrozen(address indexed franchise, string reason);
    event LicenseRestored(address indexed franchise);

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Only Oracle");
        _;
    }

    modifier onlyToken() {
        require(msg.sender == _tokenBound, "Only Token");
        _;
    }

    constructor(address _oracle) {
        oracleAddress = _oracle;
    }

    // --- IoT LOGIC ---
    
    function updateFranchiseStatus(address _franchise, bool _status, string memory _reason) external onlyOracle {
        isFrozen[_franchise] = _status;
        if (_status) {
            emit LicenseFrozen(_franchise, _reason);
        } else {
            emit LicenseRestored(_franchise);
        }
    }

    function canTransfer(address _from, address _to, uint256 /* value */) external view override returns (bool) {
        if (isFrozen[_from]) return false; // Block frozen senders
        if (isFrozen[_to]) return false;   // Block frozen receivers
        return true;
    }

    // --- BOILERPLATE (Required by Token.sol) ---
    function bindToken(address _token) external override {
        _tokenBound = _token;
        emit TokenBound(_token);
    }

    function unbindToken(address _token) external override {
        _tokenBound = address(0);
        emit TokenUnbound(_token);
    }

    // Empty hooks to satisfy interface
    function transferred(address, address, uint256) external override onlyToken {}
    function created(address, uint256) external override onlyToken {}
    function destroyed(address, uint256) external override onlyToken {}
    function addModule(address) external override {}
    function removeModule(address) external override {}
    function callModuleFunction(bytes calldata, address) external override {}
    function isModuleBound(address) external view override returns (bool) { return false; }
    function getModules() external view override returns (address[] memory) { return new address[](0); }
    function getTokenBound() external view override returns (address) { return _tokenBound; }
}