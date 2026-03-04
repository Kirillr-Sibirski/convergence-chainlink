// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "../AletheiaMarket.sol";
import "../AletheiaOracle.sol";

/**
 * @title Deploy Market Script
 * @notice Deploys AletheiaMarket contract
 *
 * Usage:
 * forge script script/DeployMarket.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract DeployMarketScript is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address worldIdAddress = vm.envAddress("WORLD_ID_ROUTER_ADDRESS");
        string memory worldIdAppId = vm.envString("WORLD_ID_APP_ID");
        string memory worldIdAction = vm.envString("WORLD_ID_ACTION");
        require(worldIdAddress != address(0), "WORLD_ID_ROUTER_ADDRESS not set");

        string memory oracleJson = vm.readFile("deployments/sepolia-oracle.json");
        address oracleAddress = oracleJson.readAddress(".oracle");

        require(oracleAddress != address(0), "Oracle address not found");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying AletheiaMarket...");
        console.log("Oracle address:", oracleAddress);
        AletheiaMarket market = new AletheiaMarket(oracleAddress, worldIdAddress, worldIdAppId, worldIdAction);
        console.log("AletheiaMarket deployed at:", address(market));

        // Wire oracle -> market callback for CRE-driven auto-settlement
        AletheiaOracle(oracleAddress).setPredictionMarket(address(market));
        console.log("Oracle predictionMarket set to:", address(market));

        vm.stopBroadcast();

        // Save deployment info
        string memory deploymentInfo = string(abi.encodePacked(
            "{\n",
            '  "market": "', vm.toString(address(market)), '",\n',
            '  "oracle": "', vm.toString(oracleAddress), '",\n',
            '  "network": "sepolia"\n',
            "}"
        ));

        vm.writeFile("deployments/sepolia-market.json", deploymentInfo);
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("Deployment info saved to: deployments/sepolia-market.json");
        console.log("");
        console.log("Contract addresses:");
        console.log("  Oracle:", oracleAddress);
        console.log("  Market:", address(market));
    }
}
