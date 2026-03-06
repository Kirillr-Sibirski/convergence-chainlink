# Aletheia

Prediction markets with:
- permissionless market creation,
- AI question validation and market resolution via Chainlink CRE,
- simple ETH-denominated YES/NO share trading.

This repo is organized into three runnable parts:
- `frontend` (Next.js + viem + Bun)
- `contracts` (Foundry Solidity contracts)
- `cre-workflow` (Chainlink CRE TypeScript workflow)

## Current State (March 2026)

What is implemented now:
- Binary markets only.
- Collateral is ETH only (no USDC path).
- Users can:
  - create a market (after CRE validation),
  - buy YES/NO shares with ETH,
  - sell YES/NO shares before market close,
  - claim winnings after market settlement.
- Price chart and trade history are computed from onchain `BetPlaced`/`SharesSold` events.
- Frontend is viem-only (no thirdweb).
- CRE simulation workflow supports:
  - HTTP trigger: validate `(question, deadline)`,
  - Cron trigger: resolve overdue unresolved markets.

Temporarily disabled for demo/testing:
- Onchain World ID verification enforcement in `AletheiaMarket` is currently commented out.
- Per-wallet market creation rate limit is currently commented out.

## Architecture

### 1) Contracts (`contracts`)

Core contracts:
- `AletheiaOracle.sol`
  - stores markets and question validations
  - accepts CRE reports through `ReceiverTemplate`
  - exposes `getPendingMarkets()` and `getPendingValidationRequests()`
  - auto-calls settlement on prediction market when resolution confidence is high enough
- `AletheiaMarket.sol`
  - market creation via `createMarketVerified(question, deadline, root, nullifierHash, proof)`
  - betting with ETH: `placeBet`
  - pre-deadline exits: `sellShares`
  - post-settlement payout: `claimWinnings`

Important behavior:
- Market creation requires an existing oracle validation digest for the **exact** `(question, deadline)` pair.
- Deadlines must be future timestamps at creation time.

### 2) CRE Workflow (`cre-workflow`)

Entrypoint:
- `main.ts`

Triggers:
- `trigger-index 1` (HTTP): question validation
- `trigger-index 0` (Cron): settlement processing

AI backend:
- OpenRouter via `sources/multi-ai-openrouter.ts`
- Models used for consensus:
  - Gemini 2.0 Flash
  - Claude 3.5 Sonnet
  - GPT-4o Mini
  - Grok 3 Mini

Current CRE safeguards:
- Resolver now receives deadline context explicitly.
- Cron path enforces a per-run HTTP budget to avoid CRE HTTP call limit failures; excess work is deferred to the next cron run.

### 3) Frontend (`frontend`)

Pages:
- `/` landing
- `/markets` market discovery + creation modal
- `/markets/[id]` trade page (buy/sell + chart + trade history)
- `/dashboard` user positions + claims

Create market flow (manual simulation mode):
1. User enters question and UTC deadline.
2. Frontend asks for CRE validation.
3. If CRE HTTP endpoint is not configured, UI shows copyable `cre workflow simulate` command.
4. Frontend polls chain for matching `QuestionValidated` digest.
5. Frontend auto-prompts wallet for `createMarketVerified` when validation appears.

Resolution gating:
- If expired unresolved markets exist, frontend blocks new market creation/betting and tells user to run CRE cron simulation.

## Deployed Addresses (current defaults in repo)

Sepolia addresses currently wired in code:
- Oracle: `0x7c15bd1d23630f413afbae8d5f88ea1088013bb5`
- Market: `0x29c53c50dfe93d6b4eb2e4dc1c41499bb6d7a024`

Where they are defined:
- `frontend/lib/contracts.ts`
- `cre-workflow/config.json`
- `contracts/deployments/*.json`

## Prerequisites

- Bun
- Foundry (`forge`, `cast`)
- Chainlink CRE CLI (`cre`)
- Sepolia RPC access
- OpenRouter API key

## Setup

### Frontend

```bash
cd frontend
bun install
cp .env.example .env.local
```

Set at minimum in `frontend/.env.local`:
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_CRE_HTTP_TRIGGER_URL` (optional; if omitted, manual simulation UX is used)
- `NEXT_PUBLIC_CRE_HTTP_TRIGGER_KEY` (optional)

World ID envs can remain unset while onchain World ID checks are disabled.

### CRE workflow

```bash
cd cre-workflow
bun install
cp .env.example .env
```

Set in `cre-workflow/.env`:
- `CRE_ETH_PRIVATE_KEY`
- `CRE_TARGET=staging`
- `OPENROUTER_API_KEY_VAR`

Secret mapping is configured in `cre-workflow/secrets.yaml`:
- `OPENROUTER_API_KEY` reads from `OPENROUTER_API_KEY_VAR`.

### Contracts

Create `contracts/.env` with at least:
- `PRIVATE_KEY`
- `RPC_URL`
- `FORWARDER_ADDRESS`
- `WORLD_ID_ROUTER_ADDRESS`
- `WORLD_ID_APP_ID`
- `WORLD_ID_ACTION`

Even though World ID checks are currently bypassed in the market contract, constructor args are still required by deploy scripts.

## Run

### Start frontend

```bash
cd frontend
bun run dev
```

### Build checks

```bash
cd frontend && bun run build
cd cre-workflow && bun run build
cd contracts && forge test
```

## CRE Simulation Commands

Run from `cre-workflow` directory.

### 1) Validate a question/deadline pair (HTTP trigger)

```bash
cre workflow simulate . --non-interactive --trigger-index 1 --http-payload '{"question":"Will ETH close above $5000?","deadline":1773273600}' --broadcast -T staging
```

Notes:
- `question` and `deadline` must exactly match what will be submitted onchain later.
- This writes a validation report to oracle state.

### 2) Resolve overdue markets (Cron trigger)

```bash
cre workflow simulate . --non-interactive --trigger-index 0 --broadcast -T staging
```

Dry run (no write):

```bash
cre workflow simulate . --non-interactive --trigger-index 0 -T staging
```

## Contract Deployment (Foundry)

Deploy oracle + market and wire callback:

```bash
cd contracts
set -a; source .env; set +a
forge script script/DeployAll.s.sol:DeployAllScript --rpc-url "$RPC_URL" --broadcast
```

After redeploy:
- update `frontend/lib/contracts.ts`
- update `cre-workflow/config.json` (`oracleAddress`)
- keep deployment json files in `contracts/deployments` in sync

## Known Gotchas

- `target not found: staging,` means you passed `staging,` (with comma). Use `-T staging`.
- If CRE says `Found 0 pending market(s)`, the market is likely not yet past deadline or already resolved.
- If create-market fails with `QuestionNotValidated`, your `(question, deadline)` pair does not match the one that was validated.
- CRE HTTP call budget limits can prevent processing many items in one run; rerun cron simulation to process deferred markets.

## Repository Links

- Project repo: [convergence-chainlink](https://github.com/Kirillr-Sibirski/convergence-chainlink)
- CRE reference demo pattern: [smartcontractkit/cre-gcp-prediction-market-demo](https://github.com/smartcontractkit/cre-gcp-prediction-market-demo)
- Chainlink CRE docs: [docs.chain.link/cre](https://docs.chain.link/cre)
