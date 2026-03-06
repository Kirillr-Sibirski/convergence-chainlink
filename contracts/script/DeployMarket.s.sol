// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
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
    function _loadOracleAddress() internal returns (address) {
        require(vm.envExists("ORACLE_ADDRESS"), "ORACLE_ADDRESS not set");
        return vm.envAddress("ORACLE_ADDRESS");
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address worldIdAddress = vm.envAddress("WORLD_ID_ROUTER_ADDRESS");
        string memory worldIdAppId = vm.envString("WORLD_ID_APP_ID");
        string memory worldIdAction = vm.envString("WORLD_ID_ACTION");
        require(worldIdAddress != address(0), "WORLD_ID_ROUTER_ADDRESS not set");
        address oracleAddress = _loadOracleAddress();

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

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("Contract addresses:");
        console.log("  Oracle:", oracleAddress);
        console.log("  Market:", address(market));
    }
}
