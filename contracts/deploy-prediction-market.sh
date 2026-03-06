#!/usr/bin/env bash
set -euo pipefail

# Deploy AletheiaMarket and wire Oracle callback.
# Prereqs:
# - oracle already deployed and set in ORACLE_ADDRESS
# Usage:
#   PRIVATE_KEY=0x... RPC_URL=https://... ./contracts/deploy-prediction-market.sh

: "${PRIVATE_KEY:?PRIVATE_KEY is required}"
: "${RPC_URL:?RPC_URL is required}"

echo "Deploying AletheiaMarket and wiring oracle callback..."
forge script script/DeployMarket.s.sol \
  --rpc-url "${RPC_URL}" \
  --private-key "${PRIVATE_KEY}" \
  --broadcast

echo "Done."
