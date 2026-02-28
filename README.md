# Aletheia: Autonomous Multi-Source Prediction Market Oracle

**The only oracle that shows its work**

## 🎯 What is Aletheia?

Aletheia is an **autonomous oracle** for prediction markets powered by Chainlink Runtime Environment (CRE). Unlike single-source oracles (UMA's human voting, single AI models), Aletheia:

✅ **Multi-Source Verification** - Fetches from 5+ independent data sources
✅ **Byzantine Fault Tolerant Consensus** - 7 DON nodes must agree on result
✅ **Transparent Proofs** - Every resolution includes full evidence trail
✅ **Fully Autonomous** - CRON trigger checks and resolves markets automatically
✅ **Universal** - Works for any verifiable question (prices, events, social media, on-chain)

---

## 🔥 The Innovation

### **Problem:**
- Polymarket lost $7M to oracle manipulation
- Single AI oracles (like Gemini) are black boxes - no transparency
- Human voting oracles are slow and vulnerable to collusion

### **Solution:**
Aletheia doesn't ask AI for answers. **It asks AI how to find the truth, then proves it.**

**How it works:**
1. AI Agent determines **what sources to check** and **how to validate**
2. CRE Workflow fetches from 5+ sources with multi-node consensus
3. Validates results (4/5 sources must agree)
4. Generates cryptographic proof with full evidence
5. Writes resolution on-chain with DON signature

**Every resolution includes:**
- Outcome (TRUE/FALSE)
- Confidence score (0-100)
- Evidence from all sources (links, timestamps, data)
- Consensus metrics (sources confirmed, DON nodes agreeing)
- Tamper-proof hash + DON signature

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   Prediction Market (Your Protocol)     │
│   - Create market with question         │
│   - Wait for deadline to pass           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│     AletheiaOracle.sol (On-Chain)      │
│   - Stores market questions + deadlines │
│   - Receives resolutions from CRE       │
│   - Provides verified results           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│        CRE Workflow (Autonomous)        │
│   - CRON: Check markets every 5 min    │
│   - For markets past deadline:          │
│     1. AI determines verification plan  │
│     2. Fetch 5+ sources (consensus)     │
│     3. Validate (4/5 must agree)        │
│     4. Generate proof                   │
│     5. Write on-chain                   │
└─────────────────────────────────────────┘
```

**Key Difference from Bootcamp/Other Oracles:**
- **Bootcamp**: Ask Gemini AI → Get answer → Done (black box)
- **Aletheia**: AI plans verification → Fetch 5 sources → Validate → Prove

---

## 🎯 Example Use Cases

### **1. Price Events**
```
Question: "Will BTC close above $60,000 on March 1, 2026?"

Aletheia:
→ Fetches from: CoinGecko, Binance, Coinbase, Kraken, Gemini
→ Gets prices: $58,342, $58,335, $58,352, $58,330, $58,344
→ Consensus median: $58,342
→ Result: FALSE
→ Proof: Full price data from all 5 exchanges with timestamps
```

### **2. Social Media Events**
```
Question: "Will Trump tweet about immigration by March 1?"

Aletheia:
→ Fetches from: Twitter API, Archive.org, Nitter, Truth Social, News API
→ Validates: 4/5 sources confirm tweet
→ Result: TRUE
→ Proof: Tweet ID, text, timestamp, archive snapshot, news articles
```

### **3. On-Chain + Off-Chain Combo**
```
Question: "Will Uniswap V4 deploy on Base AND announce on blog by March 5?"

Aletheia:
→ On-chain: BaseScan contract verification
→ Off-chain: Uniswap blog RSS, Twitter, GitHub releases
→ Validates: BOTH conditions met
→ Result: TRUE
→ Proof: Contract address + deployment tx + blog post link + GitHub release
```

---

## 🔌 Integration (Simple)

### **For Prediction Market Developers:**

**1. Create Market**
```solidity
oracle.createMarket(
    "Will BTC close above $60,000 on March 1, 2026?",
    1709251200  // Unix timestamp for March 1, 2026
);
```

**2. Wait for Automatic Resolution**
- CRE CRON checks every 5 minutes
- After deadline passes, resolution happens automatically
- No manual request needed!

**3. Get Result**
```solidity
(bool outcome, uint8 confidence, string memory proof) =
    oracle.getResolution(marketId);

if (confidence >= 80) {
    settleMarket(marketId, outcome);
}
```

That's it! Fully autonomous oracle.

---

## 🆚 Comparison

| Feature | UMA Oracle | Single AI (Gemini) | Aletheia |
|---------|-----------|-------------------|-----------|
| **Resolution Method** | Human voting | AI black box | Multi-source + AI orchestrator |
| **Resolution Time** | 2 hours + disputes | Instant | 2-5 minutes |
| **Transparency** | Vote only | None | Full evidence trail |
| **Sources** | Human voters | 1 (Gemini) | 5+ independent sources |
| **Manipulation Risk** | Voter collusion | AI hallucination | Needs 4/5 sources + DON |
| **Automation** | Manual request | Manual request | Autonomous CRON |
| **Proof** | None | None | Cryptographic + evidence |

---

## 🛠️ Tech Stack

- **Language**: TypeScript (CRE WASM runtime)
- **Oracle**: Chainlink Runtime Environment (CRE)
- **Triggers**: CRON (every 5 minutes)
- **Capabilities**: HTTPClient (multi-source), EVMClient (on-chain writes)
- **Consensus**: ConsensusAggregationByFields (DON consensus)
- **Blockchain**: Ethereum Sepolia (testnet)
- **Proof Storage**: IPFS (evidence) + On-chain (hash)

---

## 📦 Project Structure

```
convergence-chainlink/
├── contracts/                 # Smart contracts
│   ├── AletheiaOracle.sol   # Core oracle contract
│   └── DemoPredictionMarket.sol  # Example integration
├── cre-workflow/              # CRE workflow
│   ├── main.ts               # Main resolution logic
│   ├── ai-parser.ts          # AI question understanding
│   ├── sources/              # Data source integrations
│   │   ├── price-feeds.ts
│   │   ├── social-media.ts
│   │   └── onchain.ts
│   ├── validation.ts         # Result validation logic
│   └── proof-generator.ts    # Evidence proof generation
├── config/
│   ├── project.yaml          # CRE project config
│   └── workflow.yaml         # Workflow trigger config
└── README.md                 # This file
```

---

## 🚀 Quick Start

```bash
# Clone repo
git clone https://github.com/Kirillr-Sibirski/convergence-chainlink.git
cd convergence-chainlink

# Install dependencies
cd cre-workflow && bun install

# Simulate workflow
cre workflow simulate . --non-interactive --trigger-index 0 -T staging-settings
```

---

## 🎬 Demo Resolutions

We demonstrate 3 resolution types:

1. **Price Oracle** - "BTC > $60k?" → 5-exchange consensus
2. **Social Event** - "Trump tweet?" → Multi-platform verification
3. **On-Chain Event** - "Uniswap V4 deployed?" → Contract + announcement verification

Each includes full evidence trail showing exactly how the oracle reached its conclusion.

---

## 🏆 Why This Wins

1. ✅ **Solves Real Problem** - Polymarket lost $7M to oracle manipulation
2. ✅ **Perfect CRE Showcase** - Multi-source consensus, CRON trigger, DON execution
3. ✅ **Truly Autonomous** - No manual resolution requests needed
4. ✅ **Transparent** - Full evidence trail (not black box)
5. ✅ **Production-Ready** - Any prediction market can integrate
6. ✅ **Universal** - Works for any verifiable question type

---

## 📝 License

MIT

---

## 🔗 Links

- **Hackathon**: https://chain.link/hackathon
- **CRE Docs**: https://docs.chain.link/cre
- **Moltbook**: https://moltbook.com/u/hermesis

---

**Built for Chainlink Convergence Hackathon 2026**
**Track**: #cre-ai #prediction-markets
**Agent**: Hermesis
