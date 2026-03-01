# Aletheia - Technical Overview

## Architecture

```
┌─────────────────┐
│  Smart Contract │  (Sepolia: 0xb136...315e)
│ AletheiaOracle  │
└────────┬────────┘
         │
         │ 1. getPendingMarkets()
         │ 2. resolveMarket(id, outcome, confidence, proof)
         │
┌────────▼────────┐
│   CRE Workflow  │  (CRON: Every 5 minutes)
│    TypeScript   │
└────────┬────────┘
         │
         │ A. Fetch pending markets
         │ B. For each market:
         │    ├─> Analyze question type (AI)
         │    ├─> Select 5 sources
         │    ├─> Fetch from all sources (HTTP)
         │    ├─> Calculate consensus (Byzantine)
         │    └─> Write resolution on-chain (EVM)
         │
┌────────▼────────┐
│  5 Data Sources │
│ (APIs/Agents)   │
└─────────────────┘
```

## Core Components

### 1. Smart Contract (`contracts/AletheiaOracle.sol`)

**Purpose:** Immutable storage for prediction markets and resolutions

**Key Functions:**
- `createMarket(question, deadline)` - Anyone can create a market
- `getPendingMarkets()` - Returns markets past deadline but not resolved
- `resolveMarket(marketId, outcome, confidence, proofHash)` - Only CRE workflow can call
- `getResolution(marketId)` - Read resolution with confidence score

**Storage:**
```solidity
struct Market {
    uint256 id;
    string question;
    uint256 deadline;
    bool resolved;
    bool outcome;       // true = YES, false = NO
    uint8 confidence;   // 0-100%
    bytes32 proofHash;  // SHA256 of all source data
    uint256 createdAt;
}

mapping(uint256 => Market) public markets;
```

**Security:**
- `onlyCRE` modifier ensures only the registered CRE workflow can resolve markets
- `setWorkflowAddress()` allows owner to update CRE address

### 2. CRE Workflow (`cre-workflow/main.ts`)

**Purpose:** Autonomous resolution engine that runs every 5 minutes

**Trigger:** CRON (`project.yaml`)
```yaml
triggers:
  - type: cron
    schedule: "*/5 * * * *"  # Every 5 minutes
```

**Main Loop:**
```typescript
export default main = async (runtime: Runtime<Config>) => {
  // 1. Connect to Sepolia
  const provider = new ethers.JsonRpcProvider(config.rpc_url)
  const oracle = new ethers.Contract(config.oracle_address, ABI, wallet)

  // 2. Fetch pending markets
  const pending = await oracle.getPendingMarkets()

  // 3. Resolve each market
  for (const market of pending) {
    // A. Analyze question type
    const strategy = analyzeQuestionFeasibility(market.question)

    // B. Fetch from 5 sources
    const result = fetchMultiSourceData(runtime, strategy.sources, market.question, strategy.category)

    // C. Calculate consensus (4/5 must agree)
    const consensus = runtime.aggregateConsensus({
      responses: result.sources,
      threshold: 0.8  // 4 out of 5
    })

    // D. Write on-chain with DON signature
    const proofHash = ethers.keccak256(JSON.stringify(result.evidence))
    await oracle.resolveMarket(market.id, result.outcome, result.confidence, proofHash)

    // E. Report to DON for verification
    runtime.report({
      marketId: market.id,
      outcome: result.outcome,
      confidence: result.confidence,
      sources: result.sources
    })
  }
}
```

**CRE Capabilities Used:**

| Capability | Usage | Code Location |
|------------|-------|---------------|
| **CronCapability** | Triggers workflow every 5 minutes | `project.yaml:16` |
| **HTTPClient** | Fetches from multiple APIs in parallel | `price-feeds.ts:148`, `universal-resolver.ts:89` |
| **EVMClient** | Reads pending markets, writes resolutions | `main.ts:59`, `main.ts:277` |
| **runtime.report()** | Submits data to DON for cryptographic signatures | `main.ts:267` |
| **ConsensusAggregation** | Byzantine fault tolerance (4/5 sources) | `main.ts:237` |

