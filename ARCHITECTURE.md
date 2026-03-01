# AEEIA Architecture

**AI-Evidenced, Execution-Integrity Assured Prediction Markets**

Built for Chainlink Convergence Hackathon 2026

---

## 🎯 Overview

AEEIA is a **DeFi primitive** for manipulation-resistant prediction markets using:
- **Multi-AI Consensus** (Claude, GPT, Grok, Gemini)
- **Tradeable Event Outcome Tokens** (ERC-20 YES/NO tokens)
- **AMM-based continuous trading** (constant product x*y=k)
- **Chainlink Runtime Environment** for all oracle operations

### Core Thesis

> "AI-fetched sources, CRE-verified truth"

Traditional prediction markets suffer from:
1. **Oracle manipulation** - single source of truth
2. **Poor liquidity** - locked funds until resolution
3. **Vague questions** - subjective/unresolvable markets

AEEIA solves this with:
1. **4 independent AI models** with weighted consensus
2. **Tradeable outcome tokens** + AMM pools for continuous liquidity
3. **AI-powered question validation** before market creation

---

## 🏗️ Architecture

### Smart Contracts (Solidity)

```
contracts/
├── EventOutcomeToken.sol    # ERC-20 token for YES/NO outcomes
├── EOTFactory.sol            # Factory for deploying token pairs
├── AEEIAPool.sol             # Constant product AMM (x*y=k)
├── AletheiaMarket.sol        # Main market contract
├── AletheiaOracle.sol        # CRE receiver for resolution data
└── ReceiverTemplate.sol      # CRE IReceiver implementation
```

**Flow:**
1. User creates market → `AletheiaMarket.createMarket()`
2. Factory deploys YES/NO token pair → `EOTFactory.createTokenPair()`
3. AMM pool deployed for trading → `new AEEIAPool()`
4. Users mint tokens by staking ETH → `mintTokens()` (1 ETH = 1 YES + 1 NO)
5. Users trade on AMM → `swap()`, `addLiquidity()`, `removeLiquidity()`
6. After deadline, CRE resolves → `_processReport()` via IReceiver
7. Winners redeem tokens for ETH → `redeemTokens()`

### CRE Workflow (TypeScript)

```
cre-workflow/
├── main.ts                          # CRON trigger + resolution logic
├── sources/
│   ├── multi-ai-consensus.ts        # 4-AI weighted voting
│   ├── question-validator.ts        # Pre-creation AI validation
│   ├── universal-resolver.ts        # Fallback resolver
│   └── price-feeds.ts               # Crypto price oracle
└── contracts/abi.ts                 # Contract ABIs
```

**Flow:**
1. CRON trigger runs every 5 minutes
2. Fetch pending markets (past deadline, not resolved)
3. For each market:
   - Query 4 AI models in parallel (Gemini, Claude, GPT, Grok)
   - Each AI searches web, returns `{outcome: boolean, confidence: 0-100}`
   - Weighted voting: sum(confidence * outcome) determines final result
   - Require ≥80% consensus to settle
4. Generate DON report with cryptographic proof
5. Write to oracle via EVM client → triggers `_processReport()`

---

## 🤖 Multi-AI Consensus

### Models Used

| Model | Provider | Version | Use Case |
|-------|----------|---------|----------|
| **Gemini** | Google | 2.0 Flash Exp | Search grounding, factual verification |
| **Claude** | Anthropic | 3.7 Sonnet | Reasoning, nuanced interpretation |
| **GPT** | OpenAI | 4.1 Mini | General knowledge, web search |
| **Grok** | xAI | 2.5 Mini | Real-time data, social media |

### Weighted Voting Algorithm

```typescript
// Each AI returns: {outcome: boolean, confidence: 0-100}
const yesScore = yesVotes.reduce((sum, r) => sum + r.confidence, 0)
const noScore = noVotes.reduce((sum, r) => sum + r.confidence, 0)

// Outcome: weighted majority wins
const finalOutcome = yesScore > noScore

// Confidence: average confidence of agreeing AIs
const avgConfidence = agreeingAIs.reduce((sum, r) => sum + r.confidence, 0) / agreeingAIs.length
```

