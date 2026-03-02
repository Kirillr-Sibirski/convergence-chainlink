#!/usr/bin/env bash
set -euo pipefail

# Deploy AletheiaMarket and wire Oracle callback.
# Prereqs:
# - contracts/deployments/sepolia-factory.json exists
# - contracts/deployments/sepolia-oracle.json exists
# Usage:
#   PRIVATE_KEY=0x... RPC_URL=https://... ./contracts/deploy-prediction-market.sh

: "${PRIVATE_KEY:?PRIVATE_KEY is required}"
: "${RPC_URL:?RPC_URL is required}"

echo "Deploying AletheiaMarket and wiring oracle callback..."
forge script script/DeployMarket.s.sol \
  --rpc-url "${RPC_URL}" \
  --private-key "${PRIVATE_KEY}" \
  --broadcast

echo "Done. Deployment file: contracts/deployments/sepolia-market.json"
