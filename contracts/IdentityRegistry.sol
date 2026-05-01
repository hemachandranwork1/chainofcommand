// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGovernanceMultiSig {
    function isApprovedAction(bytes32 actionHash) external view returns (bool);
    function isCommander(address account) external view returns (bool);
}

contract IdentityRegistry {
    IGovernanceMultiSig public governance;

    enum Rank { SOLDIER, JUNIOR_OFFICER, PROCUREMENT_OFFICER, COMMANDER, AUDITOR }

    struct Soldier {
        address wallet;
        Rank rank;
        uint8 clearanceLevel;
        bool active;
        uint256 registrationTimestamp;
        uint256 lastAccessTimestamp;
        string didReference;
        bool exists;
    }

    mapping(address => Soldier) private soldiers;
    mapping(address => bool) public anomalyFlagged;
    address[] public soldierList;

    event SoldierRegistered(address indexed wallet, Rank rank, uint8 clearanceLevel, uint256 timestamp);
    event SoldierRevoked(address indexed wallet, uint256 timestamp, string reason);
    event ClearanceUpdated(address indexed wallet, uint8 oldLevel, uint8 newLevel, uint256 timestamp);
    event LastAccessUpdated(address indexed wallet, uint256 timestamp);
    event AnomalyFlagged(address indexed wallet, bool flagged);

    modifier onlyGovernance() {
        require(msg.sender == address(governance), "IdentityRegistry: caller is not governance");
        _;
    }

    modifier onlyActiveCommanders(address caller) {
        require(governance.isCommander(caller), "IdentityRegistry: caller is not commander");
        require(soldiers[caller].active, "IdentityRegistry: commander not active");
        _;
    }

    constructor(address _governance) {
        governance = IGovernanceMultiSig(_governance);
    }

    function registerSoldier(
        address wallet,
        Rank rank,
        uint8 clearanceLevel,
        string calldata didReference
    ) external onlyGovernance {
        require(!soldiers[wallet].exists, "IdentityRegistry: soldier already registered");
        require(clearanceLevel >= 1 && clearanceLevel <= 5, "IdentityRegistry: invalid clearance level");

        soldiers[wallet] = Soldier({
            wallet: wallet,
            rank: rank,
            clearanceLevel: clearanceLevel,
            active: true,
            registrationTimestamp: block.timestamp,
            lastAccessTimestamp: block.timestamp,
            didReference: didReference,
            exists: true
        });

        soldierList.push(wallet);
        emit SoldierRegistered(wallet, rank, clearanceLevel, block.timestamp);
    }

    function revokeSoldier(address wallet, string calldata reason) external onlyGovernance {
        require(soldiers[wallet].exists, "IdentityRegistry: soldier not found");
        soldiers[wallet].active = false;
        emit SoldierRevoked(wallet, block.timestamp, reason);
    }

    function emergencyRevoke(address wallet, address commander1, address commander2) external {
        require(governance.isCommander(commander1), "IdentityRegistry: commander1 not valid");
        require(governance.isCommander(commander2), "IdentityRegistry: commander2 not valid");
        require(commander1 != commander2, "IdentityRegistry: same commander");
        require(soldiers[wallet].exists, "IdentityRegistry: soldier not found");
        soldiers[wallet].active = false;
        emit SoldierRevoked(wallet, block.timestamp, "Emergency revocation by commander quorum");
    }

    function updateClearance(address wallet, uint8 newLevel) external onlyGovernance {
        require(soldiers[wallet].exists, "IdentityRegistry: soldier not found");
        require(newLevel >= 1 && newLevel <= 5, "IdentityRegistry: invalid clearance level");
        uint8 oldLevel = soldiers[wallet].clearanceLevel;
        soldiers[wallet].clearanceLevel = newLevel;
        emit ClearanceUpdated(wallet, oldLevel, newLevel, block.timestamp);
    }

    function updateLastAccess(address wallet) external {
        require(soldiers[wallet].exists, "IdentityRegistry: soldier not found");
        require(soldiers[wallet].active, "IdentityRegistry: soldier not active");
        soldiers[wallet].lastAccessTimestamp = block.timestamp;
        emit LastAccessUpdated(wallet, block.timestamp);
    }

    function setAnomalyFlag(address wallet, bool flagged) external {
        require(msg.sender == address(governance) || governance.isCommander(msg.sender),
            "IdentityRegistry: unauthorized");
        anomalyFlagged[wallet] = flagged;
        emit AnomalyFlagged(wallet, flagged);
    }

    function getClearance(address wallet) external view returns (uint8) {
        require(soldiers[wallet].exists, "IdentityRegistry: soldier not found");
        return soldiers[wallet].clearanceLevel;
    }

    function isActive(address wallet) external view returns (bool) {
        if (!soldiers[wallet].exists) return false;
        return soldiers[wallet].active;
    }

    function getSoldier(address wallet) external view returns (
        Rank rank,
        uint8 clearanceLevel,
        bool active,
        uint256 registrationTimestamp,
        uint256 lastAccessTimestamp,
        string memory didReference
    ) {
        require(soldiers[wallet].exists, "IdentityRegistry: soldier not found");
        Soldier memory s = soldiers[wallet];
        return (s.rank, s.clearanceLevel, s.active, s.registrationTimestamp, s.lastAccessTimestamp, s.didReference);
    }

    function isAnomalyFlagged(address wallet) external view returns (bool) {
        return anomalyFlagged[wallet];
    }

    function getSoldierCount() external view returns (uint256) {
        return soldierList.length;
    }
}
