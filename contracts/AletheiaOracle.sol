// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ReceiverTemplate.sol";

/**
 * @title AletheiaOracle
 * @notice Multi-source prediction market oracle powered by Chainlink CRE
 * @dev Implements IReceiver interface to accept resolution data from CRE workflows
 * @dev Autonomous resolution with transparent proofs via ReceiverTemplate
 */
contract AletheiaOracle is ReceiverTemplate {
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

    /**
     * @notice Constructor sets up the oracle with CRE forwarder authorization
     * @param forwarderAddress The address of the Chainlink Forwarder contract that will call onReport()
     * @dev The forwarder address is required for security - only it can send resolution data
     */
    constructor(address forwarderAddress) ReceiverTemplate(forwarderAddress) {
        marketCount = 0;
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
     * @dev Called by CRE workflow to find markets ready for resolution
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
     * @notice Internal function to process resolution reports from CRE workflow
     * @dev Implements ReceiverTemplate._processReport() - called by onReport() after security checks
     * @param report ABI-encoded resolution data: (marketId, outcome, confidence, proofHash)
     */
    function _processReport(bytes calldata report) internal override {
        (uint256 marketId, bool outcome, uint8 confidence, bytes32 proofHash) =
            abi.decode(report, (uint256, bool, uint8, bytes32));

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