**Example:**
```
Question: "Will BTC hit $100k by Dec 31, 2026?"

Gemini:  YES (85%)
Claude:  YES (90%)
GPT:     YES (82%)
Grok:    NO  (60%)

YES Score: 85 + 90 + 82 = 257
NO Score:  60

Final Outcome: YES
Final Confidence: (85 + 90 + 82) / 3 = 85.7%
Agreement: 75% (3/4 AIs agreed)
```

---

## 💎 Event Outcome Tokens (EOTs)

### Minting

Users stake ETH to mint equal amounts of YES and NO tokens:

```solidity
function mintTokens(uint256 marketId) external payable {
    // 1 ETH → 1 YES token + 1 NO token
    yesToken.mint(msg.sender, msg.value);
    noToken.mint(msg.sender, msg.value);
    // ETH held by market contract for redemption
}
```

**Why mint both?**
- Complete set: YES + NO = 100% probability
- Enables arbitrage if AMM price diverges from fair value
- Users can sell unwanted side on AMM

### Trading

Tokens are **freely tradeable** on the AMM pool:

```solidity
// Swap NO → YES
pool.swap(
    buyYes: true,
    amountIn: 1 ether,      // Sell 1 NO token
    minAmountOut: 0.95 ether // Receive ≥0.95 YES tokens (5% slippage)
)
```

**Price discovery:**
- AMM price reflects market sentiment
- If YES price > NO price → market leans YES
- Arbitrageurs keep prices aligned

### Redemption

After resolution, winners redeem 1:1 for ETH:

```solidity
function redeemTokens(uint256 marketId) external {
    // If outcome = YES:
    //   - 1 YES token → 1 ETH
    //   - 1 NO token → 0 ETH (worthless)
    winningToken.burn(msg.sender, balance);
    payable(msg.sender).transfer(balance);
}
```

---

## 🏊 AMM Liquidity Pools

### Constant Product Formula

AEEIA pools use Uniswap V2's **x * y = k** formula:

```
reserveYes * reserveNo = k (constant)

Price of YES = reserveNo / reserveYes
Price of NO = reserveYes / reserveNo
```

### Swap Formula

```solidity
amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
// 0.3% fee built into formula (997/1000 = 99.7%)
```

### Liquidity Provision

Users provide liquidity to earn trading fees:

```solidity
function addLiquidity(uint256 amountYes, uint256 amountNo) external returns (uint256 lpTokens) {
    // Mint LP tokens proportional to share of pool
    if (totalSupply == 0) {
        lpTokens = sqrt(amountYes * amountNo) - MINIMUM_LIQUIDITY;
    } else {
        lpTokens = min(
            (amountYes * totalSupply) / reserveYes,
            (amountNo * totalSupply) / reserveNo
        );
    }
    _mint(msg.sender, lpTokens);
}
```

**LP tokens:**
- Represent share of pool reserves
- Earn 0.3% fee on all trades
- Redeemable for proportional YES/NO tokens

---

## 🎓 AI Question Validation

### Pre-Creation Validation

Before market creation, AI validates the question:

```typescript
const validation = validateQuestion(runtime, question)

// Returns:
{
  valid: true,
  averageScore: 87,  // 0-100 (clarity, verifiability, objectivity)
  consensusIssues: [],
  consensusSuggestions: [],
  category: "price"
}
```

### Validation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Clarity** | 30% | Unambiguous, clear success conditions |
| **Verifiability** | 30% | Outcome verifiable through public sources |
| **Objectivity** | 20% | Binary YES/NO, no subjective judgment |
| **Specificity** | 10% | Includes deadline, exact criteria |
| **Feasibility** | 10% | Resolvable with web/API/blockchain data |

### Rejection Examples

❌ **Rejected:**
- "Will Tesla do well this year?" (vague: "do well")
- "Who is the best basketball player?" (subjective opinion)
- "Will aliens visit Earth in 2027?" (unverifiable)

