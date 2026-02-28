// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AletheiaOracle.sol";

/**
 * @title DemoPredictionMarket
 * @notice Example integration showing how to use Aletheia Oracle
 * @dev Simple YES/NO market with stakes that settles based on oracle resolution
 */
contract DemoPredictionMarket {
    AletheiaOracle public oracle;

    struct PredictionMarket {
        uint256 oracleMarketId;
        string question;
        uint256 deadline;
        uint256 totalYesStake;
        uint256 totalNoStake;
        bool settled;
        bool outcome;
        uint256 createdAt;
    }

    mapping(uint256 => PredictionMarket) public predictionMarkets;
    mapping(uint256 => mapping(address => uint256)) public yesStakes;
    mapping(uint256 => mapping(address => uint256)) public noStakes;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    uint256 public marketCount;
    uint8 public constant MINIMUM_CONFIDENCE = 80; // Require 80% confidence to settle

    event MarketCreated(
        uint256 indexed marketId,
        uint256 indexed oracleMarketId,
        string question,
        uint256 deadline
    );

    event StakePlaced(
        uint256 indexed marketId,
        address indexed user,
        bool prediction,
        uint256 amount
    );

    event MarketSettled(
        uint256 indexed marketId,
        bool outcome,
        uint8 confidence,
        uint256 totalYesStake,
        uint256 totalNoStake
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    constructor(address _oracleAddress) {
        oracle = AletheiaOracle(_oracleAddress);
        marketCount = 0;
    }

    /**
     * @notice Create a new prediction market
     * @param question The question to predict (must match oracle market)
     * @param deadline Unix timestamp for market close
     */
    function createMarket(
        string calldata question,
        uint256 deadline
    ) external returns (uint256 marketId) {
        require(deadline > block.timestamp, "Deadline must be in future");

        // Create corresponding oracle market
        uint256 oracleMarketId = oracle.createMarket(question, deadline);

        marketCount++;
        marketId = marketCount;

        predictionMarkets[marketId] = PredictionMarket({
            oracleMarketId: oracleMarketId,
            question: question,
            deadline: deadline,
            totalYesStake: 0,
            totalNoStake: 0,
            settled: false,
            outcome: false,
            createdAt: block.timestamp
        });

        emit MarketCreated(marketId, oracleMarketId, question, deadline);
    }

    /**
     * @notice Place a stake on YES or NO
     * @param marketId The prediction market ID
     * @param predictYes True for YES, False for NO
     */
    function stake(uint256 marketId, bool predictYes) external payable {
        require(msg.value > 0, "Must stake > 0");
        require(marketId > 0 && marketId <= marketCount, "Invalid market ID");

        PredictionMarket storage market = predictionMarkets[marketId];
        require(!market.settled, "Market already settled");
        require(block.timestamp < market.deadline, "Market closed");

        if (predictYes) {
            yesStakes[marketId][msg.sender] += msg.value;
            market.totalYesStake += msg.value;
        } else {
            noStakes[marketId][msg.sender] += msg.value;
            market.totalNoStake += msg.value;
        }

        emit StakePlaced(marketId, msg.sender, predictYes, msg.value);
    }

    /**
     * @notice Settle the market using oracle resolution
     * @dev Can be called by anyone after oracle resolves
     * @param marketId The prediction market ID
     */
    function settleMarket(uint256 marketId) external {
        require(marketId > 0 && marketId <= marketCount, "Invalid market ID");

        PredictionMarket storage market = predictionMarkets[marketId];
        require(!market.settled, "Already settled");
        require(block.timestamp >= market.deadline, "Market not closed yet");

        // Get oracle resolution
        (bool resolved, bool outcome, uint8 confidence, ) =
            oracle.getResolution(market.oracleMarketId);

        require(resolved, "Oracle has not resolved this market yet");
        require(confidence >= MINIMUM_CONFIDENCE, "Confidence too low to settle");

        market.settled = true;
        market.outcome = outcome;

        emit MarketSettled(
            marketId,
            outcome,
            confidence,
            market.totalYesStake,
            market.totalNoStake
        );
    }

    /**
     * @notice Claim winnings if you predicted correctly
     * @param marketId The prediction market ID
     */
    function claimWinnings(uint256 marketId) external {
        require(marketId > 0 && marketId <= marketCount, "Invalid market ID");

        PredictionMarket memory market = predictionMarkets[marketId];
        require(market.settled, "Market not settled yet");
        require(!hasClaimed[marketId][msg.sender], "Already claimed");

        uint256 userStake;
        uint256 totalWinningStake;
        uint256 totalLosingStake;

        if (market.outcome) {
            // YES won
            userStake = yesStakes[marketId][msg.sender];
            totalWinningStake = market.totalYesStake;
            totalLosingStake = market.totalNoStake;
        } else {
            // NO won
            userStake = noStakes[marketId][msg.sender];
            totalWinningStake = market.totalNoStake;
            totalLosingStake = market.totalYesStake;
        }

        require(userStake > 0, "No winning stake");

        // Calculate payout: user's stake + proportional share of losing side
        uint256 payout = userStake;
        if (totalWinningStake > 0) {
            payout += (userStake * totalLosingStake) / totalWinningStake;
        }

        hasClaimed[marketId][msg.sender] = true;

        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    /**
     * @notice Get user's stakes for a market
     * @param marketId The prediction market ID
     * @param user The user address
     * @return yesStake Amount staked on YES
     * @return noStake Amount staked on NO
     */
    function getUserStakes(uint256 marketId, address user)
        external
        view
        returns (uint256 yesStake, uint256 noStake)
    {
        return (yesStakes[marketId][user], noStakes[marketId][user]);
    }

    /**
     * @notice Calculate potential payout if user wins
     * @param marketId The prediction market ID
     * @param user The user address
     * @return yesPayout Potential payout if YES wins
     * @return noPayout Potential payout if NO wins
     */
    function calculatePotentialPayout(uint256 marketId, address user)
        external
        view
        returns (uint256 yesPayout, uint256 noPayout)
    {
        PredictionMarket memory market = predictionMarkets[marketId];

        uint256 userYesStake = yesStakes[marketId][user];
        uint256 userNoStake = noStakes[marketId][user];

        if (market.totalYesStake > 0 && userYesStake > 0) {
            yesPayout = userYesStake + (userYesStake * market.totalNoStake) / market.totalYesStake;
        }

        if (market.totalNoStake > 0 && userNoStake > 0) {
            noPayout = userNoStake + (userNoStake * market.totalYesStake) / market.totalNoStake;
        }
    }
}
