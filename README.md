<div align="center">
  <img src="Aletheia.png" alt="Aletheia Logo" width="200"/>

  # Aletheia

  **Autonomous multi-source oracle for prediction markets**

  [![Demo](https://img.shields.io/badge/Live%20Demo-aletheia--gilt.vercel.app-blue)](https://aletheia-gilt.vercel.app)
  [![Contract](https://img.shields.io/badge/Sepolia-0xb136...315e-green)](https://sepolia.etherscan.io/address/0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e)
</div>

Built with [Chainlink Runtime Environment (CRE)](https://docs.chain.link/cre) for Chainlink Convergence Hackathon 2026.

---

## What It Does

Aletheia resolves prediction market questions by:
1. AI determines verification strategy (selects sources dynamically)
2. CRE fetches from multiple sources in parallel
3. CRE calculates Byzantine consensus (4/5 sources must agree)
4. CRE writes resolution on-chain with cryptographic proof

**Example:** "Will BTC close above $60,000 on March 1st?"
- AI strategy: PRICE → selects 5 exchanges
- CRE fetches: [CoinGecko: $95,234, Binance: $95,231, Coinbase: $95,240, Kraken: $95,228, CoinCap: $95,236]
- CRE consensus: median = $95,234, confidence = 95%
- CRE result: TRUE (all prices > $60k)

---

## Architecture

```
┌─────────────────┐
│  Smart Contract │  AletheiaOracle.sol
│   (On-Chain)    │
└────────┬────────┘
         │
         ├─ createMarket(question, deadline)
         └─ resolveMarket(id, outcome, confidence, proof)
         │
┌────────▼────────┐
│  CRE Workflow   │  main.ts (TypeScript)
│  (Off-Chain)    │
└─────────────────┘
    │
    ├─ CRON: Every 5 minutes
    ├─ HTTP: Fetch from multiple sources
    ├─ Consensus: Byzantine 4/5 threshold
    └─ EVM: Write resolution on-chain
```

---

## CRE Capabilities Used

| Capability | Usage | Code |
|------------|-------|------|
| **CronCapability** | Triggers workflow every 5 minutes | `cre-workflow/project.yaml:16` |
| **HTTPClient** | Fetches from 5+ sources in parallel | `cre-workflow/sources/price-feeds.ts:148` |
| **EVMClient (read)** | Reads pending markets from contract | `cre-workflow/main.ts:59` |
| **EVMClient (write)** | Writes resolutions on-chain | `cre-workflow/main.ts:277` |
| **ConsensusAggregation** | Byzantine consensus (7 DON nodes) | `cre-workflow/main.ts:237` |
| **runtime.report()** | Generates DON-signed report | `cre-workflow/main.ts:267` |

---

## Data Flow

**1. CRON Trigger**
```typescript
// Every 5 minutes (cre-workflow/project.yaml)
triggers:
  - type: cron
    schedule: "*/5 * * * *"
```

**2. Read Pending Markets**
```typescript
// main.ts:59
const pending = await oracle.getPendingMarkets()
// Returns markets past deadline, not yet resolved
```

**3. AI Strategy Selection** (Dynamic source discovery)
```typescript
// AI analyzes question → selects sources (NOT hardcoded!)
const strategy = await analyzeQuestion(question)
// Question: "Will BTC > $60k?"
// AI Output: { category: "price", sources: [...5 exchanges] }
```

**4. CRE Multi-Source Fetch**
```typescript
// sources/price-feeds.ts:148
const results = await Promise.all(
  sources.map(source => httpClient.get(source.url))
)
// All 7 DON nodes fetch independently
```

**5. Byzantine Consensus**
```typescript
// main.ts:237
const median = calculateMedian(results)
const confidence = results.filter(r =>
  Math.abs(r - median) / median < 0.01
).length / results.length * 100
// Requires 4/5 sources agree within 1%
```

**6. Write On-Chain**
```typescript
// main.ts:277
await oracle.resolveMarket(
  marketId,
  outcome,      // true/false
  confidence,   // 0-100%
  proofHash     // keccak256(evidence)
)
```

---

## Universal Question Types

Aletheia handles any verifiable question by dynamically selecting sources:

| Type | Example | AI-Selected Sources |
|------|---------|---------------------|
| **PRICE** | "Will BTC > $60k?" | 5 crypto exchanges |
| **WEATHER** | "Will it rain in Tokyo?" | 5 weather APIs |
| **SOCIAL** | "Did Elon tweet about DOGE?" | Twitter, Archive.org, scrapers, news |
| **NEWS** | "Will SpaceX launch Starship?" | Reuters, AP, BBC, NYT, WSJ |
| **ONCHAIN** | "Will ETH gas > 100 gwei?" | 5 RPC providers |
| **GENERAL** | "Who won the election?" | 5 search engines |

**Key:** AI selects sources dynamically per question (not hardcoded lists)

---

## Project Structure

```
convergence-chainlink/
├── contracts/
│   ├── AletheiaOracle.sol           # Oracle contract
│   └── DemoPredictionMarket.sol     # Example integration
│
├── cre-workflow/
│   ├── main.ts                      # CRON workflow
│   ├── sources/
│   │   ├── price-feeds.ts           # Multi-source price fetching
│   │   └── universal-resolver.ts    # Question type detection
│   ├── project.yaml                 # CRE config (CRON trigger)
│   ├── config.json                  # Runtime config
│   └── package.json
│
├── frontend/                         # Next.js demo
│   └── app/page.tsx
│
└── scripts/
    └── deploy.js                     # Deployment scripts
```

---

## Quick Start

### 1. Install
```bash
git clone https://github.com/Kirillr-Sibirski/convergence-chainlink.git
cd convergence-chainlink/cre-workflow
npm install
```

### 2. Test Locally
```bash
npm test
# Runs universal-resolver tests
```

### 3. Simulate CRE Workflow
```bash
cre workflow simulate . --non-interactive
# Simulates CRON trigger without deployment
```

### 4. Deploy to Sepolia
```bash
# Deploy contract
forge create contracts/AletheiaOracle.sol --rpc-url $RPC --private-key $PK

# Set CRE workflow address
cast send $ORACLE "setWorkflowAddress(address)" $CRE_ADDRESS

# Deploy CRE workflow to DON
cre deploy --network sepolia
```

---

## Usage Example

```solidity
// 1. Create market
oracle.createMarket(
    "Will BTC close above $60,000 on March 1, 2026?",
    1709251199  // deadline timestamp
);

// 2. Wait for CRON (auto-resolves after deadline)

// 3. Read result
(bool resolved, bool outcome, uint8 confidence, bytes32 proof) =
    oracle.getResolution(marketId);

// resolved = true
// outcome = true (BTC > $60k)
// confidence = 95
// proof = 0xabc123... (keccak256 of evidence)
```

---

## Technical Details

**Smart Contract:** `AletheiaOracle.sol`
- Deployed: Sepolia `0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e`
- Functions: `createMarket()`, `resolveMarket()`, `getResolution()`
- Access Control: `onlyCRE` modifier for resolutions

**CRE Workflow:** `main.ts`
- Language: TypeScript
- Runtime: WASM (Chainlink DON)
- Trigger: CRON every 5 minutes
- Consensus: 7 DON nodes (Byzantine 4/5 source threshold)

**Frontend:** Next.js 14
- Live: https://aletheia-gilt.vercel.app
- Features: Browse markets, create markets, view resolutions

---

## Documentation

- **Technical Overview:** [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)
- **Hackathon Strategy:** [HACKATHON_STRATEGY.md](./HACKATHON_STRATEGY.md)
- **Deployment Info:** [DEPLOYMENT_INFO.md](./DEPLOYMENT_INFO.md)

---

## License

MIT

---

**Built for Chainlink Convergence Hackathon 2026**
