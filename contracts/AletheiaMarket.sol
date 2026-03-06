// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AletheiaOracle.sol";
import "./IWorldID.sol";
import "./ByteHasher.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AletheiaMarket
 * @notice Simple ERC20-collateralized binary prediction market resolved by Chainlink CRE oracle.
 */
contract AletheiaMarket {
    using SafeERC20 for IERC20;
    using ByteHasher for bytes;

    AletheiaOracle public oracle;
    IWorldID public worldId;
    IERC20 public collateralToken;
    uint256 public worldIdExternalNullifierHash;
    bool public strictWorldIdVerification;
    mapping(uint256 => uint256) public oracleToMarketId;
    mapping(uint256 => bool) public usedWorldIdNullifierHashes;

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
    error InvalidValidationProof();
    error InsufficientShares();
    error InvalidNullifier();
    error InvalidWorldIDProof();

    constructor(
        address _oracleAddress,
        address _collateralTokenAddress,
        address _worldIdAddress,
        string memory appId,
        string memory action
    ) {
        require(_oracleAddress != address(0), "Invalid oracle");
        require(_collateralTokenAddress != address(0), "Invalid collateral");
        require(_worldIdAddress != address(0), "Invalid worldId");
        oracle = AletheiaOracle(_oracleAddress);
        worldId = IWorldID(_worldIdAddress);
        collateralToken = IERC20(_collateralTokenAddress);
        worldIdExternalNullifierHash = abi.encodePacked(abi.encodePacked(appId).hashToField(), action).hashToField();
        // Native World ID router verification is only reliable on canonical World ID chains.
        strictWorldIdVerification = block.chainid == 1 || block.chainid == 11155111;
    }

    modifier onlyOracle() {
        if (msg.sender != address(oracle)) revert OnlyOracle();
        _;
    }

    function createMarketVerified(
        string calldata question,
        uint256 deadline,
        uint256 root,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256[8] calldata proof
    )
        external
        returns (uint256 marketId)
    {
        if (deadline <= block.timestamp) revert DeadlineMustBeFuture();

        (
            bool processed,
            bool approved,
            ,
            bool legitimate,
            bool clearTimeline,
            bool resolvable,
            bool binary,
            bytes32 validationProofHash
        ) = oracle.getQuestionValidation(keccak256(abi.encode(question, deadline)));

        if (!processed || !approved || !legitimate || !clearTimeline || !resolvable || !binary) {
            revert QuestionNotValidated();
        }
        if (validationProofHash == bytes32(0)) revert InvalidValidationProof();

        if (usedWorldIdNullifierHashes[nullifierHash]) revert InvalidNullifier();

        if (strictWorldIdVerification) {
            try worldId.verifyProof(
                root,
                1,
                signalHash,
                nullifierHash,
                worldIdExternalNullifierHash,
                proof
            ) {}
            catch {
                revert InvalidWorldIDProof();
            }
        } else {
            // Tenderly/custom-chain demo fallback: require a non-empty proof payload and non-zero fields.
            if (root == 0 || signalHash == 0 || nullifierHash == 0) revert InvalidWorldIDProof();
            bool hasNonZeroProofElement;
            for (uint256 i = 0; i < 8; i++) {
                if (proof[i] != 0) {
                    hasNonZeroProofElement = true;
                    break;
                }
            }
            if (!hasNonZeroProofElement) revert InvalidWorldIDProof();
        }

        usedWorldIdNullifierHashes[nullifierHash] = true;

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

    function placeBet(uint256 marketId, bool onYes, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) revert AlreadySettled();
        if (block.timestamp >= market.deadline) revert MarketClosed();

        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        Bet storage bet = userBets[marketId][msg.sender];
        if (onYes) {
            bet.yesAmount += amount;
            market.totalYes += amount;
        } else {
            bet.noAmount += amount;
            market.totalNo += amount;
        }

        emit BetPlaced(marketId, msg.sender, onYes, amount);
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

        collateralToken.safeTransfer(msg.sender, shareAmount);

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

        collateralToken.safeTransfer(msg.sender, payout);

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
