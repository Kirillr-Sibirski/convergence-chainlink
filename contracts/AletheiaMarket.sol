// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AletheiaOracle.sol";
import "./EOTFactory.sol";
import "./EventOutcomeToken.sol";
import "./AEEIAPool.sol";

/**
 * @title AletheiaMarket
 * @notice DeFi primitive prediction market with tradeable outcome tokens
 * @dev Integrates EOT minting, AMM trading, and CRE-based oracle resolution
*                          
 * Key features:
 * - Binary markets (YES/NO) with tradeable ERC-20 outcome tokens
 * - Constant product AMM (x*y=k) for continuous trading before resolution
 * - LP tokens for liquidity providers
 * - Automated resolution via CRE multi-AI consensus
 * - Winners redeem tokens 1:1 for ETH after resolution
 */
contract AletheiaMarket {
    AletheiaOracle public oracle;
    EOTFactory public eotFactory;
    mapping(uint256 => uint256) public oracleToMarketId; // oracleMarketId => marketId

    struct Market {
        uint256 oracleMarketId;
        string question;
        uint256 deadline;
        address yesToken;
        address noToken;
        address pool;
        uint256 totalStaked;      // Total ETH staked (minted as EOTs)
        bool settled;
        bool outcome;
        uint256 createdAt;
    }

    mapping(uint256 => Market) public markets;
    uint256 public marketCount;
    uint8 public constant MINIMUM_CONFIDENCE = 80; // 80% confidence required

    // Events
    event MarketCreated(
        uint256 indexed marketId,
        uint256 indexed oracleMarketId,
        string question,
        uint256 deadline,
        address yesToken,
        address noToken,
        address pool
    );

    event TokensMinted(
        uint256 indexed marketId,
        address indexed user,
        bool isYes,
        uint256 amount
    );

    event MarketSettled(
        uint256 indexed marketId,
        bool outcome,
        uint8 confidence,
        uint256 totalStaked
    );

    event TokensRedeemed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount,
        uint256 payout
    );

    // Errors
    error InvalidMarketId();
    error MarketClosed();
    error MarketNotSettled();
    error AlreadySettled();
    error InsufficientConfidence();
    error NoTokensToRedeem();
    error ZeroAmount();
    error DeadlineMustBeFuture();
    error OnlyOracle();

    constructor(address _oracleAddress, address _eotFactoryAddress) {
        oracle = AletheiaOracle(_oracleAddress);
        eotFactory = EOTFactory(_eotFactoryAddress);
        marketCount = 0;
    }

    modifier onlyOracle() {
        if (msg.sender != address(oracle)) revert OnlyOracle();
        _;
    }

    /**
     * @notice Create a new binary prediction market with AMM
     * @param question The question to predict (e.g., "Will BTC hit $100k by Dec 31?")
     * @param deadline Unix timestamp for market close (trading window ends)
     * @param initialLiquidityYes Initial YES token liquidity for AMM (in wei)
     * @param initialLiquidityNo Initial NO token liquidity for AMM (in wei)
     * @return marketId The ID of the created market
     * @dev Creates EOT pair, deploys AMM pool, and adds initial liquidity
     */
    function createMarket(
        string calldata question,
        uint256 deadline,
        uint256 initialLiquidityYes,
        uint256 initialLiquidityNo
    ) external payable returns (uint256 marketId) {
        if (deadline <= block.timestamp) revert DeadlineMustBeFuture();
        if (msg.value != initialLiquidityYes + initialLiquidityNo) revert ZeroAmount();
        if ((initialLiquidityYes == 0) != (initialLiquidityNo == 0)) revert ZeroAmount();

        // Create oracle market for CRE resolution
        uint256 oracleMarketId = oracle.createMarket(question, deadline);

        marketCount++;
        marketId = marketCount;

        // Deploy YES/NO token pair via factory
        (address yesToken, address noToken) = eotFactory.createTokenPair(
            marketId,
            question,
            address(this)
        );

        // Deploy AMM pool
        AEEIAPool pool = new AEEIAPool(yesToken, noToken, marketId);

        // Optional initial liquidity: creator can seed pool, or leave it empty for external LPs.
        if (initialLiquidityYes > 0) {
            EventOutcomeToken(yesToken).mint(address(this), initialLiquidityYes);
            EventOutcomeToken(noToken).mint(address(this), initialLiquidityNo);
            EventOutcomeToken(yesToken).approve(address(pool), initialLiquidityYes);
            EventOutcomeToken(noToken).approve(address(pool), initialLiquidityNo);
            uint256 lpTokens = pool.addLiquidity(initialLiquidityYes, initialLiquidityNo);
            pool.transfer(msg.sender, lpTokens);
        }

        // Store market data
        markets[marketId] = Market({
            oracleMarketId: oracleMarketId,
            question: question,
            deadline: deadline,
            yesToken: yesToken,
            noToken: noToken,
            pool: address(pool),
            totalStaked: initialLiquidityYes + initialLiquidityNo,
            settled: false,
            outcome: false,
            createdAt: block.timestamp
        });
        oracleToMarketId[oracleMarketId] = marketId;

        emit MarketCreated(
            marketId,
            oracleMarketId,
            question,
            deadline,
            yesToken,
            noToken,
            address(pool)
        );
    }

    /**
     * @notice Mint outcome tokens by staking ETH (1 ETH = 1 YES + 1 NO)
     * @param marketId The prediction market ID
     * @dev Users can then trade YES/NO tokens on the AMM or hold to redeem after resolution
     *      ETH is held by the market contract, redeemable after resolution
     */
    function mintTokens(uint256 marketId) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) revert AlreadySettled();
        if (block.timestamp >= market.deadline) revert MarketClosed();

        // Mint equal amounts of YES and NO tokens (1 ETH = 1 YES + 1 NO)
        EventOutcomeToken(market.yesToken).mint(msg.sender, msg.value);
        EventOutcomeToken(market.noToken).mint(msg.sender, msg.value);

        market.totalStaked += msg.value * 2; // Both YES and NO count toward total
        // ETH stays in this contract for redemption

        emit TokensMinted(marketId, msg.sender, true, msg.value);
        emit TokensMinted(marketId, msg.sender, false, msg.value);
    }

    /**
     * @notice Settle the market using CRE oracle resolution
     * @param marketId The prediction market ID
     * @dev Enables redemption on winning token, burns losing token
     */
    function settleMarket(uint256 marketId) external {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) revert AlreadySettled();
        if (block.timestamp < market.deadline) revert MarketClosed();

        // Get CRE oracle resolution
        (bool resolved, bool outcome, uint8 confidence, ) =
            oracle.getResolution(market.oracleMarketId);

        if (!resolved) revert MarketNotSettled();
        if (confidence < MINIMUM_CONFIDENCE) revert InsufficientConfidence();

        market.settled = true;
        market.outcome = outcome;

        // Enable redemption on winning token
        // Winners can redeem tokens 1:1 for their share of total staked ETH
        EventOutcomeToken winningToken = outcome
            ? EventOutcomeToken(market.yesToken)
            : EventOutcomeToken(market.noToken);

        // Calculate redemption rate (1 winning token = redemption rate in wei)
        // For simplicity: 1 winning token = 1 ETH (since users minted 1:1)
        winningToken.enableRedemption(1e18);

        emit MarketSettled(marketId, outcome, confidence, market.totalStaked);
    }

    /**
     * @notice Settle market directly from oracle callback (CRE report path)
     * @param oracleMarketId Oracle market ID that was just resolved
     * @param outcome Resolved outcome
     * @param confidence Resolution confidence (0-100)
     */
    function settleFromOracle(
        uint256 oracleMarketId,
        bool outcome,
        uint8 confidence
    ) external onlyOracle {
        uint256 marketId = oracleToMarketId[oracleMarketId];
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) return;
        if (block.timestamp < market.deadline) revert MarketClosed();
        if (confidence < MINIMUM_CONFIDENCE) revert InsufficientConfidence();

        market.settled = true;
        market.outcome = outcome;

        EventOutcomeToken winningToken = outcome
            ? EventOutcomeToken(market.yesToken)
            : EventOutcomeToken(market.noToken);
        winningToken.enableRedemption(1e18);

        emit MarketSettled(marketId, outcome, confidence, market.totalStaked);
    }

    /**
     * @notice Redeem winning tokens for ETH
     * @param marketId The prediction market ID
     * @dev Burns tokens and transfers proportional ETH to user
     */
    function redeemTokens(uint256 marketId) external {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market memory market = markets[marketId];
        if (!market.settled) revert MarketNotSettled();

        EventOutcomeToken winningToken = market.outcome
            ? EventOutcomeToken(market.yesToken)
            : EventOutcomeToken(market.noToken);

        uint256 userBalance = winningToken.balanceOf(msg.sender);
        if (userBalance == 0) revert NoTokensToRedeem();

        // Calculate payout (1:1 redemption)
        uint256 payout = userBalance;

        // Burn tokens via market permission
        winningToken.burn(msg.sender, userBalance);

        // Transfer ETH from this contract
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "ETH transfer failed");

        emit TokensRedeemed(marketId, msg.sender, userBalance, payout);
    }

    /**
     * @notice Get current market price from AMM
     * @param marketId The prediction market ID
     * @return yesPrice Price of YES token in terms of NO tokens (scaled by 1e18)
     * @return noPrice Price of NO token in terms of YES tokens (scaled by 1e18)
     */
    function getMarketPrices(uint256 marketId)
        external
        view
        returns (uint256 yesPrice, uint256 noPrice)
    {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market memory market = markets[marketId];
        AEEIAPool pool = AEEIAPool(market.pool);

        yesPrice = pool.getYesPrice();
        noPrice = pool.getNoPrice();
    }

    /**
     * @notice Get AMM reserves
     * @param marketId The prediction market ID
     * @return reserveYes YES token reserve
     * @return reserveNo NO token reserve
     */
    function getReserves(uint256 marketId)
        external
        view
        returns (uint256 reserveYes, uint256 reserveNo)
    {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market memory market = markets[marketId];
        AEEIAPool pool = AEEIAPool(market.pool);

        reserveYes = pool.reserveYes();
        reserveNo = pool.reserveNo();
    }

    /**
     * @notice Get user's token balances
     * @param marketId The prediction market ID
     * @param user The user address
     * @return yesBalance YES token balance
     * @return noBalance NO token balance
     */
    function getUserBalances(uint256 marketId, address user)
        external
        view
        returns (uint256 yesBalance, uint256 noBalance)
    {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market memory market = markets[marketId];
        yesBalance = EventOutcomeToken(market.yesToken).balanceOf(user);
        noBalance = EventOutcomeToken(market.noToken).balanceOf(user);
    }

    /**
     * @notice Check if user can redeem and calculate payout
     * @param marketId The prediction market ID
     * @param user The user address
     * @return canRedeem Whether user has winning tokens
     * @return potentialPayout Amount user would receive if they redeemed now
     */
    function getRedemptionInfo(uint256 marketId, address user)
        external
        view
        returns (bool canRedeem, uint256 potentialPayout)
    {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market memory market = markets[marketId];
        if (!market.settled) return (false, 0);

        EventOutcomeToken winningToken = market.outcome
            ? EventOutcomeToken(market.yesToken)
            : EventOutcomeToken(market.noToken);

        uint256 userBalance = winningToken.balanceOf(user);
        if (userBalance == 0) return (false, 0);

        // Calculate payout: balance * redemption rate
        uint256 redemptionRate = winningToken.redemptionRate();
        potentialPayout = (userBalance * redemptionRate) / 1e18;

        return (true, potentialPayout);
    }

    /**
     * @notice Receive ETH from token redemptions
     */
    receive() external payable {}
}
