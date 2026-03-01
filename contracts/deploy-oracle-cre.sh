#!/bin/bash
# Deploy AletheiaOracle with CRE ReceiverTemplate integration
# Forwarder addresses from: https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts

# Sepolia MockKeystoneForwarder (for simulation/testing)
MOCK_FORWARDER="0x0000000000000000000000000000000000000000" # Replace with actual mock forwarder if available

# Sepolia KeystoneForwarder (production) - CHECK LATEST DOCS
# As of documentation, Sepolia production forwarder should be updated from official CRE docs
SEPOLIA_FORWARDER="0x0000000000000000000000000000000000000000" # MUST UPDATE with real forwarder address

echo "🚀 Deploying AletheiaOracle with CRE ReceiverTemplate..."
echo ""
echo "⚠️  IMPORTANT: Update SEPOLIA_FORWARDER address from"
echo "    https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts"
echo ""

# For now, deploy with zero address (allows anyone to call - INSECURE but works for testing)
# Replace with real forwarder for production
forge create contracts/AletheiaOracle.sol:AletheiaOracle \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key ${DEPLOYER_PRIVATE_KEY} \
  --constructor-args "${MOCK_FORWARDER}" \
  --legacy

echo ""
echo "⚠️  Contract deployed with ZERO address forwarder (TESTING ONLY)"
echo "   Run setForwarderAddress() after deployment to set the real Sepolia forwarder"
