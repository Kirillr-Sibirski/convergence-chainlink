// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../AletheiaOracle.sol";
import "../AletheiaMarket.sol";
import "../MockUSDC.sol";

contract DeployAllScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address forwarderAddress = vm.envAddress("FORWARDER_ADDRESS");
        address worldIdAddress = vm.envAddress("WORLD_ID_ROUTER_ADDRESS");
        string memory worldIdAppId = vm.envString("WORLD_ID_APP_ID");
        string memory worldIdAction = vm.envString("WORLD_ID_ACTION");
        bool disableSafetyForTesting = false;
        if (vm.envExists("DISABLE_SAFETY_FOR_TESTING")) {
            string memory raw = vm.envString("DISABLE_SAFETY_FOR_TESTING");
            bytes32 hashed = keccak256(bytes(raw));
            disableSafetyForTesting =
                hashed == keccak256(bytes("1")) ||
                hashed == keccak256(bytes("true")) ||
                hashed == keccak256(bytes("TRUE"));
        }
        require(forwarderAddress != address(0), "FORWARDER_ADDRESS not set");
        require(worldIdAddress != address(0), "WORLD_ID_ROUTER_ADDRESS not set");

        bool hasCollateralToken = vm.envExists("COLLATERAL_TOKEN_ADDRESS");
        address collateralTokenAddress = hasCollateralToken
            ? vm.envAddress("COLLATERAL_TOKEN_ADDRESS")
            : address(0);

        vm.startBroadcast(deployerPrivateKey);

        if (!hasCollateralToken || collateralTokenAddress == address(0)) {
            console.log("Deploying MockUSDC collateral token...");
            MockUSDC collateral = new MockUSDC(vm.addr(deployerPrivateKey));
            collateralTokenAddress = address(collateral);
            collateral.mint(vm.addr(deployerPrivateKey), 1_000_000 ether);
            console.log("MockUSDC deployed at:", collateralTokenAddress);
        } else {
            console.log("Using existing collateral token:", collateralTokenAddress);
        }

        // Deploy Oracle
        console.log("Deploying AletheiaOracle...");
        console.log("Forwarder address:", forwarderAddress);
        AletheiaOracle oracle = new AletheiaOracle(forwarderAddress);
        console.log("AletheiaOracle deployed at:", address(oracle));

        // Deploy Market
        console.log("Deploying AletheiaMarket...");
        AletheiaMarket market =
            new AletheiaMarket(address(oracle), collateralTokenAddress, worldIdAddress, worldIdAppId, worldIdAction);
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
        oracle.setPredictionMarket(address(market));
        console.log("Oracle predictionMarket set to:", address(market));

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Oracle:", address(oracle));
        console.log("Market:", address(market));
        console.log("Collateral Token:", collateralTokenAddress);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Forwarder:", forwarderAddress);
        console.log("WorldID Router:", worldIdAddress);
    }
}
