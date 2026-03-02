#!/usr/bin/env bash
set -euo pipefail

# Bootstraps Foundry dependencies for this repo.
# Uses submodules first, falls back to forge install.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS_DIR="${ROOT_DIR}/contracts"

cd "${ROOT_DIR}"

if [[ -f .gitmodules ]]; then
  echo "Initializing git submodules..."
  git submodule update --init --recursive || true
fi

if [[ ! -d "${ROOT_DIR}/lib/openzeppelin-contracts" || ! -d "${ROOT_DIR}/lib/forge-std" ]]; then
  echo "Submodules missing, attempting forge install fallback..."
  cd "${ROOT_DIR}"
  forge install --root "${ROOT_DIR}" OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std --no-git
fi

cd "${CONTRACTS_DIR}"
forge build

echo "Foundry bootstrap complete."
