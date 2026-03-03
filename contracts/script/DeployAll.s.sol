// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../EOTFactory.sol";
import "../AletheiaOracle.sol";
import "../AletheiaMarket.sol";
import "../AEEIAToken.sol";
import "../OutcomeStaking.sol";

contract DeployAllScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address forwarderAddress = vm.envAddress("FORWARDER_ADDRESS");
        address worldIdAddress = vm.envAddress("WORLD_ID_ROUTER_ADDRESS");
        uint256 worldIdExternalNullifierHash = vm.envUint("WORLD_ID_EXTERNAL_NULLIFIER_HASH");
        require(forwarderAddress != address(0), "FORWARDER_ADDRESS not set");
        require(worldIdAddress != address(0), "WORLD_ID_ROUTER_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Factory
        console.log("Deploying EOTFactory...");
        EOTFactory factory = new EOTFactory();
        console.log("EOTFactory deployed at:", address(factory));

        // Deploy Oracle
        console.log("Deploying AletheiaOracle...");
        console.log("Forwarder address:", forwarderAddress);
        AletheiaOracle oracle = new AletheiaOracle(forwarderAddress);
        console.log("AletheiaOracle deployed at:", address(oracle));

        // Deploy Market
        console.log("Deploying AletheiaMarket...");
        AletheiaMarket market = new AletheiaMarket(
            address(oracle),
            address(factory),
            worldIdAddress,
            worldIdExternalNullifierHash
        );
        console.log("AletheiaMarket deployed at:", address(market));

        // Wire oracle -> market callback for CRE-driven auto-settlement
        oracle.setPredictionMarket(address(market));
        console.log("Oracle predictionMarket set to:", address(market));

        // Deploy AEEIA reward token + staking
        console.log("Deploying AEEIAToken...");
        AEEIAToken aeeiaToken = new AEEIAToken();
        console.log("AEEIAToken deployed at:", address(aeeiaToken));

        console.log("Deploying OutcomeStaking...");
        OutcomeStaking staking = new OutcomeStaking(address(aeeiaToken));
        console.log("OutcomeStaking deployed at:", address(staking));

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Factory:", address(factory));
        console.log("Oracle:", address(oracle));
        console.log("Market:", address(market));
        console.log("AEEIA Token:", address(aeeiaToken));
        console.log("Staking:", address(staking));
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Forwarder:", forwarderAddress);
    }
}
