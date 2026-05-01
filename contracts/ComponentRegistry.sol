// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ComponentRegistry {
    struct Transfer {
        address from;
        address to;
        uint256 timestamp;
        bytes32 locationHash;
        bool verified;
    }

    struct Component {
        bytes32 componentId;
        string componentType;
        address manufacturer;
        uint256 manufactureDate;
        address currentOwner;
        uint8 categoryLevel;
        uint256 value;
        bytes32 hardwareRootHash;
        string encryptedIpfsCid;
        bool verified;
        bool compromised;
        bool exists;
        bool isHoneyToken;
    }

    mapping(bytes32 => Component) private components;
    mapping(bytes32 => Transfer[]) private transferHistories;
    mapping(bytes32 => bytes32[]) private componentsByManufacturer;
    mapping(address => bytes32[]) private manufacturerComponents;

    mapping(string => bytes32) private honeyTokens;
    mapping(bytes32 => string) private honeyTokenSessions;
    mapping(bytes32 => bool) private honeyTokenQueried;

    bytes32[] public allComponentIds;

    event ComponentRegistered(bytes32 indexed componentId, address indexed manufacturer, uint8 categoryLevel, uint256 value);
    event OwnershipTransferred(bytes32 indexed componentId, address indexed from, address indexed to, bytes32 locationHash);
    event ComponentFlagged(bytes32 indexed componentId, string reason);
    event RecursiveRevocationTriggered(address indexed manufacturer, uint256 componentCount);
    event HoneyTokenAlert(string indexed sessionId, bytes32 indexed phantomHash, address caller, uint256 timestamp);

    modifier componentExists(bytes32 componentId) {
        require(components[componentId].exists, "ComponentRegistry: component not found");
        _;
    }

    function registerComponent(
        bytes32 componentId,
        string calldata componentType,
        uint8 categoryLevel,
        uint256 value,
        bytes32 hardwareRootHash,
        string calldata encryptedIpfsCid
    ) external {
        require(!components[componentId].exists, "ComponentRegistry: component already registered");
        require(categoryLevel >= 1 && categoryLevel <= 5, "ComponentRegistry: invalid category");

        components[componentId] = Component({
            componentId: componentId,
            componentType: componentType,
            manufacturer: msg.sender,
            manufactureDate: block.timestamp,
            currentOwner: msg.sender,
            categoryLevel: categoryLevel,
            value: value,
            hardwareRootHash: hardwareRootHash,
            encryptedIpfsCid: encryptedIpfsCid,
            verified: true,
            compromised: false,
            exists: true,
            isHoneyToken: false
        });

        transferHistories[componentId].push(Transfer({
            from: address(0),
            to: msg.sender,
            timestamp: block.timestamp,
            locationHash: bytes32(0),
            verified: true
        }));

        manufacturerComponents[msg.sender].push(componentId);
        allComponentIds.push(componentId);

        emit ComponentRegistered(componentId, msg.sender, categoryLevel, value);
    }

    function transferOwnership(
        bytes32 componentId,
        address to,
        bytes32 locationHash,
        bool verified
    ) external componentExists(componentId) {
        require(components[componentId].currentOwner == msg.sender, "ComponentRegistry: not current owner");

        address from = components[componentId].currentOwner;
        components[componentId].currentOwner = to;

        if (!verified) {
            components[componentId].verified = false;
        }

        transferHistories[componentId].push(Transfer({
            from: from,
            to: to,
            timestamp: block.timestamp,
            locationHash: locationHash,
            verified: verified
        }));

        emit OwnershipTransferred(componentId, from, to, locationHash);
    }

    function flagSuspicious(bytes32 componentId, string calldata reason) external componentExists(componentId) {
        components[componentId].compromised = true;
        components[componentId].verified = false;
        emit ComponentFlagged(componentId, reason);
    }

    function getFullHistory(bytes32 componentId) external view componentExists(componentId) returns (
        Component memory component,
        Transfer[] memory history,
        bool hasGap
    ) {
        component = components[componentId];
        component.isHoneyToken = false;
        history = transferHistories[componentId];

        hasGap = false;
        for (uint256 i = 0; i < history.length; i++) {
            if (!history[i].verified) {
                hasGap = true;
                break;
            }
        }

        return (component, history, hasGap);
    }

    function batchVerify(bytes32[] calldata componentIds) external view returns (
        bool[] memory results,
        bool[] memory gaps
    ) {
        results = new bool[](componentIds.length);
        gaps = new bool[](componentIds.length);

        for (uint256 i = 0; i < componentIds.length; i++) {
            if (!components[componentIds[i]].exists) {
                results[i] = false;
                gaps[i] = false;
                continue;
            }
            results[i] = components[componentIds[i]].verified && !components[componentIds[i]].compromised;
            Transfer[] memory history = transferHistories[componentIds[i]];
            for (uint256 j = 0; j < history.length; j++) {
                if (!history[j].verified) {
                    gaps[i] = true;
                    break;
                }
            }
        }
    }

    function recursiveRevocation(address manufacturer) external {
        bytes32[] memory mComponents = manufacturerComponents[manufacturer];
        for (uint256 i = 0; i < mComponents.length; i++) {
            if (components[mComponents[i]].exists) {
                components[mComponents[i]].compromised = true;
                components[mComponents[i]].verified = false;
                emit ComponentFlagged(mComponents[i], "Recursive revocation: manufacturer compromised");
            }
        }
        emit RecursiveRevocationTriggered(manufacturer, mComponents.length);
    }

    function generateHoneyToken(string calldata sessionId) external returns (bytes32) {
        bytes32 phantomHash = keccak256(abi.encodePacked(sessionId, block.timestamp, block.prevrandao, msg.sender));
        honeyTokens[sessionId] = phantomHash;
        honeyTokenSessions[phantomHash] = sessionId;
        honeyTokenQueried[phantomHash] = false;
        return phantomHash;
    }

    function queryHoneyToken(string calldata sessionId, bytes32 hash) external returns (bool isLegitimate) {
        bytes32 storedHash = honeyTokens[sessionId];
        if (storedHash != hash) {
            emit HoneyTokenAlert(sessionId, hash, msg.sender, block.timestamp);
            return false;
        }
        string memory originalSession = honeyTokenSessions[hash];
        if (keccak256(bytes(originalSession)) != keccak256(bytes(sessionId))) {
            emit HoneyTokenAlert(sessionId, hash, msg.sender, block.timestamp);
            return false;
        }
        if (honeyTokenQueried[hash]) {
            emit HoneyTokenAlert(sessionId, hash, msg.sender, block.timestamp);
            return false;
        }
        honeyTokenQueried[hash] = true;
        return true;
    }

    function getComponentBasic(bytes32 componentId) external view componentExists(componentId) returns (
        string memory componentType,
        address manufacturer,
        address currentOwner,
        uint8 categoryLevel,
        uint256 value,
        bool verified,
        bool compromised
    ) {
        Component memory c = components[componentId];
        return (c.componentType, c.manufacturer, c.currentOwner, c.categoryLevel, c.value, c.verified, c.compromised);
    }

    function getManufacturerComponents(address manufacturer) external view returns (bytes32[] memory) {
        return manufacturerComponents[manufacturer];
    }

    function getTotalComponents() external view returns (uint256) {
        return allComponentIds.length;
    }
}
