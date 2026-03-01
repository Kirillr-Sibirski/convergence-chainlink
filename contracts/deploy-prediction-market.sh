#!/bin/bash

# Deploy DemoPredictionMarket contract to Sepolia
# Usage: DEPLOYER_PRIVATE_KEY=0x... ./contracts/deploy-prediction-market.sh

set -e

ORACLE_ADDRESS="0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e"

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "Error: DEPLOYER_PRIVATE_KEY environment variable not set"
    echo "Usage: DEPLOYER_PRIVATE_KEY=0x... ./contracts/deploy-prediction-market.sh"
    exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  Deploying DemoPredictionMarket Contract to Sepolia"
echo "═══════════════════════════════════════════════════════"
echo "Oracle Address: $ORACLE_ADDRESS"
echo ""

forge create contracts/DemoPredictionMarket.sol:DemoPredictionMarket \
  --rpc-url https://rpc.sepolia.org \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args $ORACLE_ADDRESS \
  --optimize \
  --optimizer-runs 200

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Copy the 'Deployed to:' address above"
echo "2. Update frontend/lib/contracts.ts PREDICTION_MARKET_ADDRESS"
echo "3. Test the integration"
