# Deployment Guide (Sepolia + CRE)

## Prerequisites
- `forge`, `cast`, `bun`, `cre` CLI installed
- `PRIVATE_KEY`, `RPC_URL` set
- CRE workflow deployed or ready to deploy
- Sepolia forwarder address from Chainlink CRE docs

## 1) Bootstrap Foundry deps
```bash
cd /Users/kirillrybkov/Desktop/convergence-chainlink
./contracts/bootstrap-foundry.sh
```

## 2) Deploy contracts (recommended single step)
```bash
cd /Users/kirillrybkov/Desktop/convergence-chainlink/contracts
FORWARDER_ADDRESS=0x... \
PRIVATE_KEY=0x... \
forge script script/DeployAll.s.sol --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast
```

This deploys:
- `EOTFactory`
- `AletheiaOracle`
- `AletheiaMarket`
- and wires `oracle.setPredictionMarket(market)`

## 3) Deploy/activate CRE workflow
```bash
cd /Users/kirillrybkov/Desktop/convergence-chainlink/cre-workflow
cre workflow deploy . --target staging --env .env --yes
cre workflow activate aeeia-oracle --target staging --env .env --yes
```

## 4) Harden oracle receiver checks (recommended)
```bash
cd /Users/kirillrybkov/Desktop/convergence-chainlink/contracts
ORACLE_ADDRESS=0x... \
PREDICTION_MARKET_ADDRESS=0x... \
FORWARDER_ADDRESS=0x... \
EXPECTED_AUTHOR=0x... \
EXPECTED_WORKFLOW_NAME=aeeia-oracle \
EXPECTED_WORKFLOW_ID=0x... \
PRIVATE_KEY=0x... \
forge script script/ConfigureOracle.s.sol --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast
```

All env vars except `PRIVATE_KEY` are optional in this script, but production should set forwarder + expected workflow identity.

## 5) Frontend
Update frontend addresses in:
- `frontend/lib/contracts.ts`

Then run:
```bash
cd /Users/kirillrybkov/Desktop/convergence-chainlink/frontend
bun install
bun run build
```

## Notes
- CRE resolves oracle outcomes; oracle callback auto-settles `AletheiaMarket` when confidence threshold is met.
- Users only need wallet tx for market creation, token minting, and redemption.
