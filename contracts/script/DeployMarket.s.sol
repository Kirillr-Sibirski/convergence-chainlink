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
        bool disableSafetyForTesting = false;
        if (vm.envExists("DISABLE_SAFETY_FOR_TESTING")) {
            string memory raw = vm.envString("DISABLE_SAFETY_FOR_TESTING");
            bytes32 hashed = keccak256(bytes(raw));
            disableSafetyForTesting =
                hashed == keccak256(bytes("1")) ||
                hashed == keccak256(bytes("true")) ||
                hashed == keccak256(bytes("TRUE"));
        }
        address worldIdAddress = vm.envAddress("WORLD_ID_ROUTER_ADDRESS");
        address collateralTokenAddress = vm.envAddress("COLLATERAL_TOKEN_ADDRESS");
        string memory worldIdAppId = vm.envString("WORLD_ID_APP_ID");
        string memory worldIdAction = vm.envString("WORLD_ID_ACTION");
        require(worldIdAddress != address(0), "WORLD_ID_ROUTER_ADDRESS not set");
        require(collateralTokenAddress != address(0), "COLLATERAL_TOKEN_ADDRESS not set");
        address oracleAddress = _loadOracleAddress();

        require(oracleAddress != address(0), "Oracle address not found");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying AletheiaMarket...");
        console.log("Oracle address:", oracleAddress);
        console.log("Collateral token:", collateralTokenAddress);
        AletheiaMarket market =
            new AletheiaMarket(oracleAddress, collateralTokenAddress, worldIdAddress, worldIdAppId, worldIdAction);
        console.log("AletheiaMarket deployed at:", address(market));
        if (disableSafetyForTesting) {
            market.setDailyMarketCreationLimitEnabled(false);
            market.setWorldIdNullifierUniquenessEnabled(false);
            console.log("Market creation 24h limit disabled (testing mode)");
            console.log("World ID nullifier uniqueness disabled (testing mode)");
        } else {
            console.log("Safety flags left at contract defaults");
        }

        // Wire oracle -> market callback for CRE-driven auto-settlement
        AletheiaOracle(oracleAddress).setPredictionMarket(address(market));
        console.log("Oracle predictionMarket set to:", address(market));

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("Contract addresses:");
        console.log("  Oracle:", oracleAddress);
        console.log("  Market:", address(market));
        console.log("  Collateral:", collateralTokenAddress);
    }
}
