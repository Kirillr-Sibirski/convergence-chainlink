# Aletheia

Aletheia is a binary prediction market with:
- permissionless market creation,
- AI validation + AI resolution via Chainlink CRE,
- ERC20 collateral trading (USDC-style collateral token).

## Submission Copy (Ready to Reuse)

### 1-line description

Permissionless prediction markets with CRE-orchestrated AI consensus for validation and settlement.

### Full project description

Aletheia is a binary prediction market designed to reduce oracle trust assumptions and remove centralized market listing bottlenecks.

The core issue we target is that market resolution can be slow, opaque, or vulnerable when it depends on a single party or weakly accountable process. Aletheia uses Chainlink CRE workflows to orchestrate multi-model AI consensus for both market validation and final resolution.

How it works:
- Market creation is permissionless: any user can submit a binary question plus resolution deadline.
- Before creation, the question is validated by a CRE HTTP workflow using multiple AI models (via OpenRouter). The models score legitimacy, timeline clarity, resolvability, and binary structure.
- If consensus checks pass and score thresholds are met, a validation report is written onchain and the market can be created.
- After deadlines, a CRE cron workflow evaluates due markets, runs multi-model consensus on outcome, and writes signed resolution reports onchain.
- World ID is integrated into market creation to reduce sybil spam. A one-market-per-day policy is implemented in-contract and can be enforced in production configuration.

What problem this solves:
- Faster and more autonomous market operations (less admin/manual intervention).
- More robust resolution path than relying on a single human or oracle source.
- Open market creation without centralized gatekeeping.
- Better spam resistance for permissionless market listing.

### How it is built

- Frontend: Next.js 16 + Bun + viem.
- Smart contracts: Solidity + Foundry (`AletheiaOracle`, `AletheiaMarket`, ERC20 collateral).
- Workflow layer: Chainlink CRE TypeScript workflows (HTTP trigger for question validation, cron trigger for market resolution).
- AI consensus: Gemini, Claude, GPT, and Grok through OpenRouter.
- Sybil resistance: World ID via IDKit `4.x` (using the legacy Orb/onchain proof path), with proof verification enforced onchain in `AletheiaMarket` through `WorldIDRouter.verifyProof(...)` (`groupId = 1`).
- Network setup for development/demo: Tenderly Virtual TestNet, with CRE simulations that can broadcast and update onchain state.

Build process note:
- Development used AI coding tools for acceleration (Claude Code + OpenAI Codex), with manual implementation where needed.
- Final architecture, contract behavior, and integration logic were manually reviewed/audited during development.

### Challenges

- World ID integration took iteration (app approval/config friction and environment alignment between staging/production behavior).
- CRE deployment access constraints required relying heavily on simulation mode during development; workflows were finalized and tested through simulation runs that still execute external calls and onchain writes in broadcast mode.
- Keeping frontend/contract/CRE configs synchronized across redeploys and environments was a recurring integration challenge.

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
  - `createMarketVerified(question, deadline, root, signalHash, nullifierHash, proof)`
  - `placeBet(marketId, onYes, amount)` using ERC20 collateral
  - `sellShares(marketId, onYes, amount)` before deadline
  - `claimWinnings(marketId)` after settlement
- `MockUSDC.sol`
  - Optional local test collateral (not used in the current Tenderly deployment)

### CRE Workflow

- `trigger-index 1`: HTTP trigger for question validation
- `trigger-index 0`: CRON trigger for resolving overdue markets
- Multi-model consensus uses OpenRouter models (Gemini, Claude, GPT, Grok)
- Resolution thresholds in workflow:
  - minimum confidence: `80`
  - minimum model agreement: `75`

## AI Processing (CRE + OpenRouter)

All AI calls run inside the Chainlink CRE workflow (`cre-workflow`) through OpenRouter, using 4 models:
- Gemini 2.0 Flash
- Claude 3.5 Sonnet
- GPT-4o Mini
- Grok 3 Mini

### 1) Market Question Validation (before create)

