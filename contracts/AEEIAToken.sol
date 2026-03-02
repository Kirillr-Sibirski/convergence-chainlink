// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AEEIAToken
 * @notice Protocol reward token used for staking incentives.
 */
contract AEEIAToken is ERC20, Ownable {
    constructor() ERC20("AEEIA Token", "AEEIA") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
