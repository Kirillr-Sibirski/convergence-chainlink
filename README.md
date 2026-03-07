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

- Chain ID: `9992`
- Public RPC (for frontend, docs, demos):
  - `https://virtual.mainnet.eu.rpc.tenderly.co/4dedea98-8407-4410-99fe-c06968afe6d1`
- Admin RPC is intentionally not documented in-repo; keep it local in `.env` for deploy/config operations.
- Explorer root:
  - [Tenderly VNet Explorer](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1)

### Deployed contracts (clickable explorer links)

- Oracle: [`0x261dc51bac926f77df587ca582f7ca739033f061`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/address/0x261dc51bac926f77df587ca582f7ca739033f061)
- Market: [`0x73ce74faebbb1926398f8360373490e6dd1b04dc`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/address/0x73ce74faebbb1926398f8360373490e6dd1b04dc)
- Collateral (USDC on mainnet fork): [`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
- Chainlink Forwarder (CRE sender): [`0xA3D1AD4Ac559a6575a114998AffB2fB2Ec97a7D9`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/address/0xA3D1AD4Ac559a6575a114998AffB2fB2Ec97a7D9)
- World ID Router (configured verifier): [`0x469449f251692E0779667583026b5A1E99512157`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/address/0x469449f251692E0779667583026b5A1E99512157)

### Deployment / wiring transactions

- Oracle deploy: [`0x8e336dded1cbe27731d845f75a5cad70f1242318e85fc1ce64476251a501a52e`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/tx/0x8e336dded1cbe27731d845f75a5cad70f1242318e85fc1ce64476251a501a52e)
- Market deploy: [`0xc32aeeac5b17395294932a4eb40eb320feacbc25659ce8bc02c91e1653556e96`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/tx/0xc32aeeac5b17395294932a4eb40eb320feacbc25659ce8bc02c91e1653556e96)
- Disable 24h limit (testing mode): [`0x47d5484d8c04597e2802dfa5101bdab5fd3cc7050b0f9ac0e8f7e810d8fce91b`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/tx/0x47d5484d8c04597e2802dfa5101bdab5fd3cc7050b0f9ac0e8f7e810d8fce91b)
- Disable nullifier uniqueness (testing mode): [`0xae326e5a1f833b5b5a1aca4e15da4f530e2168fcc88a70d1d101bce7959a9b66`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/tx/0xae326e5a1f833b5b5a1aca4e15da4f530e2168fcc88a70d1d101bce7959a9b66)
- Oracle -> Market wiring: [`0x4f306b3acd78a65479bf6f5ef613a3f877e375beda558428defed9aab3e9db12`](https://dashboard.tenderly.co/explorer/vnet/4dedea98-8407-4410-99fe-c06968afe6d1/tx/0x4f306b3acd78a65479bf6f5ef613a3f877e375beda558428defed9aab3e9db12)

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

## Notes for Judges

- This submission specifically integrates **World ID + Chainlink CRE** on a Tenderly Virtual TestNet.
- CRE simulations are used for workflow testing/execution in this environment.
- Source code is organized by component (`frontend`, `contracts`, `cre-workflow`) and all sponsor integration points are listed above.
