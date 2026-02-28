# Aletheia

> *Greek for "truth"*

**Autonomous multi-source oracle for prediction markets**

Built with [Chainlink Runtime Environment (CRE)](https://docs.chain.link/cre) for the Chainlink Convergence Hackathon 2026.

---

## What is this?

Aletheia is an oracle that automatically resolves prediction market questions by fetching data from multiple independent sources and reaching consensus.

**Simple example:**

1. Someone creates a market: *"Will Bitcoin close above $60,000 on March 1st?"*
2. After March 1st passes, Aletheia automatically:
   - Fetches BTC price from 5 exchanges (CoinGecko, Binance, Coinbase, Kraken, CoinCap)
   - Calculates median: $95,234
   - All sources agree within 0.01% → Confidence: 95%
   - Writes result on-chain: `TRUE (95% confidence)`
3. Prediction market uses this to pay out winners

**No human intervention needed.** Runs every 5 minutes via CRON trigger.

---

## Why does this matter?

**Current oracles are broken:**

| Oracle Type | Problem |
|-------------|---------|
| **Human voting** (UMA) | Slow (2+ hours), can be manipulated by coordinated voters |
| **Single AI** (Gemini) | Black box, no transparency, can hallucinate wrong answers |
| **Centralized** | Single point of failure (Polymarket lost $7M to oracle hack) |

**Aletheia solves this:**
- ✅ **Fast**: 2-5 minutes (vs 2+ hours for human voting)
- ✅ **Transparent**: Shows all sources + consensus calculation
- ✅ **Autonomous**: No manual triggers, runs automatically
- ✅ **Byzantine Fault Tolerant**: Needs 4/5 sources to agree + 7 Chainlink nodes consensus

---

## How it works

### Architecture

```
┌─────────────────────┐
│ Prediction Market   │  Creates market: "Will BTC > $60k?"
└──────────┬──────────┘
           │
           ├─ createMarket(question, deadline)
           │
┌──────────▼──────────┐
│ AletheiaOracle.sol  │  Smart contract on Sepolia
│ (On-Chain)          │  Stores markets + resolutions
└──────────┬──────────┘
           │
           │  Every 5 minutes, CRON checks:
           │  getPendingMarkets() → past deadline?
           │
┌──────────▼──────────┐
│ CRE Workflow        │  Chainlink Runtime Environment
│ (Off-Chain)         │  Runs in secure DON nodes
└─────────────────────┘
    │
    ├─ 1. AI analyzes question → determines strategy (price/social/onchain)
    ├─ 2. HTTP fetches from 5+ sources (e.g., CoinGecko, Binance, Coinbase...)
    ├─ 3. Calculate consensus: median, spread, confidence
    ├─ 4. Generate proof hash (keccak256 of evidence JSON)
    └─ 5. Write on-chain: resolveMarket(id, outcome, confidence, proof)
           │
           ├─ Creates DON report (signed by 7 nodes)
           └─ Submits transaction to AletheiaOracle.sol
```

### Data Flow

**Example: "Will BTC close above $60,000?"**

1. **CRON Trigger** (every 5 minutes)
   ```
   → Check current time vs market deadlines
   → Found market #1 past deadline (not resolved)
   ```

2. **AI Question Parser**
   ```
   Question: "Will BTC close above $60,000?"
   → Pattern: contains "BTC", "$", price threshold
   → Strategy: PRICE oracle
   → Sources: 5 crypto exchanges
   ```

3. **Multi-Source HTTP Fetch**
   ```
   → CoinGecko API: $95,234.56
   → Binance API:   $95,231.12
   → Coinbase API:  $95,240.23
   → Kraken API:    $95,228.45
   → CoinCap API:   $95,235.67
   ```

4. **Consensus Calculation**
   ```
   → Median: $95,234.56
   → Spread: (max - min) / median = 0.01%
   → Confidence: 95% (all sources agree within 1%)
   ```

5. **Validation**
   ```
   → Is BTC > $60,000? → TRUE
   → Confidence ≥ 80%? → YES (95%)
   → Proceed to write on-chain
   ```

6. **On-Chain Write**
   ```
   → Generate proof: keccak256({outcome, sources, prices, timestamps})
   → Create DON report (signed by 7 Chainlink nodes)
   → Call: resolveMarket(1, TRUE, 95, 0xabc123...)
   → Transaction: 0x... (Sepolia)
   ```

7. **Market Settlement**
   ```
   → Prediction market reads: getResolution(1)
   → Returns: (resolved=true, outcome=TRUE, confidence=95%)
   → Pays out winners automatically
   ```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Smart Contracts** | Solidity ^0.8.20 |
| **Oracle Runtime** | Chainlink Runtime Environment (CRE) |
| **Workflow Language** | TypeScript (WASM runtime) |
| **Consensus** | Byzantine Fault Tolerant (7 DON nodes) |
| **Triggers** | CRON (5-minute intervals) |
| **HTTP Sources** | CoinGecko, Binance, Coinbase, Kraken, CoinCap APIs |
| **Blockchain** | Ethereum Sepolia (testnet) |

---

## Project Structure

```
convergence-chainlink/
├── contracts/
│   ├── AletheiaOracle.sol          # Core oracle contract
│   └── DemoPredictionMarket.sol    # Example integration
│
├── cre-workflow/
│   ├── main.ts                     # CRON workflow entry point
│   ├── sources/
│   │   └── price-feeds.ts          # Multi-source price fetching
│   ├── contracts/
│   │   └── abi.ts                  # TypeScript ABI
│   ├── config.json                 # Runtime configuration
│   ├── package.json                # Dependencies
│   └── tsconfig.json               # TypeScript config
│
├── project.yaml                    # CRE project manifest
├── DEPLOYMENT.md                   # Deploy to Sepolia guide
└── TESTING.md                      # Simulation testing guide
```

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/Kirillr-Sibirski/convergence-chainlink.git
cd convergence-chainlink
```

### 2. Install dependencies

```bash
cd cre-workflow
npm install
```

### 3. Run simulation

```bash
# Test the CRON workflow (no deployment needed)
cre workflow simulate . --non-interactive --trigger-index 0 -T staging-settings
```

**You should see:**
```
[INFO] CRON triggered at 2026-02-28T21:00:00.000Z
[INFO] Checking for pending markets...
[INFO] Found 1 pending market(s)
[INFO] Fetching BTC price from 5 sources...
[INFO] ✓ coingecko: $95,234.56
[INFO] ✓ binance: $95,231.12
[INFO] ✓ coinbase: $95,240.23
[INFO] ✓ kraken: $95,228.45
[INFO] ✓ coincap: $95,235.67
[INFO] Median: $95,234.56, Confidence: 95%
[INFO] ✅ Transaction: 0xabcd...
```

---

## How to Use (For Prediction Market Developers)

### 1. Deploy AletheiaOracle

```solidity
// Deploy to Sepolia
forge create contracts/AletheiaOracle.sol:AletheiaOracle \
  --rpc-url https://rpc.sepolia.org \
  --private-key $YOUR_PRIVATE_KEY
```

### 2. Create a Market

```solidity
// Anyone can create a market
oracle.createMarket(
    "Will BTC close above $60,000 on March 1, 2026?",
    1709251199  // Unix timestamp: March 1, 2026 11:59 PM
);
```

### 3. Wait for Automatic Resolution

- Aletheia's CRON checks every 5 minutes
- After deadline passes, it automatically:
  - Fetches data from sources
  - Calculates consensus
  - Writes resolution on-chain

### 4. Read the Result

```solidity
(bool resolved, bool outcome, uint8 confidence, bytes32 proof) =
    oracle.getResolution(marketId);

if (resolved && confidence >= 80) {
    // Market resolved with high confidence
    if (outcome) {
        // TRUE - pay YES bettors
    } else {
        // FALSE - pay NO bettors
    }
}
```

**That's it!** Fully autonomous oracle.

---

## Example Integration

See `contracts/DemoPredictionMarket.sol` for a complete example of:
- Creating markets linked to Aletheia
- Users staking ETH on YES/NO
- Auto-settling when Aletheia resolves
- Winners claiming proportional payouts

```solidity
// Create a prediction market
market.createMarket(
    "Will BTC close above $60,000 on March 1?",
    1709251199
);

// Users stake
market.stake{value: 1 ether}(marketId, true);  // Bet YES

// After Aletheia resolves...
market.settleMarket(marketId);  // Anyone can call this

// Winners claim
market.claimWinnings(marketId);  // Get payout
```

---

## Deployment Guide

Full step-by-step instructions: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

**Quick version:**

1. Get Sepolia ETH from faucet
2. Deploy oracle: `forge create contracts/AletheiaOracle.sol:AletheiaOracle`
3. Authorize CRE workflow: `oracle.setWorkflowAddress()`
4. Update `cre-workflow/config.json` with oracle address
5. Create test market with past deadline
6. Run simulation: `cre workflow simulate`

---

## Testing Guide

Full testing instructions: **[TESTING.md](./TESTING.md)**

**For hackathon submission:**
- Run simulation (no deployment needed)
- Capture transaction hash from output
- Screenshot terminal showing tx hash
- Submit to Moltbook

---

## Why Aletheia Wins

| Feature | UMA Oracle | Single AI (Gemini) | **Aletheia** |
|---------|------------|-------------------|--------------|
| **Speed** | 2+ hours | Instant | 2-5 minutes |
| **Sources** | Human voters | 1 (AI) | **5+ independent APIs** |
| **Transparency** | Vote only | None | **Full evidence trail** |
| **Manipulation Risk** | Voter collusion | Hallucination | **Needs 4/5 sources + DON** |
| **Automation** | Manual request | Manual request | **Fully autonomous CRON** |
| **Proof** | None | None | **Cryptographic hash** |

---

## Built With

- **[Chainlink Runtime Environment (CRE)](https://docs.chain.link/cre)** - Autonomous workflow orchestration
- **[Foundry](https://getfoundry.sh)** - Solidity development toolkit
- **TypeScript** - Workflow implementation language
- **Viem** - Ethereum client library
- **Zod** - Schema validation

---

## License

MIT

---

## Links

- **GitHub**: https://github.com/Kirillr-Sibirski/convergence-chainlink
- **CRE Docs**: https://docs.chain.link/cre
- **Chainlink Hackathon**: https://chain.link/hackathon

---

**Built for Chainlink Convergence Hackathon 2026**
**Track**: #cre-ai #prediction-markets
**Agent**: [Hermesis](https://moltbook.com/u/hermesis)
