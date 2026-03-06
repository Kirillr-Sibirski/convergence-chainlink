# Aletheia

Aletheia is a binary prediction market with:
- permissionless market creation,
- AI validation + AI resolution via Chainlink CRE,
- ERC20 collateral trading (USDC-style collateral token).

## Stack

- `frontend`: Next.js 16 + Bun + viem
- `contracts`: Foundry Solidity contracts
- `cre-workflow`: Chainlink CRE TypeScript workflow
- `network`: Tenderly Virtual TestNet (forked from Ethereum mainnet state)

## Current Architecture

### Contracts

- `AletheiaOracle.sol`
  - Receives CRE reports through `ReceiverTemplate`
  - Stores question validation digests and market resolutions
  - Exposes pending validation + pending resolution queues for CRE
- `AletheiaMarket.sol`
  - `createMarketVerified(question, deadline, root, nullifierHash, proof)`
  - `placeBet(marketId, onYes, amount)` using ERC20 collateral
  - `sellShares(marketId, onYes, amount)` before deadline
  - `claimWinnings(marketId)` after settlement
- `MockUSDC.sol`
  - Test collateral token used for Tenderly deployments

### CRE Workflow

- `trigger-index 1`: HTTP trigger for question validation
- `trigger-index 0`: CRON trigger for resolving overdue markets
- Multi-model consensus uses OpenRouter models (Gemini, Claude, GPT, Grok)

### Frontend

- `/markets`: market list + creation flow
- `/markets/[id]`: trade UI (buy/sell), chart, history
- `/dashboard`: active/resolved positions + claim

## Tenderly Deployment (Current)

- Chain ID: `9991`
- RPC: `https://virtual.mainnet.eu.rpc.tenderly.co/a925c6c9-c7d7-4a9e-aa15-84f53ad13dce`

Deployed contracts:
- Oracle: `0x623f9f72342a3c2518c880d8372de90eaef200cd`
- Market: `0xb38f8a149f95850cb5eff5fce5621d36b8f8bbd0`
- Collateral token (MockUSDC): `0x7df5e8cc9e847afa8ec91d896c1fbad0fcb86c07`

Saved in:
- `contracts/deployments/tenderly-oracle.json`
- `contracts/deployments/tenderly-market.json`

## Setup

### 1) Frontend

```bash
cd frontend
bun install
cp .env.example .env.local
```

Set at minimum:
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_NETWORK_NAME`
- `NEXT_PUBLIC_ORACLE_ADDRESS`
- `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`
- `NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS`
- `NEXT_PUBLIC_COLLATERAL_SYMBOL`
- `NEXT_PUBLIC_COLLATERAL_DECIMALS`

Optional:
- `NEXT_PUBLIC_CRE_HTTP_TRIGGER_URL`
- `NEXT_PUBLIC_CRE_HTTP_TRIGGER_KEY`

### 2) Contracts

Create `contracts/.env`:
- `PRIVATE_KEY`
- `RPC_URL`
- `FORWARDER_ADDRESS`
- `WORLD_ID_ROUTER_ADDRESS`
- `WORLD_ID_APP_ID`
- `WORLD_ID_ACTION`

Optional:
- `COLLATERAL_TOKEN_ADDRESS` (if you want to use an existing ERC20 instead of deploying `MockUSDC`)

Deploy all:

```bash
cd contracts
set -a; source .env; set +a
forge script script/DeployAll.s.sol:DeployAllScript \
  --rpc-url "$RPC_URL" \
  --broadcast --slow
```

### 3) CRE Workflow

```bash
cd cre-workflow
bun install
```

`project.yaml` is configured to use Tenderly RPC for `ethereum-mainnet` selector.

`config.json` is configured with:
- `chainSelectorName: "ethereum-mainnet"`
- `isTestnet: false`
- oracle address pointing to current Tenderly deployment

Set secrets/env:
- `CRE_ETH_PRIVATE_KEY`
- `OPENROUTER_API_KEY_VAR`
- `CRE_TARGET=staging`

## Run

Frontend:

```bash
cd frontend
bun run dev
```

Type/build checks:

```bash
cd frontend && bun run build
cd cre-workflow && bun run build
cd contracts && forge build
```

## CRE Simulation Commands

From `cre-workflow` directory.

### Validate question (HTTP trigger)

```bash
cre workflow simulate . --non-interactive --trigger-index 1 \
  --http-payload '{"question":"Will ETH close above $5000?","deadline":1773273600}' \
  --broadcast -T staging
```

### Resolve overdue markets (CRON trigger)

```bash
cre workflow simulate . --non-interactive --trigger-index 0 --broadcast -T staging
```

Dry-run cron:

```bash
cre workflow simulate . --non-interactive --trigger-index 0 -T staging
```

## Notes

- Market creation now enforces World ID proof verification onchain in `AletheiaMarket.createMarketVerified`.
- Per-wallet one-market-per-day hard-enforcement remains disabled onchain (frontend warning only).
- Some Foundry commands may panic on this machine due a local `foundry-zksync` runtime issue; `forge build` and app/workflow builds are the reliable checks here.
