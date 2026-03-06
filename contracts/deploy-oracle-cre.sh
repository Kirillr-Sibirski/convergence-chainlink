#!/usr/bin/env bash
set -euo pipefail

# Deploy Oracle with valid CRE forwarder.
# Usage:
#   PRIVATE_KEY=0x... RPC_URL=https://... FORWARDER_ADDRESS=0x... ./contracts/deploy-oracle-cre.sh

: "${PRIVATE_KEY:?PRIVATE_KEY is required}"
: "${RPC_URL:?RPC_URL is required}"
: "${FORWARDER_ADDRESS:?FORWARDER_ADDRESS is required}"

echo "Deploying AletheiaOracle with FORWARDER_ADDRESS=${FORWARDER_ADDRESS}"
forge script script/DeployOracle.s.sol \
  --rpc-url "${RPC_URL}" \
  --private-key "${PRIVATE_KEY}" \
  --broadcast

echo "Done."
