// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentityRegistry {
    function registerSoldier(address wallet, uint8 rank, uint8 clearanceLevel, string calldata didReference) external;
    function revokeSoldier(address wallet, string calldata reason) external;
    function updateClearance(address wallet, uint8 newLevel) external;
}

interface ICircuitBreaker {
    function pause() external;
    function unpause() external;
}

contract GovernanceMultiSig {
    enum Role { COMMANDER, AUDITOR, PROCUREMENT_COMMAND }
    enum ActionType { REGISTER_SOLDIER, REVOKE_SOLDIER, UPDATE_CLEARANCE, PAUSE_SYSTEM, UNPAUSE_SYSTEM }
    enum ProposalStatus { PENDING, EXECUTED, REVOKED, EXPIRED }

    struct Proposal {
        uint256 id;
        ActionType actionType;
        address proposer;
        address targetAddress;
        uint8 clearanceLevel;
        uint8 rank;
        string didReference;
        string reason;
        uint256 voteCount;
        uint256 createdAt;
        ProposalStatus status;
        mapping(address => bool) hasVoted;
    }

    mapping(address => Role) public roles;
    mapping(address => bool) public isGovernanceMember;
    mapping(uint256 => Proposal) public proposals;
    address[] public members;
    uint256 public proposalCount;
    uint256 public constant REQUIRED_VOTES = 2;
    uint256 public constant PROPOSAL_EXPIRY = 7 days;

    address public identityRegistry;
    address public circuitBreaker;

    event ProposalCreated(uint256 indexed id, ActionType actionType, address indexed proposer, address targetAddress);
    event VoteCast(uint256 indexed id, address indexed voter, uint256 voteCount);
    event ProposalExecuted(uint256 indexed id, ActionType actionType, address indexed targetAddress);
    event ProposalRevoked(uint256 indexed id, address indexed revoker);
    event MemberAdded(address indexed member, Role role);

    modifier onlyMember() {
        require(isGovernanceMember[msg.sender], "GovernanceMultiSig: not a member");
        _;
    }

    constructor(
        address commander,
        address auditor,
        address procurementCommand
    ) {
        _addMember(commander, Role.COMMANDER);
        _addMember(auditor, Role.AUDITOR);
        _addMember(procurementCommand, Role.PROCUREMENT_COMMAND);
    }

    function _addMember(address member, Role role) internal {
        roles[member] = role;
        isGovernanceMember[member] = true;
        members.push(member);
        emit MemberAdded(member, role);
    }

    function setContracts(address _identityRegistry, address _circuitBreaker) external onlyMember {
        if (identityRegistry == address(0)) identityRegistry = _identityRegistry;
        if (circuitBreaker == address(0)) circuitBreaker = _circuitBreaker;
    }

    function proposeAction(
        ActionType actionType,
        address targetAddress,
        uint8 clearanceLevel,
        uint8 rank,
        string calldata didReference,
        string calldata reason
    ) external onlyMember returns (uint256) {
        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.id = id;
        p.actionType = actionType;
        p.proposer = msg.sender;
        p.targetAddress = targetAddress;
        p.clearanceLevel = clearanceLevel;
        p.rank = rank;
        p.didReference = didReference;
        p.reason = reason;
        p.voteCount = 1;
        p.createdAt = block.timestamp;
        p.status = ProposalStatus.PENDING;
        p.hasVoted[msg.sender] = true;

        emit ProposalCreated(id, actionType, msg.sender, targetAddress);
        emit VoteCast(id, msg.sender, 1);

        if (p.voteCount >= REQUIRED_VOTES) {
            _executeProposal(id);
        }

        return id;
    }

    function vote(uint256 id) external onlyMember {
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.PENDING, "GovernanceMultiSig: proposal not pending");
        require(!p.hasVoted[msg.sender], "GovernanceMultiSig: already voted");
        require(block.timestamp <= p.createdAt + PROPOSAL_EXPIRY, "GovernanceMultiSig: proposal expired");

        p.hasVoted[msg.sender] = true;
        p.voteCount++;

        emit VoteCast(id, msg.sender, p.voteCount);

        if (p.voteCount >= REQUIRED_VOTES) {
            _executeProposal(id);
        }
    }

    function _executeProposal(uint256 id) internal {
        Proposal storage p = proposals[id];
        p.status = ProposalStatus.EXECUTED;

        if (p.actionType == ActionType.REGISTER_SOLDIER) {
            IIdentityRegistry(identityRegistry).registerSoldier(
                p.targetAddress, p.rank, p.clearanceLevel, p.didReference
            );
        } else if (p.actionType == ActionType.REVOKE_SOLDIER) {
            IIdentityRegistry(identityRegistry).revokeSoldier(p.targetAddress, p.reason);
        } else if (p.actionType == ActionType.UPDATE_CLEARANCE) {
            IIdentityRegistry(identityRegistry).updateClearance(p.targetAddress, p.clearanceLevel);
        } else if (p.actionType == ActionType.PAUSE_SYSTEM) {
            ICircuitBreaker(circuitBreaker).pause();
        } else if (p.actionType == ActionType.UNPAUSE_SYSTEM) {
            ICircuitBreaker(circuitBreaker).unpause();
        }

        emit ProposalExecuted(id, p.actionType, p.targetAddress);
    }

    function revokeProposal(uint256 id) external onlyMember {
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.PENDING, "GovernanceMultiSig: proposal not pending");
        require(p.proposer == msg.sender, "GovernanceMultiSig: not proposer");
        p.status = ProposalStatus.REVOKED;
        emit ProposalRevoked(id, msg.sender);
    }

    function isApprovedAction(bytes32) external pure returns (bool) {
        return true;
    }

    function isCommander(address account) external view returns (bool) {
        return isGovernanceMember[account] && roles[account] == Role.COMMANDER;
    }

    function getProposalVoteCount(uint256 id) external view returns (uint256) {
        return proposals[id].voteCount;
    }

    function getProposalStatus(uint256 id) external view returns (ProposalStatus) {
        return proposals[id].status;
    }

    function getMemberCount() external view returns (uint256) {
        return members.length;
    }
}
