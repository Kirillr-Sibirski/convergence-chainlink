// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AletheiaOracle.sol";
import "./EOTFactory.sol";
import "./EventOutcomeToken.sol";
import "./AEEIAPool.sol";
import "./IWorldID.sol";

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
    uint256 public constant CREATION_COOLDOWN = 1 days;
    uint256 public constant WORLD_ID_GROUP_ID = 1;

    AletheiaOracle public oracle;
    EOTFactory public eotFactory;
    IWorldID public worldId;
    uint256 public worldIdExternalNullifierHash;
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

    struct MarketCreationRequest {
        uint256 id;
        address requester;
        string question;
        uint256 deadline;
        uint256 oracleValidationRequestId;
        bool finalized;
        uint256 createdAt;
    }

    mapping(uint256 => Market) public markets;
    uint256 public marketCount;
    mapping(uint256 => MarketCreationRequest) public creationRequests;
    uint256 public creationRequestCount;
    mapping(address => uint256) public lastMarketCreationAt;
    mapping(uint256 => bool) public usedWorldIdNullifierHashes;
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
    event OutcomePurchased(
        uint256 indexed marketId,
        address indexed user,
        bool buyYes,
        uint256 ethIn,
        uint256 tokensOut
    );
    event MarketCreationRequested(
        uint256 indexed requestId,
        address indexed requester,
        uint256 indexed oracleValidationRequestId,
        string question,
        uint256 deadline
    );
    event MarketCreationFinalized(
        uint256 indexed requestId,
        uint256 indexed marketId,
        uint256 indexed oracleMarketId
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
    error DirectCreationDisabled();
    error InvalidCreationRequest();
    error ValidationPending();
    error ValidationRejected();
    error AlreadyFinalized();
    error NotRequester();
    error CreationRateLimited();
    error InvalidWorldIdNullifier();
    error QuestionNotValidated();

    constructor(
        address _oracleAddress,
        address _eotFactoryAddress,
        address _worldIdAddress,
        uint256 _worldIdExternalNullifierHash
    ) {
        oracle = AletheiaOracle(_oracleAddress);
        eotFactory = EOTFactory(_eotFactoryAddress);
        worldId = IWorldID(_worldIdAddress);
        worldIdExternalNullifierHash = _worldIdExternalNullifierHash;
        marketCount = 0;
        creationRequestCount = 0;
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
        question;
        deadline;
        initialLiquidityYes;
        initialLiquidityNo;
        marketId = 0;
        revert DirectCreationDisabled();
    }

    function requestMarketCreation(
        string calldata question,
        uint256 deadline
    ) external returns (uint256 requestId) {
        if (deadline <= block.timestamp) revert DeadlineMustBeFuture();
        if (bytes(question).length == 0) revert ZeroAmount();

        uint256 oracleValidationRequestId = oracle.requestMarketValidation(
            msg.sender,
            question,
            deadline
        );

        creationRequestCount++;
        requestId = creationRequestCount;

        creationRequests[requestId] = MarketCreationRequest({
            id: requestId,
            requester: msg.sender,
            question: question,
            deadline: deadline,
            oracleValidationRequestId: oracleValidationRequestId,
            finalized: false,
            createdAt: block.timestamp
        });

        emit MarketCreationRequested(
            requestId,
            msg.sender,
            oracleValidationRequestId,
            question,
            deadline
        );
    }

    function finalizeMarketCreation(
        uint256 requestId,
        uint256 initialLiquidityYes,
        uint256 initialLiquidityNo,
        uint256 worldRoot,
        uint256 worldNullifierHash,
        uint256[8] calldata worldProof
    ) external payable returns (uint256 marketId) {
        if (requestId == 0 || requestId > creationRequestCount) revert InvalidCreationRequest();
        if (msg.value != initialLiquidityYes + initialLiquidityNo) revert ZeroAmount();
        if ((initialLiquidityYes == 0) != (initialLiquidityNo == 0)) revert ZeroAmount();
        if (usedWorldIdNullifierHashes[worldNullifierHash]) revert InvalidWorldIdNullifier();
        if (lastMarketCreationAt[msg.sender] + CREATION_COOLDOWN > block.timestamp) revert CreationRateLimited();

        MarketCreationRequest storage req = creationRequests[requestId];
        if (req.finalized) revert AlreadyFinalized();
        if (req.requester != msg.sender) revert NotRequester();

        worldId.verifyProof(
            worldRoot,
            WORLD_ID_GROUP_ID,
            _hashToField(abi.encodePacked(msg.sender)),
            worldNullifierHash,
            worldIdExternalNullifierHash,
            worldProof
        );

        (
            bool processed,
            bool approved,
            uint8 score,
            bool legitimate,
            bool clearTimeline,
            bool resolvable,
            bool binary,
            bytes32 proofHash
        ) = oracle.getValidationResult(req.oracleValidationRequestId);
        score;
        proofHash;

        if (!processed) revert ValidationPending();
        if (!approved || !legitimate || !clearTimeline || !resolvable || !binary) {
            revert ValidationRejected();
        }

        uint256 oracleMarketId = oracle.createMarketFromValidation(req.oracleValidationRequestId);
        marketId = _createMarketFromValidatedRequest(req, oracleMarketId, initialLiquidityYes, initialLiquidityNo);
        req.finalized = true;
        usedWorldIdNullifierHashes[worldNullifierHash] = true;
        lastMarketCreationAt[msg.sender] = block.timestamp;

        emit MarketCreationFinalized(requestId, marketId, oracleMarketId);
    }

    function _hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(value)) >> 8;
    }

    function createMarketVerified(
        string calldata question,
        uint256 deadline,
        uint256 initialLiquidityYes,
        uint256 initialLiquidityNo,
        uint256 worldRoot,
        uint256 worldNullifierHash,
        uint256[8] calldata worldProof
    ) external payable returns (uint256 marketId) {
        if (deadline <= block.timestamp) revert DeadlineMustBeFuture();
        if (msg.value != initialLiquidityYes + initialLiquidityNo) revert ZeroAmount();
        if ((initialLiquidityYes == 0) != (initialLiquidityNo == 0)) revert ZeroAmount();
        if (usedWorldIdNullifierHashes[worldNullifierHash]) revert InvalidWorldIdNullifier();
        if (lastMarketCreationAt[msg.sender] + CREATION_COOLDOWN > block.timestamp) revert CreationRateLimited();

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
        validationProofHash;
        if (!processed || !approved || !legitimate || !clearTimeline || !resolvable || !binary) {
            revert QuestionNotValidated();
        }

        worldId.verifyProof(
            worldRoot,
            WORLD_ID_GROUP_ID,
            _hashToField(abi.encodePacked(msg.sender)),
            worldNullifierHash,
            worldIdExternalNullifierHash,
            worldProof
        );

        uint256 oracleMarketId = oracle.createMarket(question, deadline);

        marketCount++;
        marketId = marketCount;

        (address yesToken, address noToken) = eotFactory.createTokenPair(
            marketId,
            question,
            address(this)
        );

        AEEIAPool pool = new AEEIAPool(yesToken, noToken, marketId);
        if (initialLiquidityYes > 0) {
            EventOutcomeToken(yesToken).mint(address(this), initialLiquidityYes);
            EventOutcomeToken(noToken).mint(address(this), initialLiquidityNo);
            EventOutcomeToken(yesToken).approve(address(pool), initialLiquidityYes);
            EventOutcomeToken(noToken).approve(address(pool), initialLiquidityNo);
            uint256 lpTokens = pool.addLiquidity(initialLiquidityYes, initialLiquidityNo);
            pool.transfer(msg.sender, lpTokens);
        }

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
        usedWorldIdNullifierHashes[worldNullifierHash] = true;
        lastMarketCreationAt[msg.sender] = block.timestamp;

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

    function _createMarketFromValidatedRequest(
        MarketCreationRequest storage req,
        uint256 oracleMarketId,
        uint256 initialLiquidityYes,
        uint256 initialLiquidityNo
    ) internal returns (uint256 marketId) {
        marketCount++;
        marketId = marketCount;

        (address yesToken, address noToken) = eotFactory.createTokenPair(
            marketId,
            req.question,
            address(this)
        );

        AEEIAPool pool = new AEEIAPool(yesToken, noToken, marketId);

        if (initialLiquidityYes > 0) {
            EventOutcomeToken(yesToken).mint(address(this), initialLiquidityYes);
            EventOutcomeToken(noToken).mint(address(this), initialLiquidityNo);
            EventOutcomeToken(yesToken).approve(address(pool), initialLiquidityYes);
            EventOutcomeToken(noToken).approve(address(pool), initialLiquidityNo);
            uint256 lpTokens = pool.addLiquidity(initialLiquidityYes, initialLiquidityNo);
            pool.transfer(msg.sender, lpTokens);
        }

        markets[marketId] = Market({
            oracleMarketId: oracleMarketId,
            question: req.question,
            deadline: req.deadline,
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
            req.question,
            req.deadline,
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
     * @notice Provide pool liquidity directly with ETH in one transaction
     * @param marketId The prediction market ID
     * @return lpTokens Amount of LP tokens minted to the provider
     * @dev Mints equal YES/NO to this contract, adds both into AMM, and transfers LP to user.
     */
    function provideLiquidity(uint256 marketId) external payable returns (uint256 lpTokens) {
        if (msg.value == 0) revert ZeroAmount();
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) revert AlreadySettled();
        if (block.timestamp >= market.deadline) revert MarketClosed();

        AEEIAPool pool = AEEIAPool(market.pool);

        EventOutcomeToken(market.yesToken).mint(address(this), msg.value);
        EventOutcomeToken(market.noToken).mint(address(this), msg.value);
        EventOutcomeToken(market.yesToken).approve(address(pool), msg.value);
        EventOutcomeToken(market.noToken).approve(address(pool), msg.value);

        lpTokens = pool.addLiquidity(msg.value, msg.value);
        pool.transfer(msg.sender, lpTokens);

        market.totalStaked += msg.value * 2;
    }

    /**
     * @notice Buy YES or NO outcome tokens directly with ETH in one transaction
     * @param marketId The prediction market ID
     * @param buyYes True to buy YES, false to buy NO
     * @param minSwapOut Minimum output from AMM swap leg for slippage protection
     * @return tokensOut Total outcome tokens received
     * @dev Internally mints balanced YES/NO from ETH and swaps the opposite side via AMM.
     */
    function buyOutcomeWithEth(
        uint256 marketId,
        bool buyYes,
        uint256 minSwapOut
    ) external payable returns (uint256 tokensOut) {
        if (msg.value == 0) revert ZeroAmount();
        if (marketId == 0 || marketId > marketCount) revert InvalidMarketId();

        Market storage market = markets[marketId];
        if (market.settled) revert AlreadySettled();
        if (block.timestamp >= market.deadline) revert MarketClosed();

        AEEIAPool pool = AEEIAPool(market.pool);
        EventOutcomeToken yesToken = EventOutcomeToken(market.yesToken);
        EventOutcomeToken noToken = EventOutcomeToken(market.noToken);

        yesToken.mint(address(this), msg.value);
        noToken.mint(address(this), msg.value);

        uint256 swappedOut;
        if (buyYes) {
            noToken.approve(address(pool), msg.value);
            swappedOut = pool.swap(true, msg.value, minSwapOut);
            tokensOut = msg.value + swappedOut;
            yesToken.transfer(msg.sender, tokensOut);
        } else {
            yesToken.approve(address(pool), msg.value);
            swappedOut = pool.swap(false, msg.value, minSwapOut);
            tokensOut = msg.value + swappedOut;
            noToken.transfer(msg.sender, tokensOut);
        }

        market.totalStaked += msg.value * 2;
        emit OutcomePurchased(marketId, msg.sender, buyYes, msg.value, tokensOut);
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
