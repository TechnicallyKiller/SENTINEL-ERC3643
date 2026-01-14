// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

interface ISentinelCompliance {
    function updateFranchiseStatus(address _target, bool _status) external;
}

contract SentinelIoTAdapter is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    address public complianceContract;
    bytes32 public donId; // The ID of the Chainlink Network
    uint64 public subscriptionId; // Your billing ID
    uint32 public gasLimit = 300000;

    // Mapping: Request ID => Franchise Owner Address
    mapping(bytes32 => address) public pendingRequests;

    event IoTRequestSent(bytes32 indexed requestId, address indexed franchise);
    event IoTResultReceived(bytes32 indexed requestId, bool isFrozen);
    event IoTError(bytes32 indexed requestId, bytes err);

    constructor(
        address _router, 
        bytes32 _donId, 
        uint64 _subId,
        address _compliance
    ) FunctionsClient(_router) ConfirmedOwner(msg.sender) {
        donId = _donId;
        subscriptionId = _subId;
        complianceContract = _compliance;
    }

    
    function checkSensors(
        address _franchise,
        string calldata _sourceCode, // The JS code to run
        string[] calldata _args // Args (e.g., SensorID)
    ) external onlyOwner returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(_sourceCode);
        if (_args.length > 0) req.setArgs(_args);

        requestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
        
        pendingRequests[requestId] = _franchise;
        emit IoTRequestSent(requestId, _franchise);
        return requestId;
    }

    // 2. CALLBACK: Chainlink calls this with the result
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        address franchise = pendingRequests[requestId];
        require(franchise != address(0), "Request not found");

        if (err.length > 0) {
            emit IoTError(requestId, err);
            return; // Don't freeze on error, just log it
        }

        
        bool shouldFreeze = (uint8(response[0]) == 1); 

        // 3. ACTION: Update the Compliance Contract
        ISentinelCompliance(complianceContract).updateFranchiseStatus(franchise, shouldFreeze);
        
        emit IoTResultReceived(requestId, shouldFreeze);
        delete pendingRequests[requestId]; 
    }
    
    function updateConfig(uint64 _subId, uint32 _gas) external onlyOwner {
        subscriptionId = _subId;
        gasLimit = _gas;
    }
}