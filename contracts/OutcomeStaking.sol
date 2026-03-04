// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OutcomeStaking
 * @notice Stake YES/NO outcome tokens to earn AEEIA rewards.
 */
contract OutcomeStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct PoolInfo {
        IERC20 stakingToken;
        string label;
        uint256 marketId;
        bool isYes;
        uint256 totalStaked;
        uint256 accRewardPerShare; // 1e18 scale
        uint256 lastRewardTime;
        uint256 rewardRate; // reward tokens per second
        uint256 periodFinish;
    }

    IERC20 public immutable rewardToken;
    uint256 public poolCount;

    mapping(uint256 => PoolInfo) public pools;
    mapping(uint256 => mapping(address => uint256)) public userStaked;
    mapping(uint256 => mapping(address => uint256)) public userRewardDebt;
    mapping(uint256 => mapping(address => uint256)) public pending;

    event PoolCreated(uint256 indexed poolId, address stakingToken, uint256 indexed marketId, bool isYes, string label);
    event RewardNotified(uint256 indexed poolId, uint256 amount, uint256 duration, uint256 rewardRate);
    event Staked(uint256 indexed poolId, address indexed user, uint256 amount);
    event Withdrawn(uint256 indexed poolId, address indexed user, uint256 amount);
    event RewardsClaimed(uint256 indexed poolId, address indexed user, uint256 amount);

    error InvalidPool();
    error InvalidAmount();
    error ZeroAddress();

    constructor(address _rewardToken) Ownable(msg.sender) {
        if (_rewardToken == address(0)) revert ZeroAddress();
        rewardToken = IERC20(_rewardToken);
    }

    function createPool(
        address stakingToken,
        string memory label,
        uint256 marketId,
        bool isYes
    ) public onlyOwner returns (uint256 poolId) {
        if (stakingToken == address(0)) revert ZeroAddress();

        poolId = ++poolCount;
        pools[poolId] = PoolInfo({
            stakingToken: IERC20(stakingToken),
            label: label,
            marketId: marketId,
            isYes: isYes,
            totalStaked: 0,
            accRewardPerShare: 0,
            lastRewardTime: block.timestamp,
            rewardRate: 0,
            periodFinish: 0
        });

        emit PoolCreated(poolId, stakingToken, marketId, isYes, label);
    }

    function notifyRewardAmount(uint256 poolId, uint256 amount, uint256 duration) external onlyOwner {
        if (poolId == 0 || poolId > poolCount) revert InvalidPool();
        if (amount == 0 || duration == 0) revert InvalidAmount();

        PoolInfo storage p = pools[poolId];
        _updatePool(poolId);

        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 leftover;
        if (block.timestamp < p.periodFinish) {
            uint256 remaining = p.periodFinish - block.timestamp;
            leftover = remaining * p.rewardRate;
        }

        p.rewardRate = (amount + leftover) / duration;
        p.lastRewardTime = block.timestamp;
        p.periodFinish = block.timestamp + duration;

        emit RewardNotified(poolId, amount, duration, p.rewardRate);
    }

    function stake(uint256 poolId, uint256 amount) external nonReentrant {
        if (poolId == 0 || poolId > poolCount) revert InvalidPool();
        if (amount == 0) revert InvalidAmount();

        _updatePool(poolId);
        _accrue(poolId, msg.sender);

        PoolInfo storage p = pools[poolId];
        p.stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        userStaked[poolId][msg.sender] += amount;
        p.totalStaked += amount;
        userRewardDebt[poolId][msg.sender] = (userStaked[poolId][msg.sender] * p.accRewardPerShare) / 1e18;

        emit Staked(poolId, msg.sender, amount);
    }

    function withdraw(uint256 poolId, uint256 amount) external nonReentrant {
        if (poolId == 0 || poolId > poolCount) revert InvalidPool();
        if (amount == 0) revert InvalidAmount();

        PoolInfo storage p = pools[poolId];
        uint256 stakedBal = userStaked[poolId][msg.sender];
        if (amount > stakedBal) revert InvalidAmount();

        _updatePool(poolId);
        _accrue(poolId, msg.sender);

        userStaked[poolId][msg.sender] = stakedBal - amount;
        p.totalStaked -= amount;
        userRewardDebt[poolId][msg.sender] = (userStaked[poolId][msg.sender] * p.accRewardPerShare) / 1e18;

        p.stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(poolId, msg.sender, amount);
    }

    function claim(uint256 poolId) external nonReentrant {
        if (poolId == 0 || poolId > poolCount) revert InvalidPool();

        _updatePool(poolId);
        _accrue(poolId, msg.sender);
        uint256 reward = _claim(poolId, msg.sender);
        userRewardDebt[poolId][msg.sender] = (userStaked[poolId][msg.sender] * pools[poolId].accRewardPerShare) / 1e18;

        if (reward > 0) {
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardsClaimed(poolId, msg.sender, reward);
        }
    }

    function pendingRewards(uint256 poolId, address user) external view returns (uint256) {
        if (poolId == 0 || poolId > poolCount) revert InvalidPool();
        PoolInfo memory p = pools[poolId];

        uint256 acc = p.accRewardPerShare;
        if (block.timestamp > p.lastRewardTime && p.totalStaked != 0) {
            uint256 toTime = block.timestamp < p.periodFinish ? block.timestamp : p.periodFinish;
            if (toTime > p.lastRewardTime) {
                uint256 reward = (toTime - p.lastRewardTime) * p.rewardRate;
                acc += (reward * 1e18) / p.totalStaked;
            }
        }

        uint256 accrued = (userStaked[poolId][user] * acc) / 1e18;
        uint256 debt = userRewardDebt[poolId][user];
        return pending[poolId][user] + (accrued > debt ? accrued - debt : 0);
    }

    function _updatePool(uint256 poolId) internal {
        PoolInfo storage p = pools[poolId];
        uint256 from = p.lastRewardTime;
        uint256 to = block.timestamp < p.periodFinish ? block.timestamp : p.periodFinish;

        if (to <= from) return;

        if (p.totalStaked == 0) {
            p.lastRewardTime = to;
            return;
        }

        uint256 reward = (to - from) * p.rewardRate;
        p.accRewardPerShare += (reward * 1e18) / p.totalStaked;
        p.lastRewardTime = to;
    }

    function _accrue(uint256 poolId, address user) internal {
        PoolInfo storage p = pools[poolId];
        uint256 accrued = (userStaked[poolId][user] * p.accRewardPerShare) / 1e18;
        uint256 debt = userRewardDebt[poolId][user];

        if (accrued > debt) {
            pending[poolId][user] += accrued - debt;
        }
    }

    function _claim(uint256 poolId, address user) internal returns (uint256 reward) {
        reward = pending[poolId][user];
        pending[poolId][user] = 0;
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 j = v;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory b = new bytes(len);
        while (v != 0) {
            len--;
            b[len] = bytes1(uint8(48 + v % 10));
            v /= 10;
        }
        return string(b);
    }
}
