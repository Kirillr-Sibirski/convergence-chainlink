// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../AEEIAToken.sol";
import "../OutcomeStaking.sol";

/**
 * @title Deploy Staking Script
 * @notice Deploys AEEIAToken and OutcomeStaking
 */
contract DeployStakingScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        AEEIAToken token = new AEEIAToken();
        OutcomeStaking staking = new OutcomeStaking(address(token));

        vm.stopBroadcast();

        console.log("AEEIAToken:", address(token));
        console.log("OutcomeStaking:", address(staking));
    }
}
