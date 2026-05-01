// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CircuitBreaker {
    bool private _paused;
    address public governance;

    event SystemPaused(address indexed triggeredBy, uint256 timestamp);
    event SystemUnpaused(address indexed triggeredBy, uint256 timestamp);
    event GovernanceSet(address indexed governance);

    modifier onlyGovernance() {
        require(msg.sender == governance, "CircuitBreaker: caller is not governance");
        _;
    }

    constructor(address _governance) {
        governance = _governance;
        _paused = false;
        emit GovernanceSet(_governance);
    }

    function pause() external onlyGovernance {
        require(!_paused, "CircuitBreaker: already paused");
        _paused = true;
        emit SystemPaused(msg.sender, block.timestamp);
    }

    function unpause() external onlyGovernance {
        require(_paused, "CircuitBreaker: not paused");
        _paused = false;
        emit SystemUnpaused(msg.sender, block.timestamp);
    }

    function isPaused() external view returns (bool) {
        return _paused;
    }
}
