// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../EOTFactory.sol";
import "../AletheiaMarket.sol";

/**
 * @title Deploy Script for AEEIA Contracts
 * @notice Deploys all contracts to Sepolia testnet
 *
 * Usage:
 * 1. Set environment variables:
 *    export PRIVATE_KEY=your_private_key
 *    export RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
 *
 * 2. Run deployment:
 *    forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
 *
 * NOTE: AletheiaOracle requires forwarder address from CRE deployment
 *       Deploy CRE workflow first, then deploy oracle with forwarder address
 */
contract DeployScript is Script {
    function run() external {
        // Read deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy EOTFactory
        console.log("Deploying EOTFactory...");
        EOTFactory factory = new EOTFactory();
        console.log("EOTFactory deployed at:", address(factory));

        // 2. Deploy AletheiaOracle (PLACEHOLDER - requires forwarder address)
        // NOTE: Run DeployOracle.s.sol AFTER CRE workflow deployment
        console.log("");
        console.log("=== IMPORTANT ===");
        console.log("Next steps:");
        console.log("1. Deploy CRE workflow to get forwarder address");
        console.log("2. Run: forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast");
        console.log("3. Run: forge script script/DeployMarket.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast");

        vm.stopBroadcast();

        // Save addresses to file
        string memory deploymentInfo = string(abi.encodePacked(
            "{\n",
            '  "factory": "', vm.toString(address(factory)), '",\n',
            '  "network": "sepolia",\n',
            '  "deployer": "', vm.toString(vm.addr(deployerPrivateKey)), '"\n',
            "}"
        ));

        vm.writeFile("deployments/sepolia-factory.json", deploymentInfo);
        console.log("");
        console.log("Deployment info saved to: deployments/sepolia-factory.json");
    }
}
