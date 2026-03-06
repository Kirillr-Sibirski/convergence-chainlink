// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../AletheiaOracle.sol";

/**
 * @title Deploy Oracle Script
 * @notice Deploys AletheiaOracle with CRE forwarder address
 *
 * Usage:
 * export FORWARDER_ADDRESS=<address_from_cre_deployment>
 * forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract DeployOracleScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address forwarderAddress = vm.envAddress("FORWARDER_ADDRESS");

        require(forwarderAddress != address(0), "FORWARDER_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying AletheiaOracle...");
        console.log("Forwarder address:", forwarderAddress);

        AletheiaOracle oracle = new AletheiaOracle(forwarderAddress);
        console.log("AletheiaOracle deployed at:", address(oracle));

        vm.stopBroadcast();

        string memory deploymentTag = "tenderly";
        if (vm.envExists("DEPLOYMENT_TAG")) {
            deploymentTag = vm.envString("DEPLOYMENT_TAG");
        }

        // Save deployment info
        string memory deploymentInfo = string(abi.encodePacked(
            "{\n",
            '  "oracle": "', vm.toString(address(oracle)), '",\n',
            '  "forwarder": "', vm.toString(forwarderAddress), '",\n',
            '  "network": "', deploymentTag, '"\n',
            "}"
        ));

        string memory outputPath = string(abi.encodePacked("deployments/", deploymentTag, "-oracle.json"));
        vm.writeFile(outputPath, deploymentInfo);
        console.log("Deployment info saved to:", outputPath);
    }
}
