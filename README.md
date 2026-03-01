<div align="center">
  <img src="Aletheia.png" alt="AEEIA Logo" width="200"/>

  # AEEIA (Aletheia)

  **AI-Evidenced, Execution-Integrity Assured Prediction Markets**

  *AI-Fetched Sources, CRE-Verified Truth*

  [![Hackathon](https://img.shields.io/badge/Chainlink-Convergence%202026-blue)](https://chain.link/hackathon)
  [![Contract](https://img.shields.io/badge/Sepolia-0xb136...315e-green)](https://sepolia.etherscan.io/address/0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e)
  [![GitHub](https://img.shields.io/badge/GitHub-convergence--chainlink-black)](https://github.com/Kirillr-Sibirski/convergence-chainlink)
</div>

Built with [Chainlink Runtime Environment (CRE)](https://docs.chain.link/cre) for Chainlink Convergence Hackathon 2026.

---

## 🎯 Vision

**The Problem:** Traditional prediction markets suffer from:
- **Oracle manipulation** - Single AI model or data source
- **Poor liquidity** - Locked funds until resolution
- **Vague questions** - Subjective, unresolvable markets

**AEEIA's Solution:** A **DeFi primitive** for manipulation-resistant prediction markets using:

### 🤖 Multi-AI Consensus
Query **4 independent AI models** (Claude, GPT, Grok, Gemini) and use **weighted voting** based on confidence scores. No single AI can manipulate outcomes.

### 💎 Tradeable Outcome Tokens
Mint **ERC-20 YES/NO tokens** (1 ETH → 1 YES + 1 NO). Trade on **AMM pools** before resolution. Winners redeem 1:1 for ETH.

### 🎓 AI-Powered Question Validation
Reject vague/subjective questions **before** market creation using AI consensus on clarity, verifiability, and objectivity.

---

## 🚀 What Makes AEEIA Unique

### Traditional Prediction Markets
```
❌ Single oracle (Chainlink Functions, UMA)
❌ Locked stakes until resolution
❌ Manual question approval
❌ Limited to specific question types
```

### AEEIA Prediction Markets
```
✅ Multi-AI consensus (4 independent models)
✅ Tradeable outcome tokens with AMM liquidity
✅ Automated AI question validation
✅ Universal: price, news, social, onchain, general
```

---

## 💡 Example: Bitcoin Price Market

### Market Creation
```typescript
Question: "Will BTC hit $100k by Dec 31, 2026?"

1. AI Validation (Claude + Gemini):
   ✓ Clarity: 90/100 (specific threshold)
   ✓ Verifiability: 95/100 (price APIs exist)
   ✓ Objectivity: 100/100 (binary YES/NO)
   ✓ Specificity: 95/100 (exact date specified)
   → APPROVED (Score: 95/100)

2. Market Created:
   - YES token: AEEIA-1-YES (ERC-20)
   - NO token: AEEIA-1-NO (ERC-20)
   - AMM pool: YES/NO pair with 0.3% fees
```

### Trading Phase
```typescript
Alice (Bullish):
1. Mint: 10 ETH → 10 YES + 10 NO tokens
2. Sell NO on AMM: 10 NO → 9.5 YES
3. Total position: 19.5 YES tokens

Bob (Liquidity Provider):
1. Add liquidity: 5 YES + 5 NO → LP tokens
2. Earns 0.3% on all trades

Price Discovery:
- Initial: 1 YES = 1 NO (50/50 probability)
- After Alice's trade: 1 YES = 0.95 NO (market leans YES)
```

### Resolution (Jan 1, 2027)
```typescript
CRE Workflow Triggers:
1. Gemini AI:  "YES (88% confident) - BTC at $105k"
2. Claude AI:  "YES (92% confident) - Multiple sources confirm"
3. GPT AI:     "YES (85% confident) - Price data verified"
4. Grok AI:    "YES (90% confident) - Real-time feeds show $105k"

Weighted Consensus:
- YES Score: 88 + 92 + 85 + 90 = 355
- NO Score:  0
- Agreement: 100% (4/4 AIs agreed)
- Final: YES with 88.75% confidence

Settlement:
- enableRedemption() on YES token
- Alice redeems: 19.5 YES → 19.5 ETH (9.5 ETH profit!)
- Bob removes liquidity: Gets proportional YES tokens + fees
```

---

## 🏗️ Architecture

### Smart Contracts (Solidity)

```
contracts/
├── EventOutcomeToken.sol    # ERC-20 YES/NO tokens
├── EOTFactory.sol            # Token pair factory
├── AEEIAPool.sol             # AMM (x*y=k) for trading
├── AletheiaMarket.sol        # Main market contract
├── AletheiaOracle.sol        # CRE resolution receiver
└── ReceiverTemplate.sol      # IReceiver implementation
```

**Key Features:**
- **Minting**: 1 ETH → 1 YES + 1 NO (complete sets)
- **Trading**: Constant product AMM with 0.3% fees
- **Liquidity**: LP tokens for liquidity providers
- **Redemption**: 1 winning token → 1 ETH

### CRE Workflow (TypeScript)

```
cre-workflow/
├── main.ts                       # CRON trigger (every 5 min)
├── sources/
│   ├── multi-ai-consensus.ts     # 4-AI weighted voting
│   ├── question-validator.ts     # Pre-creation validation
│   ├── universal-resolver.ts     # Fallback resolver
│   └── price-feeds.ts            # Crypto price oracle
└── contracts/abi.ts              # Contract ABIs
```

**Key Features:**
- **Parallel Queries**: All 4 AIs queried simultaneously
- **Weighted Voting**: Confidence scores determine outcome
- **Consensus Threshold**: Requires ≥80% confidence
- **Cryptographic Proof**: Evidence hash stored on-chain

---

## 🤖 Multi-AI Consensus Explained

### Why 4 AI Models?

| Model | Provider | Strength |
|-------|----------|----------|
| **Gemini 2.0** | Google | Search grounding, factual verification |
| **Claude 3.7** | Anthropic | Reasoning, nuanced interpretation |
| **GPT-4.1** | OpenAI | General knowledge, web search |
| **Grok 2.5** | xAI | Real-time data, social media |

### Weighted Voting Algorithm

```typescript
// Each AI returns: {outcome: boolean, confidence: 0-100}

Example Question: "Will ETH hit $5k by July 2026?"

Responses:
- Gemini:  YES (85%)
- Claude:  YES (90%)
- GPT:     YES (80%)
- Grok:    NO  (60%)

Calculation:
YES Score = 85 + 90 + 80 = 255
NO Score  = 60

Final Outcome: YES (higher score)
Final Confidence: (85 + 90 + 80) / 3 = 85%
Agreement: 75% (3/4 AIs agreed)

✅ SETTLES (≥80% confidence, ≥75% agreement)
```

**Why This Works:**
- Each AI has different training data and search algorithms
- Consensus from 4 models is harder to manipulate than 1
- Confidence weighting rewards high-certainty answers
- Agreement threshold ensures strong consensus

---

## 💎 Event Outcome Tokens (EOTs)

### What Are EOTs?

**Event Outcome Tokens** are ERC-20 tokens representing a specific outcome (YES or NO) in a prediction market.

### Why EOTs?

**Traditional:** Locked stakes (can't exit before resolution)
**AEEIA:** Tradeable tokens (continuous liquidity)

### Complete Set Minting

```solidity
// Stake 1 ETH → Mint 1 YES + 1 NO
aletheiaMarket.mintTokens(marketId, { value: 1 ether })

// Why both?
// - Complete set: YES + NO = 100% probability
// - Enables arbitrage if AMM price diverges
// - Users can sell unwanted side on AMM
```

### AMM Trading

```solidity
// Swap NO → YES (if you're bullish)
pool.swap(
    buyYes: true,
    amountIn: 1 ether,       // Sell 1 NO token
    minAmountOut: 0.95 ether // Receive ≥0.95 YES (5% slippage)
)

// Price discovery:
Price of YES = reserveNo / reserveYes
Price of NO  = reserveYes / reserveNo

// If more people buy YES:
// - Price of YES increases
// - Price of NO decreases
// - Market sentiment = Bullish
```

### Redemption

```solidity
// After resolution (if outcome = YES):
aletheiaMarket.redeemTokens(marketId)

// Burns YES tokens, transfers ETH:
1 YES token → 1 ETH
1 NO token  → 0 ETH (worthless)
```

---

## 🎓 AI Question Validation

### Before Market Creation

AEEIA validates **every question** before allowing market creation:

```typescript
const validation = validateQuestion(runtime, question)

Returns:
{
  valid: true,
  averageScore: 87,  // Claude + Gemini consensus
  consensusIssues: [],
  consensusSuggestions: [],
  category: "price"
}
```

### Validation Criteria (0-100 Score)

| Criterion | Weight | Example |
|-----------|--------|---------|
| **Clarity** | 30% | "Will BTC hit $100k?" ✅ vs "Will BTC do well?" ❌ |
| **Verifiability** | 30% | "Price on Dec 31" ✅ vs "Aliens visit Earth" ❌ |
| **Objectivity** | 20% | "Stock hits $500" ✅ vs "Best player?" ❌ |
| **Specificity** | 10% | "By Dec 31, 2026" ✅ vs "Soon" ❌ |
| **Feasibility** | 10% | "API data exists" ✅ vs "Private info" ❌ |

### Examples

❌ **Rejected (Score < 70):**
```
"Will Tesla do well this year?" (vague: "do well")
"Who is the best basketball player?" (subjective opinion)
"Will aliens visit Earth in 2027?" (unverifiable)
```

✅ **Accepted (Score ≥ 70):**
```
"Will BTC close above $100k on Dec 31, 2026?" (95/100)
"Will Tesla stock (TSLA) hit $500 by Q4 2026?" (92/100)
"Will Ethereum upgrade to PoS by July 2026?" (88/100)
```

---

## 🔒 Security

### 1. CRE IReceiver Pattern

Only authorized CRE forwarder can submit resolutions:

```solidity
contract AletheiaOracle is ReceiverTemplate {
    constructor(address forwarderAddress) ReceiverTemplate(forwarderAddress) {}

    function _processReport(bytes calldata report) internal override {
        // Only callable by CRE forwarder after DON consensus
        (uint256 marketId, bool outcome, uint8 confidence, bytes32 proofHash) =
            abi.decode(report, (uint256, bool, uint8, bytes32));

        markets[marketId].resolved = true;
        markets[marketId].outcome = outcome;
    }
}
```

### 2. DON Consensus

- All AI responses validated by Decentralized Oracle Network
- Cryptographic signatures verify data integrity
- Proof hash provides audit trail

### 3. AMM Reentrancy Protection

State changes **before** external calls:

```solidity
function removeLiquidity(uint256 liquidity) external {
    // Calculate amounts
    amountYes = (liquidity * reserveYes) / totalSupply;

    // Update state FIRST
    _burn(msg.sender, liquidity);
    reserveYes -= amountYes;

    // External calls LAST (safe)
    yesToken.transfer(msg.sender, amountYes);
}
```

---

## 📂 Repository Structure

```
convergence-chainlink/
├── contracts/                    # Solidity smart contracts
│   ├── EventOutcomeToken.sol    # ERC-20 YES/NO tokens
│   ├── EOTFactory.sol            # Token pair factory
│   ├── AEEIAPool.sol             # AMM (x*y=k)
│   ├── AletheiaMarket.sol        # Main market contract
│   ├── AletheiaOracle.sol        # CRE receiver
│   └── ReceiverTemplate.sol      # IReceiver implementation
├── cre-workflow/                 # CRE TypeScript workflow
│   ├── main.ts                   # CRON trigger
│   ├── sources/
│   │   ├── multi-ai-consensus.ts # 4-AI weighted voting
│   │   ├── question-validator.ts # AI question validation
│   │   ├── universal-resolver.ts # Fallback resolver
│   │   └── price-feeds.ts        # Crypto price oracle
│   └── secrets.yaml              # API key configuration
├── frontend/                     # Next.js + Thirdweb
│   ├── app/page.tsx              # Main UI
│   ├── components/
│   │   └── trading/              # Market cards, modals
│   └── lib/
│       └── web3-thirdweb.ts      # Contract interactions
├── ARCHITECTURE.md               # Technical deep dive
├── DEPLOYMENT.md                 # Step-by-step deployment
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Foundry (Solidity)
- CRE CLI v1.1.0+
- Sepolia ETH ([Chainlink Faucet](https://faucets.chain.link/))

### 1. Clone Repository

```bash
git clone https://github.com/Kirillr-Sibirski/convergence-chainlink.git
cd convergence-chainlink
```

### 2. Deploy Smart Contracts (Sepolia)

```bash
cd contracts/

# Compile
forge build

# Deploy (see DEPLOYMENT.md for full instructions)
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast
```

### 3. Deploy CRE Workflow

```bash
cd cre-workflow/

# Install dependencies
npm install

# Simulate locally (no gas fees)
cre workflow simulate

# Deploy to CRE (requires Early Access approval)
cre workflow deploy
```

### 4. Run Frontend

```bash
cd frontend/

# Install dependencies
npm install

# Update contract addresses in lib/thirdweb.ts

# Run locally
npm run dev

# Deploy to Vercel
vercel --prod
```

**📚 Full deployment guide:** See [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📊 Technical Innovations

### 1. Multi-AI Consensus > Single Oracle
**Problem:** Single AI vulnerable to hallucinations, bias, manipulation
**Solution:** 4 independent AIs with weighted voting
**Why:** Consensus from diverse models is harder to manipulate

### 2. Tradeable Outcome Tokens > Locked Stakes
**Problem:** Traditional markets lock funds until resolution
**Solution:** ERC-20 tokens tradeable on AMM pools
**Why:** Continuous liquidity, price discovery, DeFi composability

### 3. AI Question Validation > Manual Review
**Problem:** Users create vague/unresolvable markets
**Solution:** AI scores clarity, verifiability, objectivity (0-100)
**Why:** Deterministic, instant feedback, reduces failed resolutions

---

## 🎯 Chainlink Convergence Requirements

✅ **Uses Chainlink Runtime Environment (CRE)**
- All oracle operations run in CRE WASM environment
- Confidential HTTP for AI API calls
- EVM client for on-chain writes
- DON consensus on all reports

✅ **IReceiver Interface Implementation**
- AletheiaOracle inherits ReceiverTemplate
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

## 📈 Use Cases

### 1. Crypto Price Predictions
```
"Will BTC hit $100k by Dec 31, 2026?"
"Will ETH/BTC ratio exceed 0.05 by Q2 2027?"
"Will LINK reach $50 before March 2027?"
```

### 2. DeFi Protocol Events
```
"Will Uniswap V4 launch before Q3 2026?"
"Will Aave's TVL exceed $20B by year end?"
"Will MakerDAO rebrand to Sky by June 2026?"
```

### 3. Real-World Events
```
"Will SpaceX launch Starship to Mars by 2027?"
"Will Fed cut rates below 3% by Q4 2026?"
"Will Apple announce Vision Pro 2 at WWDC 2026?"
```

### 4. Social Media Events
```
"Will Elon tweet about Dogecoin before April 2026?"
"Will Trump's Truth Social IPO by Q2 2026?"
"Will Twitter rebrand back from X by 2027?"
```

---

## 🛣️ Roadmap

### Phase 1: Hackathon MVP (✅ Complete)
- [x] Smart contracts (EOT, AMM, Market, Oracle)
- [x] Multi-AI consensus (4 models)
- [x] AI question validation
- [x] CRE workflow with CRON trigger
- [x] Frontend with Thirdweb integration

### Phase 2: Testnet Launch (Current)
- [ ] Deploy to Sepolia testnet
- [ ] Test end-to-end market lifecycle
- [ ] Gather community feedback
- [ ] Optimize gas costs

### Phase 3: Security & Optimization
- [ ] Smart contract audit
- [ ] Gas optimization (AMM formula)
- [ ] Frontend UX improvements
- [ ] Add more AI models (DeepSeek, etc.)

### Phase 4: Mainnet Launch
- [ ] Deploy to Ethereum mainnet
- [ ] Launch $AEEIA governance token
- [ ] Liquidity mining incentives
- [ ] DAO formation

---

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete technical breakdown
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step deployment guide
- **[CRE Docs](https://docs.chain.link/cre/)** - Chainlink Runtime Environment
- **[Thirdweb Docs](https://portal.thirdweb.com/)** - Web3 SDK documentation

---

## 🤝 Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md).

### Areas for Contribution
- Additional AI model integrations (DeepSeek, Mistral, etc.)
- Gas optimization for AMM swaps
- Frontend UX improvements
- Question validation criteria refinement
- Security testing and audits

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details

---

## 👥 Team

Built by **@krl** for Chainlink Convergence Hackathon 2026

**Co-Authored-By:** Claude Sonnet 4.5 <noreply@anthropic.com>

---

## 🔗 Links

- **GitHub**: https://github.com/Kirillr-Sibirski/convergence-chainlink
- **Demo**: Coming soon
- **Docs**: [ARCHITECTURE.md](ARCHITECTURE.md) | [DEPLOYMENT.md](DEPLOYMENT.md)
- **Chainlink Convergence**: https://chain.link/hackathon
- **CRE Bootcamp**: https://smartcontractkit.github.io/cre-bootcamp-2026/

---

<div align="center">
  <sub>Built with ❤️ using Chainlink Runtime Environment</sub>
</div>
