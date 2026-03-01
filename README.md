<div align="center">
  <img src="Aletheia.png" alt="AEEIA Logo" width="200"/>

  # AEEIA (Aletheia)

  **AI-Powered Prediction Market Oracle - ZERO Hardcoded Sources**

  [![Contract](https://img.shields.io/badge/Sepolia-0xb136...315e-green)](https://sepolia.etherscan.io/address/0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e)
  [![GitHub](https://img.shields.io/badge/GitHub-convergence--chainlink-blue)](https://github.com/Kirillr-Sibirski/convergence-chainlink)
</div>

Built with [Chainlink Runtime Environment (CRE)](https://docs.chain.link/cre) for Chainlink Convergence Hackathon 2026.

---

## 🚀 What Makes AEEIA Unique

**Traditional Oracles:** Use hardcoded API lists (e.g., always fetch from CoinGecko, Binance, Kraken).

**AEEIA:** Uses AI to **discover AND process** data sources dynamically for **ANY question**.

### Example: Bitcoin Price Question
```
Question: "Will Bitcoin exceed $100,000 by March 31, 2026?"

Traditional Oracle:
✗ Hardcoded: [CoinGecko API, Binance API, Kraken API]

AEEIA:
✓ AI discovers: [CoinGecko API, Binance API, CoinCap API, Coinbase API, Kraken API]
✓ Each DON node runs AI independently
✓ DON reaches consensus on which sources to use (5/7 nodes must agree)
✓ Fetches data from all 5 sources
✓ Applies Byzantine Fault Tolerant consensus (4/5 sources must agree)
✓ Returns: TRUE with 95% confidence
```

### Example: News Question
```
Question: "Did SpaceX launch Starship before March 15, 2026?"

Traditional Oracle:
✗ Cannot handle (no hardcoded news APIs)

AEEIA:
✓ AI discovers: [Reuters article, AP News article, SpaceX Twitter, NASA feed, Space.com]
✓ AI processes each source (reads articles, extracts facts)
✓ Returns: "extractionPath": "AI_EXTRACT" for complex sources
✓ DON consensus on AI-extracted facts
✓ Returns: TRUE with 88% confidence
```

---

## 📂 Repository Structure

```
convergence-chainlink/
├── contracts/
│   └── AletheiaOracle.sol          # Deployed smart contract
├── cre-workflow/
│   ├── main.ts                     # CRE entry point
│   ├── sources/
│   │   └── ai-source-discovery.ts  # THE CORE USP
│   └── project.yaml                # CRE configuration
├── frontend/
│   ├── app/
│   │   └── page.tsx                # Next.js frontend
│   ├── components/
│   │   ├── ui/                     # EinUI glass components
│   │   └── CreateMarketModal.tsx
│   └── lib/
│       └── contract.ts             # Contract ABI + address
├── README.md
```

---

## 🛠️ How It Works

### 1. User Creates Market
```typescript
// Frontend (Next.js + thirdweb)
const tx = await contract.createMarket(
  "Will Bitcoin exceed $100,000 by March 31, 2026?",
  new Date("2026-03-31").getTime() / 1000
)
```

### 2. CRE CRON Checks for Pending Markets
```typescript
// cre-workflow/main.ts (runs every 5 minutes)
const pendingMarkets = await contract.getPendingMarkets()

for (const market of pendingMarkets) {
  if (market.deadline <= currentTime) {
    await resolveMarket(market)
  }
}
```

### 3. AI Discovers Sources
```typescript
// cre-workflow/sources/ai-source-discovery.ts
const strategy = await discoverSources(runtime, market.question)

// Returns:
{
  category: "PRICE",
  sources: [
    { name: "CoinGecko", url: "...", apiType: "rest" },
    { name: "Binance", url: "...", apiType: "rest" },
    { name: "Coinbase", url: "...", apiType: "rest" },
    { name: "Kraken", url: "...", apiType: "rest" },
    { name: "CoinCap", url: "...", apiType: "rest" }
  ],
  consensusThreshold: 0.8
}
```

### 4. CRE Fetches + Aggregates
```typescript
const results = await Promise.all(
  strategy.sources.map(source => fetchAndProcessSource(runtime, source, question))
)

// Byzantine Fault Tolerant Consensus
const finalOutcome = results.filter(r => r.answer === true).length >= 4
const confidence = Math.round((agreementCount / totalSources) * 100)
```

### 5. CRE Resolves On-Chain
```typescript
await contract.resolveMarket(
  marketId,
  finalOutcome,      // true/false
  confidence,        // 0-100
  proofHash          // IPFS hash of evidence
)
```

---

## 🚀 Deployment

### Smart Contract (✅ Deployed)
- **Network:** Sepolia Testnet
- **Address:** `0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e`
- **Deployer:** `0x2000f57be293734aeD2Ca9d629080A21E782FCAb`
- **View:** https://sepolia.etherscan.io/address/0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e

### Frontend (Ready to Deploy)
```bash
cd frontend
npm install
npm run build
vercel --prod
```

### CRE Workflow (Ready for DON)
```bash
cd cre-workflow
npm install
cre workflow deploy . --network sepolia
```
---

## 📜 License

MIT

---

**Built by Hermesis AI Agent** | [GitHub](https://github.com/Kirillr-Sibirski/convergence-chainlink)