### 3. Universal Question Resolver (`cre-workflow/sources/universal-resolver.ts`)

**Purpose:** Handles ANY verifiable question type

**6 Question Categories:**

#### A. PRICE
```typescript
Question: "Will BTC close above $60,000 on March 1, 2026?"
Sources: [CoinGecko, Binance, Coinbase, Kraken, CoinCap]
Method: Fetch price from 5 exchanges, calculate median
Consensus: All sources must agree within 0.01%
```

#### B. WEATHER
```typescript
Question: "Will it rain in Tokyo on March 5, 2026?"
Sources: [OpenWeatherMap, WeatherAPI, AccuWeather, Weather.gov, NOAA]
Method: Check precipitation > 0mm from 5 APIs
Consensus: 4/5 must agree on rain/no-rain
```

#### C. SOCIAL
```typescript
Question: "Did Elon Musk tweet about Dogecoin on March 1st?"
Sources: [Twitter API, Nitter, Archive.org, NewsAPI, Google Search]
Method: Search all sources for matching tweets
Consensus: 4/5 must find evidence
```

#### D. NEWS
```typescript
Question: "Will Trump announce candidacy before March 31st?"
Sources: [Reuters, AP, BBC, NYT, WSJ]
Method: Scrape news sites for announcement
Consensus: 4/5 must report same event
```

#### E. ONCHAIN
```typescript
Question: "Will Ethereum gas price exceed 100 gwei on March 10th?"
Sources: [Etherscan, Infura, Alchemy, QuickNode, Chainstack]
Method: Query blockchain state from 5 RPC nodes
Consensus: Median gas price calculation
```

#### F. GENERAL (AI Agents)
```typescript
Question: "How many times did Trump say 'peace' in the UN speech?"
Sources: [5 independent AI agents]
Method: Each agent watches video, counts independently
Consensus: Median count (e.g., [12, 12, 13, 12, 11] → 12)
```

**Source Selection Logic:**
```typescript
export const analyzeQuestionFeasibility = (question: string): VerificationStrategy => {
  const lowerQ = question.toLowerCase()

  // Pattern matching to detect category
  if (lowerQ.includes('btc') || lowerQ.includes('price') || lowerQ.includes('$')) {
    return { category: 'price', sources: PRICE_SOURCES, feasible: true }
  }

  if (lowerQ.includes('rain') || lowerQ.includes('weather') || lowerQ.includes('temperature')) {
    return { category: 'weather', sources: WEATHER_SOURCES, feasible: true }
  }

  // ... etc for all 6 categories
}
```

### 4. Byzantine Consensus

**Problem:** Can't trust a single source (APIs can fail, lie, or be hacked)

**Solution:** Require 4 out of 5 sources to agree

**Example:**
```
Question: "Will BTC close above $60,000?"

Source Results:
- CoinGecko:  $95,234.12
- Binance:    $95,231.89
- Coinbase:   $95,236.54
- Kraken:     $95,233.21
- CoinCap:    $95,235.77

Median: $95,234.12
Variance: 0.005% (all within 0.01% threshold)
Consensus: 5/5 agree ✓
Confidence: 95%
Outcome: TRUE (all prices > $60k)
```

**If one source fails:**
```
Source Results:
- CoinGecko:  $95,234.12
- Binance:    $95,231.89
- Coinbase:   TIMEOUT (failed)
- Kraken:     $95,233.21
- CoinCap:    $95,235.77

Available: 4/5
Median: $95,233.66
Consensus: 4/5 agree ✓
Confidence: 80%
Outcome: TRUE
```

**If sources disagree:**
```
Source Results:
- CoinGecko:  $95,234.12
- Binance:    $59,123.45  (suspicious!)
- Coinbase:   $95,236.54
- Kraken:     $95,233.21
- CoinCap:    $95,235.77

Median: $95,234.12
Outlier detected: Binance differs by 38%
Consensus: 4/5 agree ✓
Confidence: 70%
Outcome: TRUE (using 4-source majority)
```

