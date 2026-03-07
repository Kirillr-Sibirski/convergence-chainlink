# Aletheia

Permissionless binary prediction markets with Chainlink CRE orchestration, World ID sybil resistance, and Tenderly Virtual TestNet deployment.

## What This Project Does

- Anyone can create a YES/NO market.
- Market feasibility is validated by a Chainlink CRE **HTTP trigger** (multi-model AI consensus).
- Expired markets are resolved by a Chainlink CRE **CRON trigger** (multi-model AI consensus).
- World ID is used to enforce human uniqueness in market creation flow.
- Trading and settlement are onchain through `AletheiaMarket` + `AletheiaOracle`.

## Run Locally

1. Prerequisites
```bash
bun --version
forge --version
cast --version
cre --version
```

2. Install dependencies
```bash
# repo root
cd /path/to/convergence-chainlink

cd frontend && bun install
cd ../cre-workflow && bun install
```

3. Configure environment files
```bash
# frontend
cp frontend/.env.example frontend/.env.local

# cre workflow
cp cre-workflow/.env.example cre-workflow/.env
```

Required values:
- `frontend/.env.local`
  - `NEXT_PUBLIC_RPC_URL`
  - `NEXT_PUBLIC_CHAIN_ID`
  - `NEXT_PUBLIC_ORACLE_ADDRESS`
  - `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`
  - `NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS`
  - `WORLD_APP_ID`
  - `WORLD_RP_ID`
  - `WORLD_ID_ACTION`
  - `RP_SIGNING_KEY`
- `contracts/.env`
  - `PRIVATE_KEY`
  - `RPC_URL` (admin RPC for deploy/write ops)
  - `FORWARDER_ADDRESS`
  - `WORLD_ID_ROUTER_ADDRESS`
  - `WORLD_ID_APP_ID`
  - `WORLD_ID_ACTION`
  - `COLLATERAL_TOKEN_ADDRESS`
- `cre-workflow/.env`
  - `CRE_ETH_PRIVATE_KEY`
  - `CRE_TARGET=staging`
  - `OPENROUTER_API_KEY_VAR`

4. Optional: redeploy contracts to your own Tenderly VNet
```bash
cd frontend
bun run scripts/deploy-tenderly-all.ts \
  --rpc-url <TENDERLY_ADMIN_RPC> \
  --chain-id <YOUR_CHAIN_ID> \
  --network-name "Tenderly Virtual TestNet" \
  --collateral-token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```
Then update:
- `frontend/.env.local` addresses + chain ID
- `cre-workflow/config.json` (`oracleAddress`)
- `cre-workflow/project.yaml` RPC URL

5. Run frontend
```bash
cd frontend
bun dev
```

6. Run CRE simulations during demo/testing
```bash
cd cre-workflow

# Validate question (HTTP trigger)
cre workflow simulate . --non-interactive --trigger-index 1 \
  --http-payload '{"question":"Will ETH close above $5000?","deadline":1773273600}' \
  --broadcast -T staging

# Resolve expired markets (CRON trigger)
cre workflow simulate . --non-interactive --trigger-index 0 --broadcast -T staging
```

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

- Oracle: [`0x73ce74faebbb1926398f8360373490e6dd1b04dc`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/address/0x73ce74faebbb1926398f8360373490e6dd1b04dc)
- Market: [`0x637e1497cecc9869fef92201fa46a7d6ca77d16e`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/address/0x637e1497cecc9869fef92201fa46a7d6ca77d16e)
- Chainlink Forwarder (CRE sender): [`0xA3D1AD4Ac559a6575a114998AffB2fB2Ec97a7D9`](https://dashboard.tenderly.co/explorer/vnet/7ab2ac7f-6262-4a2d-9271-11cb2f95b651/address/0xA3D1AD4Ac559a6575a114998AffB2fB2Ec97a7D9)

### External configured dependency (not deployed in this VNet)

- World ID Router (Ethereum Mainnet, for mainnet-fork VNets): [`0x163b09b4fe21177c455d850bd815b6d583732432`](https://etherscan.io/address/0x163b09b4fe21177c455d850bd815b6d583732432)

## Repo Structure

- [`frontend`](./frontend): Next.js + viem UI and wallet tx flow
- [`contracts`](./contracts): Foundry Solidity contracts + deployment scripts
- [`cre-workflow`](./cre-workflow): Chainlink CRE workflow (HTTP + CRON)

## Live Frontend

- Vercel deployment: [https://aletheia-ftd019a2s-kirills-projects-6d0b34a4.vercel.app/](https://aletheia-ftd019a2s-kirills-projects-6d0b34a4.vercel.app/)
- Note: this Tenderly VNet faucet is private, so public wallet funding is limited.
