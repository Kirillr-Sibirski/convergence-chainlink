# Aletheia

Permissionless binary prediction markets with Chainlink CRE orchestration, World ID sybil resistance, and Tenderly Virtual TestNet deployment.

## What This Project Does

- Anyone can create a YES/NO market.
- Market feasibility is validated by a Chainlink CRE **HTTP trigger** (multi-model AI consensus).
- Expired markets are resolved by a Chainlink CRE **CRON trigger** (multi-model AI consensus).
- World ID is used to enforce human uniqueness in market creation flow.
- Trading and settlement are onchain through `AletheiaMarket` + `AletheiaOracle`.

## Sponsor Product Usage (Exact File Map)

### Chainlink CRE (where and why)

- [`cre-workflow/main.ts`](./cre-workflow/main.ts)
  - CRE runtime entrypoint (`Runner.newRunner`)
  - HTTP trigger (question validation)
  - CRON trigger (market resolution)
  - onchain `writeReport(...)` calls to `AletheiaOracle`
- [`cre-workflow/sources/multi-ai-openrouter.ts`](./cre-workflow/sources/multi-ai-openrouter.ts)
  - Multi-model AI consensus logic used by CRE for validation + resolution
- [`cre-workflow/contracts/abi.ts`](./cre-workflow/contracts/abi.ts)
  - Oracle ABI used by workflow calls (`getPendingMarkets`, `getPendingValidationRequests`, `getResolution`)
- [`cre-workflow/workflow.yaml`](./cre-workflow/workflow.yaml)
  - Workflow packaging/definition
- [`cre-workflow/project.yaml`](./cre-workflow/project.yaml)
  - CRE target RPC configuration (Tenderly VNet)
- [`cre-workflow/config.json`](./cre-workflow/config.json)
  - Oracle address + workflow runtime config
- [`contracts/ReceiverTemplate.sol`](./contracts/ReceiverTemplate.sol)
  - Chainlink receiver pattern (`onReport`) security and metadata parsing
- [`contracts/AletheiaOracle.sol`](./contracts/AletheiaOracle.sol)
  - Processes CRE reports and stores validation/resolution state

### World ID (where and why)

- [`contracts/IWorldID.sol`](./contracts/IWorldID.sol)
  - World ID verifier interface
- [`contracts/AletheiaMarket.sol`](./contracts/AletheiaMarket.sol)
  - Onchain World ID proof handling during `createMarketVerified(...)`
  - nullifier tracking and testing toggles
- [`frontend/components/trading/WorldIdAutoFlow.tsx`](./frontend/components/trading/WorldIdAutoFlow.tsx)
  - IDKit client flow, proof capture, and formatting for contract call
- [`frontend/app/api/rp-signature/route.ts`](./frontend/app/api/rp-signature/route.ts)
  - Backend RP signature generation (`@worldcoin/idkit/signing`)
- [`frontend/components/trading/MarketGrid.tsx`](./frontend/components/trading/MarketGrid.tsx)
  - Create-market sequence orchestration (CRE validate -> World ID -> tx)
- [`frontend/lib/web3-viem.ts`](./frontend/lib/web3-viem.ts)
  - `createMarketVerified(...)` viem call with World ID proof fields

## Tenderly Virtual TestNet Deployment

- Chain ID: `9993`
- Public RPC:
  - `https://virtual.mainnet.eu.rpc.tenderly.co/7ab2ac7f-6262-4a2d-9271-11cb2f95b651`
- Explorer root:
  - [Tenderly VNet Explorer](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651)

### Deployed contracts (clickable explorer links)

- Oracle: [`0xd9fb2c2514bee54d58aba07d07e09978c87fe881`](https://dashboard.tenderly.co/sibirski/project/testnet/b4b82bf6-0d85-47e3-9dab-e796d0524525/contract/virtual/0xd9fb2c2514bee54d58aba07d07e09978c87fe881)
- Market: [`0x6367b12cee6105fce90b4532c513605fc061bf4d`](https://dashboard.tenderly.co/sibirski/project/testnet/b4b82bf6-0d85-47e3-9dab-e796d0524525/contract/virtual/0x6367b12cee6105fce90b4532c513605fc061bf4d)
- Chainlink Forwarder (CRE sender): [`0xA3D1AD4Ac559a6575a114998AffB2fB2Ec97a7D9`](https://dashboard.tenderly.co/sibirski/project/testnet/b4b82bf6-0d85-47e3-9dab-e796d0524525/contract/virtual/0xA3D1AD4Ac559a6575a114998AffB2fB2Ec97a7D9)
- World ID Router (configured verifier): [`0x469449f251692E0779667583026b5A1E99512157`](https://dashboard.tenderly.co/sibirski/project/testnet/b4b82bf6-0d85-47e3-9dab-e796d0524525/contract/virtual/0x469449f251692E0779667583026b5A1E99512157)

## CRE Workflow Execution (Demo)

From [`cre-workflow`](./cre-workflow):

```bash
bun install
```

Question validation (HTTP trigger):

```bash
cre workflow simulate . --non-interactive --trigger-index 1 \
  --http-payload '{"question":"Will ETH close above $5000?","deadline":1773273600}' \
  --broadcast -T staging
```

Market resolution (CRON trigger):

```bash
cre workflow simulate . --non-interactive --trigger-index 0 --broadcast -T staging
```

## Repo Structure

- [`frontend`](./frontend): Next.js + viem UI and wallet tx flow
- [`contracts`](./contracts): Foundry Solidity contracts + deployment scripts
- [`cre-workflow`](./cre-workflow): Chainlink CRE workflow (HTTP + CRON)
