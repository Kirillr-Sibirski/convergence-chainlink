// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AletheiaOracle.sol";
import "./ByteHasher.sol";
import "./IWorldID.sol";

/**
 * @title AletheiaMarket
 * @notice Simple ETH-based binary prediction market resolved by Chainlink CRE oracle.
 */
contract AletheiaMarket {
    using ByteHasher for bytes;

    AletheiaOracle public oracle;
    IWorldID public worldId;
    mapping(uint256 => uint256) public oracleToMarketId;
    mapping(address => uint256) public lastCreatedAt;

    uint256 public immutable worldIdExternalNullifierHash;

    struct Market {
        uint256 oracleMarketId;
        string question;
        uint256 deadline;
        uint256 totalYes;
        uint256 totalNo;
        bool settled;
        bool outcome;
        uint256 createdAt;
    }

    struct Bet {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    uint256 public marketCount;
    mapping(uint256 => mapping(address => Bet)) public userBets;

    uint8 public constant MINIMUM_CONFIDENCE = 80;
    uint256 public constant WORLD_ID_GROUP_ID = 1;
    uint256 public constant CREATE_COOLDOWN = 1 days;

    event MarketCreated(uint256 indexed marketId, uint256 indexed oracleMarketId, string question, uint256 deadline);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool onYes, uint256 amount);
    event SharesSold(uint256 indexed marketId, address indexed user, bool onYes, uint256 amount);
    event MarketSettled(uint256 indexed marketId, bool outcome, uint8 confidence);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 payout);

    error InvalidMarketId();
    error MarketClosed();
    error MarketNotSettled();
    error AlreadySettled();
    error InsufficientConfidence();
    error NoWinnings();
    error BetAlreadyClaimed();
    error ZeroAmount();
    error DeadlineMustBeFuture();
    error OnlyOracle();
    error QuestionNotValidated();
    error InsufficientShares();
    error CreationRateLimited(uint256 nextAllowedAt);

    constructor(address _oracleAddress, address _worldIdAddress, string memory appId, string memory action) {
        require(_oracleAddress != address(0), "Invalid oracle");
        require(_worldIdAddress != address(0), "Invalid WorldID");
        require(bytes(appId).length > 0, "Invalid WorldID app");
        require(bytes(action).length > 0, "Invalid WorldID action");
        oracle = AletheiaOracle(_oracleAddress);
        worldId = IWorldID(_worldIdAddress);
        worldIdExternalNullifierHash = abi.encodePacked(abi.encodePacked(appId).hashToField(), action).hashToField();
    }

    modifier onlyOracle() {
        if (msg.sender != address(oracle)) revert OnlyOracle();
        _;
    }

    function createMarketVerified(
        string calldata question,
        uint256 deadline,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    )
        external
        returns (uint256 marketId)
    {
        if (deadline <= block.timestamp) revert DeadlineMustBeFuture();
        if (block.timestamp < lastCreatedAt[msg.sender] + CREATE_COOLDOWN) {
            revert CreationRateLimited(lastCreatedAt[msg.sender] + CREATE_COOLDOWN);
        }

        (
            bool processed,
            bool approved,
            ,
            bool legitimate,
            bool clearTimeline,
            bool resolvable,
            bool binary,

        ) = oracle.getQuestionValidation(keccak256(abi.encode(question, deadline)));

        if (!processed || !approved || !legitimate || !clearTimeline || !resolvable || !binary) {
            revert QuestionNotValidated();
        }

        worldId.verifyProof(
            root,
            WORLD_ID_GROUP_ID,
            abi.encodePacked(msg.sender).hashToField(),
            nullifierHash,
            worldIdExternalNullifierHash,
            proof
        );

        lastCreatedAt[msg.sender] = block.timestamp;

        uint256 oracleMarketId = oracle.createMarket(question, deadline);

        marketCount++;
        marketId = marketCount;

        markets[marketId] = Market({
            oracleMarketId: oracleMarketId,
            question: question,
            deadline: deadline,
            totalYes: 0,
            totalNo: 0,
            settled: false,
            outcome: false,
            createdAt: block.timestamp
        });

        oracleToMarketId[oracleMarketId] = marketId;
        emit MarketCreated(marketId, oracleMarketId, question, deadline);
    }

    function placeBet(uint256 marketId, bool onYes) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) revert AlreadySettled();
        if (block.timestamp >= market.deadline) revert MarketClosed();

        Bet storage bet = userBets[marketId][msg.sender];
        if (onYes) {
            bet.yesAmount += msg.value;
            market.totalYes += msg.value;
        } else {
            bet.noAmount += msg.value;
            market.totalNo += msg.value;
        }

        emit BetPlaced(marketId, msg.sender, onYes, msg.value);
    }

    function sellShares(uint256 marketId, bool onYes, uint256 shareAmount) external {
        if (shareAmount == 0) revert ZeroAmount();
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) revert AlreadySettled();
        if (block.timestamp >= market.deadline) revert MarketClosed();

        Bet storage bet = userBets[marketId][msg.sender];
        if (onYes) {
            if (bet.yesAmount < shareAmount) revert InsufficientShares();
            bet.yesAmount -= shareAmount;
            market.totalYes -= shareAmount;
        } else {
            if (bet.noAmount < shareAmount) revert InsufficientShares();
            bet.noAmount -= shareAmount;
            market.totalNo -= shareAmount;
        }

        (bool success, ) = msg.sender.call{value: shareAmount}("");
        require(success, "ETH transfer failed");

        emit SharesSold(marketId, msg.sender, onYes, shareAmount);
    }

    function settleMarket(uint256 marketId) external {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) revert AlreadySettled();
        if (block.timestamp < market.deadline) revert MarketClosed();

        (bool resolved, bool outcome, uint8 confidence, ) = oracle.getResolution(market.oracleMarketId);

        if (!resolved) revert MarketNotSettled();
        if (confidence < MINIMUM_CONFIDENCE) revert InsufficientConfidence();

        market.settled = true;
        market.outcome = outcome;

        emit MarketSettled(marketId, outcome, confidence);
    }

    function settleFromOracle(uint256 oracleMarketId, bool outcome, uint8 confidence) external onlyOracle {
        uint256 marketId = oracleToMarketId[oracleMarketId];
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) return;
        if (block.timestamp < market.deadline) revert MarketClosed();
        if (confidence < MINIMUM_CONFIDENCE) revert InsufficientConfidence();

        market.settled = true;
        market.outcome = outcome;

        emit MarketSettled(marketId, outcome, confidence);
    }

    function claimWinnings(uint256 marketId) external {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (!market.settled) revert MarketNotSettled();

        Bet storage bet = userBets[marketId][msg.sender];
        if (bet.claimed) revert BetAlreadyClaimed();

        uint256 userStake = market.outcome ? bet.yesAmount : bet.noAmount;
        if (userStake == 0) revert NoWinnings();

        uint256 winningPool = market.outcome ? market.totalYes : market.totalNo;
        uint256 losingPool = market.outcome ? market.totalNo : market.totalYes;

        uint256 payout = userStake;
        if (winningPool > 0 && losingPool > 0) {
            payout += (userStake * losingPool) / winningPool;
        }

        bet.claimed = true;

        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "ETH transfer failed");

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    function getUserBet(uint256 marketId, address user)
        external
        view
        returns (uint256 yesAmount, uint256 noAmount, bool claimed)
    {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();
        Bet memory b = userBets[marketId][user];
        return (b.yesAmount, b.noAmount, b.claimed);
    }

    function getMarketOdds(uint256 marketId) external view returns (uint256 yesBps, uint256 noBps) {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();
        Market memory m = markets[marketId];
        uint256 total = m.totalYes + m.totalNo;
        if (total == 0) return (5000, 5000);
        yesBps = (m.totalYes * 10000) / total;
        noBps = 10000 - yesBps;
    }

    function getUserClaimablePayout(uint256 marketId, address user) external view returns (bool canClaim, uint256 payout) {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market memory market = markets[marketId];
        Bet memory bet = userBets[marketId][user];

        if (!market.settled || bet.claimed) return (false, 0);

        uint256 userStake = market.outcome ? bet.yesAmount : bet.noAmount;
        if (userStake == 0) return (false, 0);

        uint256 winningPool = market.outcome ? market.totalYes : market.totalNo;
        uint256 losingPool = market.outcome ? market.totalNo : market.totalYes;

        payout = userStake;
        if (winningPool > 0 && losingPool > 0) {
            payout += (userStake * losingPool) / winningPool;
        }

        return (true, payout);
    }

    receive() external payable {}
}