✅ **Accepted:**
- "Will BTC close above $100k on Dec 31, 2026?" (specific, verifiable)
- "Will Tesla stock (TSLA) hit $500 by Q4 2026?" (objective, clear deadline)
- "Will Ethereum upgrade to PoS by July 2026?" (binary, blockchain-verifiable)

---

## 🔒 Security

### CRE IReceiver Pattern

All oracle data comes through the **IReceiver** interface:

```solidity
contract AletheiaOracle is ReceiverTemplate {
    constructor(address forwarderAddress) ReceiverTemplate(forwarderAddress) {}

    function _processReport(bytes calldata report) internal override {
        // Only callable by CRE forwarder after DON consensus
        (uint256 marketId, bool outcome, uint8 confidence, bytes32 proofHash) =
            abi.decode(report, (uint256, bool, uint8, bytes32));

        // Update market state
        markets[marketId].resolved = true;
        markets[marketId].outcome = outcome;
    }
}
```

**Security guarantees:**
1. Only authorized forwarder can call `onReport()`
2. DON consensus validates all data before submission
3. Cryptographic signatures verify data integrity
4. Proof hash provides audit trail

### AMM Reentrancy Protection

All state changes happen **before** external calls:

```solidity
function removeLiquidity(uint256 liquidity) external returns (uint256 amountYes, uint256 amountNo) {
    // Calculate amounts
    amountYes = (liquidity * reserveYes) / totalSupply;
    amountNo = (liquidity * reserveNo) / totalSupply;

    // Update state FIRST
    _burn(msg.sender, liquidity);
    reserveYes -= amountYes;
    reserveNo -= amountNo;

    // External calls LAST (reentrancy-safe)
    yesToken.transfer(msg.sender, amountYes);
    noToken.transfer(msg.sender, amountNo);
}
```

---

## 📊 Example Lifecycle

### 1. Market Creation

```javascript
// User creates market
const tx = await aletheiaMarket.createMarket(
    "Will BTC hit $100k by Dec 31, 2026?",
    1735689600,  // Unix timestamp for Dec 31, 2026
    1 ether,     // Initial YES liquidity
    1 ether      // Initial NO liquidity
    { value: 2 ether }
)

// Contract deploys:
// - YES token: AEEIA-1-YES
// - NO token:  AEEIA-1-NO
// - AMM pool:  AEEIAPool(YES, NO)
```

### 2. Trading Phase

```javascript
// Alice: Bullish on BTC
await aletheiaMarket.mintTokens(1, { value: 10 ether })
// Alice receives: 10 YES + 10 NO

await pool.swap(
    false,       // Sell YES, buy NO
    10 ether,    // Sell 10 NO tokens
    9.5 ether    // Min 9.5 YES tokens
)
// Alice now has: ~19.5 YES + 0 NO

// Bob: Bearish on BTC
await pool.addLiquidity(5 ether, 5 ether)
// Bob receives LP tokens, earns 0.3% fees on all trades
```

### 3. Resolution

```typescript
// Jan 1, 2027: CRE CRON trigger fires
const market = await fetchPendingMarkets()

// Query 4 AI models
const gemini = askGemini(runtime, market.question)  // YES (88%)
const claude = askClaude(runtime, market.question)  // YES (92%)
const gpt = askGPT(runtime, market.question)        // YES (85%)
const grok = askGrok(runtime, market.question)      // YES (90%)

// Weighted consensus
const result = {
    outcome: true,  // YES
    confidence: 88.75,
    agreementLevel: 100  // All 4 AIs agreed
}

// Write to oracle
await writeResolution(runtime, marketId, result)
```

### 4. Redemption

```javascript
// Alice (YES holder) redeems
await aletheiaMarket.redeemTokens(1)
// Burns 19.5 YES tokens
// Transfers 19.5 ETH to Alice
// Profit: 19.5 - 10 = 9.5 ETH

// Bob (LP provider) removes liquidity
await pool.removeLiquidity(lpTokens)
// Receives: X YES + Y NO tokens + trading fees
// Redeems YES tokens for ETH
```

