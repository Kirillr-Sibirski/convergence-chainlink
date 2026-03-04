// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../AletheiaOracle.sol";
import "../AletheiaMarket.sol";

contract DeployAllScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address forwarderAddress = vm.envAddress("FORWARDER_ADDRESS");
        address worldIdAddress = vm.envAddress("WORLD_ID_ROUTER_ADDRESS");
        string memory worldIdAppId = vm.envString("WORLD_ID_APP_ID");
        string memory worldIdAction = vm.envString("WORLD_ID_ACTION");
        require(forwarderAddress != address(0), "FORWARDER_ADDRESS not set");
        require(worldIdAddress != address(0), "WORLD_ID_ROUTER_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Oracle
        console.log("Deploying AletheiaOracle...");
        console.log("Forwarder address:", forwarderAddress);
        AletheiaOracle oracle = new AletheiaOracle(forwarderAddress);
        console.log("AletheiaOracle deployed at:", address(oracle));

        // Deploy Market
        console.log("Deploying AletheiaMarket...");
        AletheiaMarket market = new AletheiaMarket(address(oracle), worldIdAddress, worldIdAppId, worldIdAction);
        console.log("AletheiaMarket deployed at:", address(market));

        // Wire oracle -> market callback for CRE-driven auto-settlement
        oracle.setPredictionMarket(address(market));
        console.log("Oracle predictionMarket set to:", address(market));

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Oracle:", address(oracle));
        console.log("Market:", address(market));
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Forwarder:", forwarderAddress);
        console.log("WorldID Router:", worldIdAddress);
    }
}