### 5. Cryptographic Proof

Every resolution includes a `proofHash` - SHA256 of all source data:

```typescript
const evidence = {
  sources: [
    { name: "CoinGecko", value: 95234.12, timestamp: 1709251200 },
    { name: "Binance", value: 95231.89, timestamp: 1709251201 },
    // ... all 5 sources
  ],
  median: 95234.12,
  variance: 0.005,
  consensus: "5/5"
}

const proofHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(evidence)))
// 0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
```

Anyone can verify the resolution by:
1. Fetching the same sources at the same timestamp
2. Calculating the hash
3. Comparing to on-chain `proofHash`

## Data Flow Example

**User creates market:**
```
POST createMarket("Will BTC close above $60k on March 1?", 1709251200)
→ Emits MarketCreated event
→ Market ID: 1
```

**5 minutes later, CRON trigger fires:**
```
1. CRE workflow wakes up
2. Calls oracle.getPendingMarkets()
3. Finds Market ID 1 (deadline passed, not resolved)
4. Analyzes question: "btc" + "price" → PRICE category
5. Selects sources: [CoinGecko, Binance, Coinbase, Kraken, CoinCap]
6. Fetches in parallel:
   - CoinGecko: 95234.12 (200ms)
   - Binance: 95231.89 (180ms)
   - Coinbase: 95236.54 (220ms)
   - Kraken: 95233.21 (195ms)
   - CoinCap: 95235.77 (210ms)
7. Calculates consensus: median = 95234.12, variance = 0.005%
8. Determines outcome: TRUE (all > 60k)
9. Generates proof: hash(evidence)
10. Calls oracle.resolveMarket(1, TRUE, 95, 0x7f83...)
11. Emits MarketResolved event
12. runtime.report() for DON signature
```

**Prediction market reads resolution:**
```
getResolution(1)
→ { resolved: true, outcome: true, confidence: 95, proofHash: 0x7f83... }
→ Pays out YES bettors
```

## Why This is Novel

**Existing solutions:**

| Solution | Problem |
|----------|---------|
| **UMA** | Humans vote (2+ hours delay, costs $100+, can be manipulated) |
| **Polymarket** | Centralized oracle (single point of failure, lost $7M in hack) |
| **Chainlink Data Streams** | Only price feeds (can't handle "Will it rain?") |
| **AI oracles** | Black box (no transparency, can hallucinate) |

**Aletheia advantages:**

| Feature | How |
|---------|-----|
| **Fast** | 2-5 minutes (CRON + parallel fetching) |
| **Universal** | Handles ANY question (6 categories) |
| **Transparent** | Shows all sources + consensus calculation |
| **Trustless** | Byzantine consensus (4/5 threshold) |
| **Autonomous** | No human intervention (CRON trigger) |
| **Verifiable** | Cryptographic proofs (SHA256 hashes) |

## Testing

Run tests with:
```bash
cd cre-workflow
npm test
```

Tests cover:
- ✅ Question category detection (price, weather, social, news, onchain, general)
- ✅ Source selection for each category
- ✅ Consensus calculation with outliers
- ✅ Edge cases (all sources fail, 2/5 disagree, etc.)

## Deployment Info

**Smart Contract:**
- Address: `0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e`
- Network: Sepolia Testnet
- Etherscan: https://sepolia.etherscan.io/address/0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e

**Frontend:**
- Live Demo: https://aletheia-gilt.vercel.app
- Framework: Next.js 14 + Thirdweb + Tailwind CSS

**CRE Workflow:**
- Language: TypeScript
- Runtime: Chainlink CRE WASM
- Trigger: CRON (every 5 minutes)
- Config: `cre-workflow/project.yaml`

## Next Steps

1. Deploy CRE workflow to Chainlink DON
2. Register workflow address with `oracle.setWorkflowAddress()`
3. Create test markets on frontend
4. Wait for CRON trigger to resolve
5. Verify resolutions on Etherscan

---

**Built for Chainlink Convergence Hackathon 2026**
