// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ReceiverTemplate.sol";

interface IAletheiaMarketSettlement {
    function settleFromOracle(uint256 oracleMarketId, bool outcome, uint8 confidence) external;
}

/**
 * @title AletheiaOracle
 * @notice Multi-source prediction market oracle powered by Chainlink CRE
 * @dev Implements IReceiver interface to accept resolution data from CRE workflows
 * @dev Autonomous resolution with transparent proofs via ReceiverTemplate
 */
contract AletheiaOracle is ReceiverTemplate {
    uint8 private constant REPORT_TYPE_RESOLUTION = 1;
    uint8 private constant REPORT_TYPE_VALIDATION = 2;
    uint8 private constant REPORT_TYPE_QUESTION_VALIDATION = 3;

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

    struct ValidationRequest {
        uint256 id;
        address requester;
        string question;
        uint256 deadline;
        bool processed;
        bool approved;
        uint8 score;
        bool legitimate;
        bool clearTimeline;
        bool resolvable;
        bool binary;
        bytes32 proofHash;
        uint256 createdAt;
    }

    struct QuestionValidation {
        bool processed;
        bool approved;
        uint8 score;
        bool legitimate;
        bool clearTimeline;
        bool resolvable;
        bool binary;
        bytes32 proofHash;
        uint256 updatedAt;
    }

    // State
    mapping(uint256 => Market) public markets;
    uint256 public marketCount;
    mapping(uint256 => ValidationRequest) public validationRequests;
    uint256 public validationRequestCount;
    mapping(bytes32 => QuestionValidation) public questionValidations;
    address public predictionMarket;
    uint8 public constant MINIMUM_CONFIDENCE = 80;

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

    event PredictionMarketUpdated(address indexed previousMarket, address indexed newMarket);
    event SettlementTriggered(uint256 indexed marketId, address indexed predictionMarket);
    event SettlementFailed(uint256 indexed marketId, address indexed predictionMarket, string reason);
    event ValidationRequested(
        uint256 indexed requestId,
        address indexed requester,
        string question,
        uint256 deadline
    );
    event ValidationProcessed(
        uint256 indexed requestId,
        bool approved,
        uint8 score,
        bool legitimate,
        bool clearTimeline,
        bool resolvable,
        bool binary,
        bytes32 proofHash,
        uint256 processedAt
    );
    event QuestionValidated(
        bytes32 indexed questionDigest,
        bool approved,
        uint8 score,
        bool legitimate,
        bool clearTimeline,
        bool resolvable,
        bool binary,
        bytes32 proofHash,
        uint256 processedAt
    );

    /**
     * @notice Constructor sets up the oracle with CRE forwarder authorization
     * @param forwarderAddress The address of the Chainlink Forwarder contract that will call onReport()
     * @dev The forwarder address is required for security - only it can send resolution data
     */
    constructor(address forwarderAddress) ReceiverTemplate(forwarderAddress) {
        marketCount = 0;
        validationRequestCount = 0;
    }

    modifier onlyPredictionMarket() {
        require(msg.sender == predictionMarket, "Only prediction market");
        _;
    }

    /**
     * @notice Set prediction market contract for auto-settlement callbacks
     * @param _predictionMarket AletheiaMarket contract address
     */
    function setPredictionMarket(address _predictionMarket) external onlyOwner {
        address previous = predictionMarket;
        predictionMarket = _predictionMarket;
        emit PredictionMarketUpdated(previous, _predictionMarket);
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
    ) external onlyPredictionMarket returns (uint256 marketId) {
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

    function requestMarketValidation(
        address requester,
        string calldata question,
        uint256 deadline
    ) external onlyPredictionMarket returns (uint256 requestId) {
        require(deadline > block.timestamp, "Deadline must be in future");
        require(bytes(question).length > 0, "Question cannot be empty");
        require(bytes(question).length <= 500, "Question too long");
        require(requester != address(0), "Invalid requester");

        validationRequestCount++;
        requestId = validationRequestCount;

        validationRequests[requestId] = ValidationRequest({
            id: requestId,
            requester: requester,
            question: question,
            deadline: deadline,
            processed: false,
            approved: false,
            score: 0,
            legitimate: false,
            clearTimeline: false,
            resolvable: false,
            binary: false,
            proofHash: bytes32(0),
            createdAt: block.timestamp
        });

        emit ValidationRequested(requestId, requester, question, deadline);
    }

    function createMarketFromValidation(uint256 requestId)
        external
        onlyPredictionMarket
        returns (uint256 marketId)
    {
        ValidationRequest storage req = validationRequests[requestId];
        require(req.id != 0, "Invalid validation request");
        require(req.processed, "Validation pending");
        require(req.approved, "Validation rejected");

        marketCount++;
        marketId = marketCount;

        markets[marketId] = Market({
            id: marketId,
            question: req.question,
            deadline: req.deadline,
            resolved: false,
            outcome: false,
            confidence: 0,
            proofHash: bytes32(0),
            createdAt: block.timestamp
        });

        emit MarketCreated(marketId, req.question, req.deadline, block.timestamp);
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

    function getPendingValidationRequests()
        external
        view
        returns (ValidationRequest[] memory pendingRequests)
    {
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= validationRequestCount; i++) {
            if (!validationRequests[i].processed) {
                pendingCount++;
            }
        }

        pendingRequests = new ValidationRequest[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= validationRequestCount; i++) {
            if (!validationRequests[i].processed) {
                pendingRequests[index] = validationRequests[i];
                index++;
            }
        }
    }

    function getValidationResult(uint256 requestId)
        external
        view
        returns (
            bool processed,
            bool approved,
            uint8 score,
            bool legitimate,
            bool clearTimeline,
            bool resolvable,
            bool binary,
            bytes32 proofHash
        )
    {
        ValidationRequest memory req = validationRequests[requestId];
        require(req.id != 0, "Invalid validation request");
        return (
            req.processed,
            req.approved,
            req.score,
            req.legitimate,
            req.clearTimeline,
            req.resolvable,
            req.binary,
            req.proofHash
        );
    }

    function getQuestionValidation(bytes32 questionDigest)
        external
        view
        returns (
            bool processed,
            bool approved,
            uint8 score,
            bool legitimate,
            bool clearTimeline,
            bool resolvable,
            bool binary,
            bytes32 proofHash
        )
    {
        QuestionValidation memory qv = questionValidations[questionDigest];
        return (
            qv.processed,
            qv.approved,
            qv.score,
            qv.legitimate,
            qv.clearTimeline,
            qv.resolvable,
            qv.binary,
            qv.proofHash
        );
    }

    /**
     * @notice Internal function to process resolution reports from CRE workflow
     * @dev Implements ReceiverTemplate._processReport() - called by onReport() after security checks
     * @param report ABI-encoded resolution data: (marketId, outcome, confidence, proofHash)
     */
    function _processReport(bytes calldata report) internal override {
        uint256 firstWord = abi.decode(report, (uint256));

        if (firstWord == REPORT_TYPE_RESOLUTION) {
            _decodeAndApplyResolution(report);
            return;
        }

        if (firstWord == REPORT_TYPE_VALIDATION) {
            _decodeAndApplyValidation(report);
            return;
        }
        if (firstWord == REPORT_TYPE_QUESTION_VALIDATION) {
            _decodeAndApplyQuestionValidation(report);
            return;
        }

        // Backward-compatible legacy report format: (marketId, outcome, confidence, proofHash)
        (uint256 legacyMarketId, bool legacyOutcome, uint8 legacyConfidence, bytes32 legacyProofHash) =
            abi.decode(report, (uint256, bool, uint8, bytes32));
        _applyResolution(legacyMarketId, legacyOutcome, legacyConfidence, legacyProofHash);
    }

    function _decodeAndApplyResolution(bytes calldata report) internal {
        (
            ,
            uint256 marketId,
            bool outcome,
            uint8 confidence,
            bytes32 proofHash
        ) = abi.decode(report, (uint8, uint256, bool, uint8, bytes32));
        _applyResolution(marketId, outcome, confidence, proofHash);
    }

    function _decodeAndApplyValidation(bytes calldata report) internal {
        (
            ,
            uint256 requestId,
            bool approved,
            uint8 score,
            bool legitimate,
            bool clearTimeline,
            bool resolvable,
            bool binary,
            bytes32 proofHash
        ) = abi.decode(report, (uint8, uint256, bool, uint8, bool, bool, bool, bool, bytes32));
        _applyValidation(
            requestId,
            approved,
            score,
            legitimate,
            clearTimeline,
            resolvable,
            binary,
            proofHash
        );
    }

    function _decodeAndApplyQuestionValidation(bytes calldata report) internal {
        (
            ,
            bytes32 questionDigest,
            bool approved,
            uint8 score,
            bool legitimate,
            bool clearTimeline,
            bool resolvable,
            bool binary,
            bytes32 proofHash
        ) = abi.decode(report, (uint8, bytes32, bool, uint8, bool, bool, bool, bool, bytes32));

        questionValidations[questionDigest] = QuestionValidation({
            processed: true,
            approved: approved,
            score: score,
            legitimate: legitimate,
            clearTimeline: clearTimeline,
            resolvable: resolvable,
            binary: binary,
            proofHash: proofHash,
            updatedAt: block.timestamp
        });

        emit QuestionValidated(
            questionDigest,
            approved,
            score,
            legitimate,
            clearTimeline,
            resolvable,
            binary,
            proofHash,
            block.timestamp
        );
    }

    function _applyValidation(
        uint256 requestId,
        bool approved,
        uint8 score,
        bool legitimate,
        bool clearTimeline,
        bool resolvable,
        bool binary,
        bytes32 proofHash
    ) internal {
        require(requestId > 0 && requestId <= validationRequestCount, "Invalid validation request");
        ValidationRequest storage req = validationRequests[requestId];
        require(!req.processed, "Validation already processed");
        require(score <= 100, "Score must be <= 100");

        req.processed = true;
        req.approved = approved;
        req.score = score;
        req.legitimate = legitimate;
        req.clearTimeline = clearTimeline;
        req.resolvable = resolvable;
        req.binary = binary;
        req.proofHash = proofHash;

        emit ValidationProcessed(
            requestId,
            approved,
            score,
            legitimate,
            clearTimeline,
            resolvable,
            binary,
            proofHash,
            block.timestamp
        );
    }

    function _applyResolution(
        uint256 marketId,
        bool outcome,
        uint8 confidence,
        bytes32 proofHash
    ) internal {
        require(marketId > 0 && marketId <= marketCount, "Invalid market ID");
        require(!markets[marketId].resolved, "Market already resolved");
        require(block.timestamp >= markets[marketId].deadline, "Deadline not passed");
        require(confidence <= 100, "Confidence must be <= 100");
        require(confidence >= MINIMUM_CONFIDENCE, "Confidence below minimum");

        markets[marketId].resolved = true;
        markets[marketId].outcome = outcome;
        markets[marketId].confidence = confidence;
        markets[marketId].proofHash = proofHash;

        emit MarketResolved(marketId, outcome, confidence, proofHash, block.timestamp);

        if (predictionMarket != address(0) && confidence >= MINIMUM_CONFIDENCE) {
            try IAletheiaMarketSettlement(predictionMarket).settleFromOracle(marketId, outcome, confidence) {
                emit SettlementTriggered(marketId, predictionMarket);
            } catch Error(string memory reason) {
                emit SettlementFailed(marketId, predictionMarket, reason);
            } catch {
                emit SettlementFailed(marketId, predictionMarket, "unknown");
            }
        }
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