---

## 🚀 Deployment

### Prerequisites

- Node.js 18+
- Foundry (for Solidity)
- CRE CLI v1.1.0+
- API keys: Gemini, Claude, OpenAI, xAI

### 1. Smart Contracts (Sepolia)

```bash
cd contracts/

# Deploy ReceiverTemplate, IReceiver, IERC165
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast

# Deploy AletheiaOracle (requires forwarder address)
forge create AletheiaOracle --constructor-args $FORWARDER_ADDRESS

# Deploy EOTFactory
forge create EOTFactory

# Deploy AletheiaMarket (requires oracle + factory)
forge create AletheiaMarket --constructor-args $ORACLE_ADDRESS $FACTORY_ADDRESS
```

### 2. CRE Workflow

```bash
cd cre-workflow/

# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Add API keys: GEMINI_API_KEY_VAR, CLAUDE_API_KEY_VAR, etc.

# Upload secrets
cre secrets upload

# Simulate workflow
cre workflow simulate

# Deploy workflow (requires Early Access approval)
cre workflow deploy
```

### 3. Frontend (Vercel)

```bash
cd frontend/

# Install dependencies
npm install

# Update contract addresses in lib/thirdweb.ts
# Set NEXT_PUBLIC_THIRDWEB_CLIENT_ID in .env.local

# Deploy
vercel --prod
```

---

## 📈 Technical Innovations

### 1. Multi-AI Consensus > Single Oracle

**Problem:** Traditional oracles rely on single data source (vulnerable to manipulation)

**Solution:** Query 4 independent AI models, use weighted voting

**Why it works:**
- Each AI has different training data, search algorithms, biases
- Consensus from 4 models is harder to manipulate than 1
- Confidence weighting rewards high-certainty answers

### 2. Tradeable Outcome Tokens > Locked Stakes

**Problem:** Traditional prediction markets lock funds until resolution

**Solution:** Mint ERC-20 tokens, enable AMM trading

**Why it works:**
- Users can exit positions before resolution
- Liquidity providers earn fees
- Price discovery happens continuously
- DeFi composability (use EOTs as collateral, in pools, etc.)

### 3. AI Question Validation > Manual Review

**Problem:** Users create vague/unresolvable markets

**Solution:** AI validates clarity, verifiability, objectivity before creation

**Why it works:**
- Deterministic scoring (0-100)
- Consistent standards across all markets
- Instant feedback (no human review delays)
- Reduces failed resolutions

---

## 🎯 Chainlink Convergence Requirements

✅ **Uses Chainlink Runtime Environment (CRE)**
- All oracle operations run in CRE WASM environment
- Confidential HTTP for AI API calls
- EVM client for on-chain writes
- DON consensus on all reports

✅ **IReceiver Interface Implementation**
- AletheiaOracle inherits from ReceiverTemplate
- Validates forwarder, workflow ID, owner
- Processes resolution reports via `_processReport()`

✅ **Autonomous Workflow**
- CRON trigger runs every 5 minutes
- Automatically detects pending markets
- Resolves without human intervention

✅ **Multi-Source Verification**
- 4 independent AI models (Gemini, Claude, GPT, Grok)
- Each AI searches web for factual evidence
- Consensus required for settlement

✅ **Cryptographic Proof**
- Proof hash generated from evidence + sources
- Stored on-chain for audit trail
- Enables verification of resolution process

---

## 📚 References

- [CRE Bootcamp](https://smartcontractkit.github.io/cre-bootcamp-2026/)
- [CRE Prediction Market Demo](https://github.com/smartcontractkit/cre-bootcamp-2026)
- [CRE Documentation](https://docs.chain.link/cre/)
- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf)

---

## 👥 Team

Built by **@krl** for Chainlink Convergence Hackathon 2026

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

---

## 📝 License

MIT