- Trigger: HTTP trigger (`trigger-index 1`).
- The validator prompt enforces JSON output:
  - `valid`
  - `score` (0-100)
  - `issues[]`
  - `suggestions[]`
  - checks:
    - `legitimate`
    - `clearTimeline`
    - `resolvable`
    - `binary`
- Important rule in prompt:
  - market resolution deadline is provided as a separate field and is authoritative.
  - a question is not rejected for missing an inline date if the deadline field is present.
- Consensus rule:
  - aggregate across models by majority on checks + average score.
  - market is approved only if:
    - `score >= 70`
    - all four checks pass in consensus.
- Result is written onchain by CRE as a question validation report (`proofHash` included).

### 2) Market Resolution (after deadline)

- Trigger: CRON trigger (`trigger-index 0`, every 10 minutes).
- Resolution prompt requires:
  - objective, verifiable YES/NO outcome,
  - deadline-aware resolution (use provided deadline as reference time),
  - confidence `0` for unresolved/future/ambiguous cases.
- Model outputs are combined with weighted voting:
  - each model vote weighted by its confidence.
  - `confidence=0` responses are treated as abstentions.
- A result is accepted only if:
  - consensus confidence `>= 80`
  - agreement level `>= 75`.
- Accepted results are written onchain by CRE as resolution reports (`outcome`, `confidence`, `proofHash`).

### Frontend

- `/markets`: market list + creation flow
- `/markets/[id]`: trade UI (buy/sell), chart, history
- `/dashboard`: active/resolved positions + claim

## Tenderly Deployment (Current)

- Chain ID: `9992`
- RPC: `https://virtual.mainnet.eu.rpc.tenderly.co/4dedea98-8407-4410-99fe-c06968afe6d1`

Deployed contracts:
- Oracle: `0x261dc51bac926f77df587ca582f7ca739033f061`
- Market: `0x26c49b5a46980e0489bce262bb03d442b02baa38`
- Collateral token (USDC on mainnet fork): `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

Configured integration addresses:
- CRE forwarder: `0xA3D1AD4Ac559a6575a114998AffB2fB2Ec97a7D9`
- World ID router: `0x469449f251692E0779667583026b5A1E99512157`

Deployment txs:
- Oracle deploy: `0x8e336dded1cbe27731d845f75a5cad70f1242318e85fc1ce64476251a501a52e`
- Market deploy: `0x781aa0a7dc774718af57794550239001782c44b06c625a86360a0bcf9969c16b`
- Oracle->Market wiring: `0xd065630b92744bf6498ed5df28b04e04d1e66be1485e30c1a5f6ddf8aea0096b`

Saved in:
- `contracts/deployments/tenderly-9992.json`
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
- `NEXT_PUBLIC_WORLD_ID_ENV` (`staging` or `production`, current testing default is `staging`)

World ID vars (frontend + API route):
- `NEXT_PUBLIC_WORLD_ID_APP_ID`
- `NEXT_PUBLIC_WORLD_ID_RP_ID`
- `NEXT_PUBLIC_WORLD_ID_ACTION` (use `create-new-market`)
- `WORLD_APP_ID`
- `WORLD_RP_ID`
- `WORLD_ID_ACTION`
- `RP_SIGNING_KEY` (server-only)

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

## World ID

- Market creation requires World ID step in the frontend (`IDKitRequestWidget`) with `orbLegacy(...)`.
- Orb-level verification is required (legacy Orb preset path).
- Proof fields passed onchain: `root`, `signal_hash`, `nullifier`, `proof`.
- On canonical chains (`mainnet`, `sepolia`), contract uses strict `worldId.verifyProof(...)`.
- On Tenderly custom chain (`9991`), contract uses a non-empty-proof fallback path because native World ID router verification is not reliable in this custom-chain setup.
- Nullifier replay protection is still enforced onchain (`usedWorldIdNullifierHashes`).

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

- World ID is required in the market creation flow and proof data is submitted onchain.
- Per-wallet one-market-per-day hard-enforcement remains disabled onchain (frontend warning only).
- Some Foundry commands may panic on this machine due a local `foundry-zksync` runtime issue; `forge build` and app/workflow builds are the reliable checks here.
