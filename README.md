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
- Public RPC (for frontend, docs, demos):
  - `https://virtual.mainnet.eu.rpc.tenderly.co/7ab2ac7f-6262-4a2d-9271-11cb2f95b651`
- Admin RPC is intentionally not documented in-repo; keep it local in `.env` for deploy/config operations.
- Explorer root:
  - [Tenderly VNet Explorer](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651)

### Deployed contracts (clickable explorer links)

- Oracle: [`0xd9fb2c2514bee54d58aba07d07e09978c87fe881`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/address/0xd9fb2c2514bee54d58aba07d07e09978c87fe881)
- Market: [`0x6367b12cee6105fce90b4532c513605fc061bf4d`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/address/0x6367b12cee6105fce90b4532c513605fc061bf4d)
- Collateral (USDC on mainnet fork): [`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
- Chainlink Forwarder (CRE sender): [`0xA3D1AD4Ac559a6575a114998AffB2fB2Ec97a7D9`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/address/0xA3D1AD4Ac559a6575a114998AffB2fB2Ec97a7D9)
- World ID Router (configured verifier): [`0x469449f251692E0779667583026b5A1E99512157`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/address/0x469449f251692E0779667583026b5A1E99512157)

### Deployment / wiring transactions

- Oracle deploy: [`0xf3c70ae9a068063096428d8bcbebc3456327110f17d8f1303eb4a4fe4286796f`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/tx/0xf3c70ae9a068063096428d8bcbebc3456327110f17d8f1303eb4a4fe4286796f)
- Market deploy: [`0x01b5dcafe2a027649656eb2e4aae40e9705861716d54ea8b5bb05ed23030202e`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/tx/0x01b5dcafe2a027649656eb2e4aae40e9705861716d54ea8b5bb05ed23030202e)
- Disable 24h limit (testing mode): [`0x644962d004f2685474459e3e90e419d8baf1e677ffad2080ee83185dac4b00bd`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/tx/0x644962d004f2685474459e3e90e419d8baf1e677ffad2080ee83185dac4b00bd)
- Disable nullifier uniqueness (testing mode): [`0x2538c556af2c958f1d026ce06648c0e6c2ca94112a781f24085f7a890a095b78`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/tx/0x2538c556af2c958f1d026ce06648c0e6c2ca94112a781f24085f7a890a095b78)
- Oracle -> Market wiring: [`0x6619d85f33e2412e519488078933f78255f4125553d90ca6bb4afbc303478d06`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/tx/0x6619d85f33e2412e519488078933f78255f4125553d90ca6bb4afbc303478d06)

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

## Verify Contracts On Tenderly (Foundry)

```bash
cd contracts

TENDERLY_VIRTUAL_TESTNET_RPC_URL="https://virtual.mainnet.eu.rpc.tenderly.co/7ab2ac7f-6262-4a2d-9271-11cb2f95b651"

forge verify-contract 0x6367b12cee6105fce90b4532c513605fc061bf4d AletheiaMarket.sol:AletheiaMarket \
  --verifier custom \
  --verifier-url "$TENDERLY_VIRTUAL_TESTNET_RPC_URL/verify" \
  --watch

forge verify-contract 0xd9fb2c2514bee54d58aba07d07e09978c87fe881 AletheiaOracle.sol:AletheiaOracle \
  --verifier custom \
  --verifier-url "$TENDERLY_VIRTUAL_TESTNET_RPC_URL/verify" \
  --watch
```

## Repo Structure

- [`frontend`](./frontend): Next.js + viem UI and wallet tx flow
- [`contracts`](./contracts): Foundry Solidity contracts + deployment scripts
- [`cre-workflow`](./cre-workflow): Chainlink CRE workflow (HTTP + CRON)

## Notes for Judges

- This submission specifically integrates **World ID + Chainlink CRE** on a Tenderly Virtual TestNet.
- CRE simulations are used for workflow testing/execution in this environment.
- Source code is organized by component (`frontend`, `contracts`, `cre-workflow`) and all sponsor integration points are listed above.
