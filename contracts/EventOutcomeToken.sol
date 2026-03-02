// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventOutcomeToken
 * @notice ERC-20 token representing a specific outcome (YES or NO) in a prediction market
 * @dev Minted 1:1 when users stake ETH, burned on redemption after resolution
 *      Freely tradeable on AMMs or DEXs during market lifetime
 */
contract EventOutcomeToken is ERC20, Ownable {
    // Market that controls this token
    address public immutable market;

    // Market ID this token belongs to
    uint256 public immutable marketId;

    // Whether this is YES (true) or NO (false) token
    bool public immutable isYesToken;

    // Whether redemption is enabled (after market resolution)
    bool public redemptionEnabled;

    // Redemption rate: wei per token (set after resolution)
    uint256 public redemptionRate;

    // Events
    event RedemptionEnabled(uint256 redemptionRate);
    event TokensRedeemed(address indexed user, uint256 amount, uint256 payout);

    // Errors
    error OnlyMarket();
    error RedemptionNotEnabled();
    error InsufficientBalance();
    error UseMarketRedeem();

    modifier onlyMarket() {
        if (msg.sender != market) revert OnlyMarket();
        _;
    }

    /**
     * @param _name Token name (e.g., "AEEIA Market #1 YES")
     * @param _symbol Token symbol (e.g., "AEEIA-1-YES")
     * @param _market Address of the market contract that can mint/burn
     * @param _marketId ID of the market
     * @param _isYesToken True if this is YES token, false for NO token
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _market,
        uint256 _marketId,
        bool _isYesToken
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        market = _market;
        marketId = _marketId;
        isYesToken = _isYesToken;
    }

    /**
     * @notice Mint tokens to a user (only callable by market contract)
     * @param to Address to mint to
     * @param amount Amount to mint (in wei, 1:1 with ETH staked)
     */
    function mint(address to, uint256 amount) external onlyMarket {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from a user (only callable by market contract)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyMarket {
        _burn(from, amount);
    }

    /**
     * @notice Enable redemption and set the rate (only callable by market after resolution)
     * @param rate Wei per token that holders can claim
     */
    function enableRedemption(uint256 rate) external onlyMarket {
        redemptionEnabled = true;
        redemptionRate = rate;
        emit RedemptionEnabled(rate);
    }

    /**
     * @notice Redeem all tokens for ETH (after market resolution)
     * @dev Burns user's tokens and transfers ETH based on redemption rate
     */
    function redeem() external returns (uint256 payout) {
        // Redemption is managed by AletheiaMarket.redeemTokens() to keep payout accounting in one place.
        revert UseMarketRedeem();
    }

}
