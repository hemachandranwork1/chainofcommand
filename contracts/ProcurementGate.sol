// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentityRegistry {
    function getClearance(address wallet) external view returns (uint8);
    function isActive(address wallet) external view returns (bool);
    function updateLastAccess(address wallet) external;
    function isAnomalyFlagged(address wallet) external view returns (bool);
}

interface IComponentRegistry {
    function getFullHistory(bytes32 componentId) external view returns (
        tuple(
            bytes32 componentId,
            string componentType,
            address manufacturer,
            uint256 manufactureDate,
            address currentOwner,
            uint8 categoryLevel,
            uint256 value,
            bytes32 hardwareRootHash,
            string encryptedIpfsCid,
            bool verified,
            bool compromised,
            bool exists,
            bool isHoneyToken
        ) memory component,
        tuple(address from, address to, uint256 timestamp, bytes32 locationHash, bool verified)[] memory history,
        bool hasGap
    );
}

interface IAuditLog {
    function addEntry(
        string calldata eventType,
        address actor,
        bytes32 componentId,
        string calldata outcome,
        string calldata denialReason,
        string[] calldata anomalyFlags,
        bytes32 locationHash
    ) external returns (uint256);
}

interface ICircuitBreaker {
    function isPaused() external view returns (bool);
}

/// @title ProcurementGate
/// @notice Triple-layer atomic co-verification of human identity, asset authenticity, and device integrity.
/// @dev Formal Invariant: ApprovalGranted CANNOT be emitted unless:
///      1. IdentityRegistry.isActive(officer) == true AND getClearance(officer) >= component.categoryLevel
///      2. ComponentRegistry.getFullHistory(componentId).hasGap == false AND component.compromised == false
///      3. deviceToken is not flagged as compromised
///      This invariant is provable using SMT solvers and defines the security guarantee of the entire system.
contract ProcurementGate {
    IIdentityRegistry public identityRegistry;
    IComponentRegistry public componentRegistry;
    IAuditLog public auditLog;
    ICircuitBreaker public circuitBreaker;

    uint256 public constant HIGH_VALUE_THRESHOLD = 100 ether;
    uint256 public constant RATE_LIMIT_COUNT = 10;
    uint256 public constant RATE_LIMIT_WINDOW = 60;

    mapping(string => bool) public compromisedDeviceTokens;
    mapping(address => uint256[]) private officerApprovalTimestamps;
    mapping(bytes32 => mapping(address => bool)) private secondSignatures;
    mapping(bytes32 => bool) private pendingSecondSignature;

    event ApprovalGranted(
        address indexed officer,
        bytes32 indexed componentId,
        string deviceToken,
        uint256 timestamp,
        bytes32 rootHash
    );

    event ApprovalDenied(
        address indexed officer,
        bytes32 indexed componentId,
        string reason,
        uint256 timestamp,
        bytes32 rootHash
    );

    event DeviceTokenFlagged(string token, uint256 timestamp);
    event SecondSignatureSubmitted(bytes32 indexed componentId, address indexed officer, uint256 timestamp);

    constructor(
        address _identityRegistry,
        address _componentRegistry,
        address _auditLog,
        address _circuitBreaker
    ) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
        componentRegistry = IComponentRegistry(_componentRegistry);
        auditLog = IAuditLog(_auditLog);
        circuitBreaker = ICircuitBreaker(_circuitBreaker);
    }

    function flagDeviceToken(string calldata token) external {
        compromisedDeviceTokens[token] = true;
        emit DeviceTokenFlagged(token, block.timestamp);
    }

    function submitSecondSignature(bytes32 componentId) external {
        require(identityRegistry.isActive(msg.sender), "ProcurementGate: signer not active");
        secondSignatures[componentId][msg.sender] = true;
        emit SecondSignatureSubmitted(componentId, msg.sender, block.timestamp);
    }

    function _checkRateLimit(address officer) internal returns (bool) {
        uint256[] storage timestamps = officerApprovalTimestamps[officer];
        uint256 windowStart = block.timestamp - RATE_LIMIT_WINDOW;
        uint256 recentCount = 0;

        uint256 i = timestamps.length;
        while (i > 0) {
            i--;
            if (timestamps[i] >= windowStart) {
                recentCount++;
            } else {
                break;
            }
        }

        return recentCount < RATE_LIMIT_COUNT;
    }

    function _hasSecondSignature(bytes32 componentId, address primaryOfficer) internal view returns (bool) {
        address[] memory allMembers = new address[](0);
        return secondSignatures[componentId][primaryOfficer];
    }

    function approveProcurement(
        address officer,
        bytes32 componentId,
        string calldata deviceToken,
        bytes32 locationHash
    ) external returns (bool) {
        string[] memory anomalyFlags = new string[](0);

        // Check 1: Circuit breaker
        if (circuitBreaker.isPaused()) {
            _denyAndLog(officer, componentId, "SYSTEM_PAUSED", anomalyFlags, locationHash);
            return false;
        }

        // Check 2: Device token
        if (compromisedDeviceTokens[deviceToken]) {
            _denyAndLog(officer, componentId, "COMPROMISED_DEVICE_TOKEN", anomalyFlags, locationHash);
            return false;
        }

        // Check 3: Officer active status
        if (!identityRegistry.isActive(officer)) {
            _denyAndLog(officer, componentId, "OFFICER_NOT_ACTIVE", anomalyFlags, locationHash);
            return false;
        }

        // Check 4: Anomaly flag on officer
        if (identityRegistry.isAnomalyFlagged(officer)) {
            _denyAndLog(officer, componentId, "OFFICER_ANOMALY_FLAGGED", anomalyFlags, locationHash);
            return false;
        }

        // Check 5: Component history and gap
        (
            IComponentRegistry.component memory comp,
            ,
            bool hasGap
        ) = _getComponentData(componentId);

        if (!comp.exists) {
            _denyAndLog(officer, componentId, "COMPONENT_NOT_FOUND", anomalyFlags, locationHash);
            return false;
        }

        if (comp.compromised) {
            _denyAndLog(officer, componentId, "COMPONENT_COMPROMISED", anomalyFlags, locationHash);
            return false;
        }

        if (hasGap) {
            _denyAndLog(officer, componentId, "SUPPLY_CHAIN_GAP_DETECTED", anomalyFlags, locationHash);
            return false;
        }

        // Check 6: Clearance level
        uint8 clearance = identityRegistry.getClearance(officer);
        if (clearance < comp.categoryLevel) {
            _denyAndLog(officer, componentId, "INSUFFICIENT_CLEARANCE", anomalyFlags, locationHash);
            return false;
        }

        // Check 7: Rate limit
        if (!_checkRateLimit(officer)) {
            _denyAndLog(officer, componentId, "RATE_LIMIT_EXCEEDED", anomalyFlags, locationHash);
            return false;
        }

        // Check 8: High value second signature
        if (comp.value >= HIGH_VALUE_THRESHOLD) {
            if (!secondSignatures[componentId][officer]) {
                pendingSecondSignature[componentId] = true;
                _denyAndLog(officer, componentId, "SECOND_SIGNATURE_REQUIRED", anomalyFlags, locationHash);
                return false;
            }
        }

        // All checks passed - grant approval
        officerApprovalTimestamps[officer].push(block.timestamp);
        identityRegistry.updateLastAccess(officer);

        bytes32 rootHash = keccak256(abi.encodePacked(
            officer, componentId, deviceToken, block.timestamp, "APPROVED"
        ));

        auditLog.addEntry(
            "PROCUREMENT_APPROVED",
            officer,
            componentId,
            "APPROVED",
            "",
            anomalyFlags,
            locationHash
        );

        emit ApprovalGranted(officer, componentId, deviceToken, block.timestamp, rootHash);
        return true;
    }

    function _getComponentData(bytes32 componentId) internal view returns (
        IComponentRegistry.component memory comp,
        IComponentRegistry.Transfer[] memory history,
        bool hasGap
    ) {
        return componentRegistry.getFullHistory(componentId);
    }

    function _denyAndLog(
        address officer,
        bytes32 componentId,
        string memory reason,
        string[] memory anomalyFlags,
        bytes32 locationHash
    ) internal {
        bytes32 rootHash = keccak256(abi.encodePacked(
            officer, componentId, block.timestamp, "DENIED", reason
        ));

        auditLog.addEntry(
            "PROCUREMENT_DENIED",
            officer,
            componentId,
            "DENIED",
            reason,
            anomalyFlags,
            locationHash
        );

        emit ApprovalDenied(officer, componentId, reason, block.timestamp, rootHash);
    }

    function isDeviceTokenCompromised(string calldata token) external view returns (bool) {
        return compromisedDeviceTokens[token];
    }
}
