// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AletheiaOracle
 * @notice Multi-source prediction market oracle powered by Chainlink CRE
 * @dev Autonomous CRON-based resolution with transparent proofs
 */
contract AletheiaOracle {
    struct Market {
        uint256 id;
        string question;
        uint256 deadline;
        bool resolved;
        bool outcome;
        uint8 confidence;
        bytes32 proofHash;
        uint256 createdAt;
    }

    // State
    mapping(uint256 => Market) public markets;
    uint256 public marketCount;
    address public creWorkflowAddress;
    address public owner;

    // Events
    event MarketCreated(
        uint256 indexed marketId,
        string question,
        uint256 deadline,
        uint256 createdAt
    );

    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint8 confidence,
        bytes32 proofHash,
        uint256 resolvedAt
    );

    event WorkflowAddressUpdated(address indexed oldAddress, address indexed newAddress);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyCRE() {
        require(msg.sender == creWorkflowAddress, "Only CRE workflow");
        _;
    }

    constructor() {
        owner = msg.sender;
        marketCount = 0;
    }

    /**
     * @notice Set the authorized CRE workflow address
     * @param _creWorkflowAddress Address of the CRE workflow that can resolve markets
     */
    function setWorkflowAddress(address _creWorkflowAddress) external onlyOwner {
        address oldAddress = creWorkflowAddress;
        creWorkflowAddress = _creWorkflowAddress;
        emit WorkflowAddressUpdated(oldAddress, _creWorkflowAddress);
    }

    /**
     * @notice Create a new prediction market
     * @param question The question to be resolved (e.g., "Will BTC close above $60,000 on March 1, 2026?")
     * @param deadline Unix timestamp after which the market can be resolved
     * @return marketId The ID of the created market
     */
    function createMarket(
        string calldata question,
        uint256 deadline
    ) external returns (uint256 marketId) {
        require(deadline > block.timestamp, "Deadline must be in future");
        require(bytes(question).length > 0, "Question cannot be empty");
        require(bytes(question).length <= 500, "Question too long");

        marketCount++;
        marketId = marketCount;

        markets[marketId] = Market({
            id: marketId,
            question: question,
            deadline: deadline,
            resolved: false,
            outcome: false,
            confidence: 0,
            proofHash: bytes32(0),
            createdAt: block.timestamp
        });

        emit MarketCreated(marketId, question, deadline, block.timestamp);
    }

    /**
     * @notice Get all pending markets (past deadline, not yet resolved)
     * @dev Called by CRE workflow CRON trigger
     * @return pendingMarkets Array of markets ready for resolution
     */
    function getPendingMarkets() external view returns (Market[] memory pendingMarkets) {
        // First pass: count pending markets
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= marketCount; i++) {
            if (!markets[i].resolved && block.timestamp >= markets[i].deadline) {
                pendingCount++;
            }
        }

        // Second pass: populate array
        pendingMarkets = new Market[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= marketCount; i++) {
            if (!markets[i].resolved && block.timestamp >= markets[i].deadline) {
                pendingMarkets[index] = markets[i];
                index++;
            }
        }
    }

    /**
     * @notice Resolve a market with multi-source consensus result
     * @dev Only callable by authorized CRE workflow
     * @param marketId The ID of the market to resolve
     * @param outcome The resolved outcome (TRUE/FALSE)
     * @param confidence Confidence score (0-100)
     * @param proofHash IPFS hash or keccak256 of evidence JSON
     */
    function resolveMarket(
        uint256 marketId,
        bool outcome,
        uint8 confidence,
        bytes32 proofHash
    ) external onlyCRE {
        require(marketId > 0 && marketId <= marketCount, "Invalid market ID");
        require(!markets[marketId].resolved, "Market already resolved");
        require(block.timestamp >= markets[marketId].deadline, "Deadline not passed");
        require(confidence <= 100, "Confidence must be <= 100");

        markets[marketId].resolved = true;
        markets[marketId].outcome = outcome;
        markets[marketId].confidence = confidence;
        markets[marketId].proofHash = proofHash;

        emit MarketResolved(marketId, outcome, confidence, proofHash, block.timestamp);
    }

    /**
     * @notice Get resolution result for a market
     * @param marketId The ID of the market
     * @return resolved Whether the market has been resolved
     * @return outcome The resolved outcome (TRUE/FALSE)
     * @return confidence Confidence score (0-100)
     * @return proofHash Hash of the evidence proof
     */
    function getResolution(uint256 marketId)
        external
        view
        returns (
            bool resolved,
            bool outcome,
            uint8 confidence,
            bytes32 proofHash
        )
    {
        require(marketId > 0 && marketId <= marketCount, "Invalid market ID");
        Market memory market = markets[marketId];
        return (market.resolved, market.outcome, market.confidence, market.proofHash);
    }

    /**
     * @notice Get full market details
     * @param marketId The ID of the market
     * @return market The complete market struct
     */
    function getMarket(uint256 marketId) external view returns (Market memory market) {
        require(marketId > 0 && marketId <= marketCount, "Invalid market ID");
        return markets[marketId];
    }

    /**
     * @notice Get total number of markets created
     * @return count The total market count
     */
    function getMarketCount() external view returns (uint256 count) {
        return marketCount;
    }
}
