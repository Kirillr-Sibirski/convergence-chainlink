// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title AEEIAPool
 * @notice Constant product AMM (x * y = k) for trading YES/NO outcome tokens
 * @dev Inspired by Uniswap V2 but simplified for binary markets
 *      Allows continuous trading of outcomes before market resolution
 */
contract AEEIAPool is ERC20 {
    using Math for uint256;

    IERC20 public immutable yesToken;
    IERC20 public immutable noToken;
    uint256 public immutable marketId;

    uint256 public reserveYes;
    uint256 public reserveNo;

    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    address private constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 private constant FEE_DENOMINATOR = 1000;
    uint256 public feeNumerator = 3; // 0.3% fee

    // Events
    event Swap(
        address indexed user,
        bool buyYes,
        uint256 amountIn,
        uint256 amountOut
    );

    event LiquidityAdded(
        address indexed provider,
        uint256 amountYes,
        uint256 amountNo,
        uint256 liquidity
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 amountYes,
        uint256 amountNo,
        uint256 liquidity
    );

    // Errors
    error InsufficientLiquidity();
    error InsufficientAmount();
    error InsufficientOutputAmount();
    error InvalidK();

    constructor(
        address _yesToken,
        address _noToken,
        uint256 _marketId
    ) ERC20(
        string(abi.encodePacked("AEEIA Pool #", _uint2str(_marketId))),
        string(abi.encodePacked("AEEIA-LP-", _uint2str(_marketId)))
    ) {
        yesToken = IERC20(_yesToken);
        noToken = IERC20(_noToken);
        marketId = _marketId;
    }

    /**
     * @notice Add liquidity to the pool
     * @param amountYes Amount of YES tokens to add
     * @param amountNo Amount of NO tokens to add
     * @return liquidity LP tokens minted
     */
    function addLiquidity(uint256 amountYes, uint256 amountNo)
        external
        returns (uint256 liquidity)
    {
        if (amountYes == 0 || amountNo == 0) revert InsufficientAmount();

        // Transfer tokens from user
        yesToken.transferFrom(msg.sender, address(this), amountYes);
        noToken.transferFrom(msg.sender, address(this), amountNo);

        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            // Initial liquidity: geometric mean
            liquidity = Math.sqrt(amountYes * amountNo) - MINIMUM_LIQUIDITY;
            _mint(DEAD_ADDRESS, MINIMUM_LIQUIDITY); // Lock minimum liquidity permanently
        } else {
            // Proportional liquidity
            liquidity = Math.min(
                (amountYes * _totalSupply) / reserveYes,
                (amountNo * _totalSupply) / reserveNo
            );
        }

        if (liquidity == 0) revert InsufficientLiquidity();

        _mint(msg.sender, liquidity);

        // Update reserves
        reserveYes += amountYes;
        reserveNo += amountNo;

        emit LiquidityAdded(msg.sender, amountYes, amountNo, liquidity);
    }

    /**
     * @notice Remove liquidity from the pool
     * @param liquidity Amount of LP tokens to burn
     * @return amountYes YES tokens returned
     * @return amountNo NO tokens returned
     */
    function removeLiquidity(uint256 liquidity)
        external
        returns (uint256 amountYes, uint256 amountNo)
    {
        if (liquidity == 0) revert InsufficientAmount();

        uint256 _totalSupply = totalSupply();

        // Calculate proportional amounts
        amountYes = (liquidity * reserveYes) / _totalSupply;
        amountNo = (liquidity * reserveNo) / _totalSupply;

        if (amountYes == 0 || amountNo == 0) revert InsufficientLiquidity();

        // Burn LP tokens
        _burn(msg.sender, liquidity);

        // Transfer tokens to user
        yesToken.transfer(msg.sender, amountYes);
        noToken.transfer(msg.sender, amountNo);

        // Update reserves
        reserveYes -= amountYes;
        reserveNo -= amountNo;

        emit LiquidityRemoved(msg.sender, amountYes, amountNo, liquidity);
    }

    /**
     * @notice Swap tokens (YES → NO or NO → YES)
     * @param buyYes True to buy YES (sell NO), false to buy NO (sell YES)
     * @param amountIn Amount of tokens to sell
     * @param minAmountOut Minimum amount of tokens to receive (slippage protection)
     * @return amountOut Amount of tokens received
     */
    function swap(bool buyYes, uint256 amountIn, uint256 minAmountOut)
        external
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InsufficientAmount();
        if (reserveYes == 0 || reserveNo == 0) revert InsufficientLiquidity();

        // Calculate output with 0.3% fee
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - feeNumerator);

        if (buyYes) {
            // Sell NO, buy YES
            amountOut = (amountInWithFee * reserveYes) /
                ((reserveNo * FEE_DENOMINATOR) + amountInWithFee);

            if (amountOut >= reserveYes) revert InsufficientLiquidity();
            if (amountOut < minAmountOut) revert InsufficientOutputAmount();

            // Transfer tokens
            noToken.transferFrom(msg.sender, address(this), amountIn);
            yesToken.transfer(msg.sender, amountOut);

            // Update reserves
            reserveNo += amountIn;
            reserveYes -= amountOut;
        } else {
            // Sell YES, buy NO
            amountOut = (amountInWithFee * reserveNo) /
                ((reserveYes * FEE_DENOMINATOR) + amountInWithFee);

            if (amountOut >= reserveNo) revert InsufficientLiquidity();
            if (amountOut < minAmountOut) revert InsufficientOutputAmount();

            // Transfer tokens
            yesToken.transferFrom(msg.sender, address(this), amountIn);
            noToken.transfer(msg.sender, amountOut);

            // Update reserves
            reserveYes += amountIn;
            reserveNo -= amountOut;
        }

        // Verify constant product (with fee adjustment)
        uint256 balanceYes = yesToken.balanceOf(address(this));
        uint256 balanceNo = noToken.balanceOf(address(this));
        if (balanceYes * balanceNo < reserveYes * reserveNo) revert InvalidK();

        emit Swap(msg.sender, buyYes, amountIn, amountOut);
    }

    /**
     * @notice Get current price of YES token in terms of NO tokens
     * @return price Price as a ratio (reserveNo / reserveYes * 1e18)
     */
    function getYesPrice() external view returns (uint256 price) {
        if (reserveYes == 0) return 0;
        return (reserveNo * 1e18) / reserveYes;
    }

    /**
     * @notice Get current price of NO token in terms of YES tokens
     * @return price Price as a ratio (reserveYes / reserveNo * 1e18)
     */
    function getNoPrice() external view returns (uint256 price) {
        if (reserveNo == 0) return 0;
        return (reserveYes * 1e18) / reserveNo;
    }

    /**
     * @notice Calculate output amount for a given input (before executing swap)
     * @param buyYes True to buy YES, false to buy NO
     * @param amountIn Input amount
     * @return amountOut Expected output amount
     */
    function getAmountOut(bool buyYes, uint256 amountIn)
        external
        view
        returns (uint256 amountOut)
    {
        if (amountIn == 0) return 0;
        if (reserveYes == 0 || reserveNo == 0) return 0;

        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - feeNumerator);

        if (buyYes) {
            amountOut = (amountInWithFee * reserveYes) /
                ((reserveNo * FEE_DENOMINATOR) + amountInWithFee);
        } else {
            amountOut = (amountInWithFee * reserveNo) /
                ((reserveYes * FEE_DENOMINATOR) + amountInWithFee);
        }
    }

    /**
     * @dev Convert uint256 to string (helper)
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
