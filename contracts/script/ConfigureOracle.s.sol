// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "../AletheiaOracle.sol";

/**
 * @title Configure Oracle Script
 * @notice Configures receiver security + callback wiring after deploy
 *
 * Env vars:
 * - PRIVATE_KEY (required)
 * - ORACLE_ADDRESS (optional if deployments/sepolia-oracle.json exists)
 * - PREDICTION_MARKET_ADDRESS (optional if deployments/sepolia-market.json exists)
 * - FORWARDER_ADDRESS (optional)
 * - EXPECTED_AUTHOR (optional)
 * - EXPECTED_WORKFLOW_NAME (optional)
 * - EXPECTED_WORKFLOW_ID (optional bytes32 hex)
 */
contract ConfigureOracleScript is Script {
    using stdJson for string;

    function _loadOracleAddress() internal returns (address) {
        if (vm.envExists("ORACLE_ADDRESS")) {
            return vm.envAddress("ORACLE_ADDRESS");
        }

        string memory oracleJson = vm.readFile("deployments/sepolia-oracle.json");
        return oracleJson.readAddress(".oracle");
    }

    function _loadMarketAddress() internal returns (address) {
        if (vm.envExists("PREDICTION_MARKET_ADDRESS")) {
            return vm.envAddress("PREDICTION_MARKET_ADDRESS");
        }

        string memory marketJson = vm.readFile("deployments/sepolia-market.json");
        return marketJson.readAddress(".market");
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = _loadOracleAddress();
        address marketAddress = _loadMarketAddress();

        require(oracleAddress != address(0), "Oracle address not found");
        require(marketAddress != address(0), "Market address not found");

        AletheiaOracle oracle = AletheiaOracle(oracleAddress);

        vm.startBroadcast(deployerPrivateKey);

        oracle.setPredictionMarket(marketAddress);
        console.log("Prediction market set:", marketAddress);

        if (vm.envExists("FORWARDER_ADDRESS")) {
            address forwarder = vm.envAddress("FORWARDER_ADDRESS");
            oracle.setForwarderAddress(forwarder);
            console.log("Forwarder set:", forwarder);
        }

        if (vm.envExists("EXPECTED_AUTHOR")) {
            address author = vm.envAddress("EXPECTED_AUTHOR");
            oracle.setExpectedAuthor(author);
            console.log("Expected author set:", author);
        }

        if (vm.envExists("EXPECTED_WORKFLOW_NAME")) {
            string memory wfName = vm.envString("EXPECTED_WORKFLOW_NAME");
            oracle.setExpectedWorkflowName(wfName);
            console.log("Expected workflow name set:", wfName);
        }

        if (vm.envExists("EXPECTED_WORKFLOW_ID")) {
            bytes32 wfId = vm.envBytes32("EXPECTED_WORKFLOW_ID");
            oracle.setExpectedWorkflowId(wfId);
            console.logBytes32(wfId);
        }

        vm.stopBroadcast();
    }
}
