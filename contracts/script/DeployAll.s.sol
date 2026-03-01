// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../EOTFactory.sol";
import "../AletheiaOracle.sol";
import "../AletheiaMarket.sol";

contract DeployAllScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address forwarderAddress = vm.envOr("FORWARDER_ADDRESS", vm.addr(deployerPrivateKey));

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
        AletheiaMarket market = new AletheiaMarket(address(oracle), address(factory));
        console.log("AletheiaMarket deployed at:", address(market));

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Factory:", address(factory));
        console.log("Oracle:", address(oracle));
        console.log("Market:", address(market));
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Forwarder:", forwarderAddress);
    }
}
