// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuditLog {
    address public procurementGate;
    uint256 public entryCount;

    struct LogEntry {
        uint256 index;
        string eventType;
        address actor;
        bytes32 componentId;
        uint256 timestamp;
        uint256 blockNumber;
        string outcome;
        string denialReason;
        string[] anomalyFlags;
        bytes32 locationHash;
        bytes32 rootHash;
    }

    mapping(uint256 => bytes32) public entryRootHashes;

    event LogEntryAdded(
        uint256 indexed index,
        string eventType,
        address indexed actor,
        bytes32 indexed componentId,
        uint256 timestamp,
        uint256 blockNumber,
        string outcome,
        string denialReason,
        string[] anomalyFlags,
        bytes32 locationHash,
        bytes32 rootHash
    );

    event ProcurementGateSet(address indexed gate);

    modifier onlyProcurementGate() {
        require(msg.sender == procurementGate, "AuditLog: caller is not ProcurementGate");
        _;
    }

    constructor(address _procurementGate) {
        procurementGate = _procurementGate;
        emit ProcurementGateSet(_procurementGate);
    }

    function setProcurementGate(address _gate) external {
        require(procurementGate == address(0) || procurementGate == msg.sender, "AuditLog: unauthorized");
        procurementGate = _gate;
        emit ProcurementGateSet(_gate);
    }

    function addEntry(
        string calldata eventType,
        address actor,
        bytes32 componentId,
        string calldata outcome,
        string calldata denialReason,
        string[] calldata anomalyFlags,
        bytes32 locationHash
    ) external onlyProcurementGate returns (uint256) {
        bytes32 rootHash = keccak256(abi.encodePacked(
            eventType,
            actor,
            componentId,
            block.timestamp,
            block.number,
            outcome,
            denialReason,
            locationHash
        ));

        uint256 index = entryCount;
        entryRootHashes[index] = rootHash;
        entryCount++;

        emit LogEntryAdded(
            index,
            eventType,
            actor,
            componentId,
            block.timestamp,
            block.number,
            outcome,
            denialReason,
            anomalyFlags,
            locationHash,
            rootHash
        );

        return index;
    }

    function getRootHash(uint256 index) external view returns (bytes32) {
        require(index < entryCount, "AuditLog: index out of bounds");
        return entryRootHashes[index];
    }

    function verifyEntry(
        uint256 index,
        string calldata eventType,
        address actor,
        bytes32 componentId,
        uint256 timestamp,
        uint256 blockNumber,
        string calldata outcome,
        string calldata denialReason,
        bytes32 locationHash
    ) external view returns (bool) {
        require(index < entryCount, "AuditLog: index out of bounds");
        bytes32 computedHash = keccak256(abi.encodePacked(
            eventType,
            actor,
            componentId,
            timestamp,
            blockNumber,
            outcome,
            denialReason,
            locationHash
        ));
        return computedHash == entryRootHashes[index];
    }
}
