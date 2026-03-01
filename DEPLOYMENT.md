# AEEIA Deployment Guide

Complete deployment instructions for Sepolia testnet.

---

## Prerequisites

### 1. Wallet Setup

- [ ] MetaMask wallet with Sepolia ETH (get from [Chainlink Faucet](https://faucets.chain.link/))
- [ ] Private key exported (Settings → Security & Privacy → Show Private Key)
- [ ] Minimum 0.5 ETH on Sepolia for gas fees

### 2. Development Tools

```bash
# Install Foundry (Solidity)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install CRE CLI
npm install -g @chainlink/cre-cli@latest

# Verify installations
forge --version    # Should be ≥0.2.0
cre --version      # Should be ≥1.1.0
```

### 3. API Keys

Get API keys from:
- **Gemini**: https://aistudio.google.com/apikey
- **Claude**: https://console.anthropic.com/
- **OpenAI**: https://platform.openai.com/api-keys
- **Grok**: https://console.x.ai/

### 4. CRE Account

```bash
# Create CRE account
cre account create

# Login
cre auth login

# Verify Early Access approval
cre account show
# Should show: "Early Access: Approved"
```

---

## Step 1: Deploy Smart Contracts

### A. Compile Contracts

```bash
cd contracts/

# Compile all contracts
forge build

# Expected output:
# ✅ EventOutcomeToken
# ✅ EOTFactory
# ✅ AEEIAPool
# ✅ AletheiaMarket
# ✅ AletheiaOracle
# ✅ ReceiverTemplate
```

### B. Deploy Infrastructure Contracts

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key_here
export RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key

# 1. Deploy ReceiverTemplate dependencies
forge create contracts/IERC165.sol:IERC165 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

forge create contracts/IReceiver.sol:IReceiver \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

forge create contracts/ReceiverTemplate.sol:ReceiverTemplate \
  --constructor-args <FORWARDER_ADDRESS> \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# 2. Deploy EOTFactory
forge create contracts/EOTFactory.sol:EOTFactory \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Save address → $FACTORY_ADDRESS
```

**Note:** `FORWARDER_ADDRESS` is provided by Chainlink after CRE workflow deployment. We'll deploy contracts in two phases.

### C. Deploy AletheiaOracle (After CRE Workflow)

```bash
# This requires FORWARDER_ADDRESS from CRE
forge create contracts/AletheiaOracle.sol:AletheiaOracle \
  --constructor-args <FORWARDER_ADDRESS> \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Save address → $ORACLE_ADDRESS
```

### D. Deploy AletheiaMarket

```bash
forge create contracts/AletheiaMarket.sol:AletheiaMarket \
  --constructor-args $ORACLE_ADDRESS $FACTORY_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Save address → $MARKET_ADDRESS
```

---

## Step 2: Deploy CRE Workflow

### A. Setup Environment

```bash
cd cre-workflow/

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add API keys:
GEMINI_API_KEY_VAR=your_gemini_api_key
CLAUDE_API_KEY_VAR=your_claude_api_key
OPENAI_API_KEY_VAR=your_openai_api_key
XAI_API_KEY_VAR=your_xai_grok_api_key
```

### B. Update config.json

```json
{
  "cronSchedule": "*/5 * * * *",
  "oracleAddress": "<YOUR_ORACLE_ADDRESS>",
  "chainSelectorName": "ethereum-testnet-sepolia",
  "gasLimit": "500000"
}
```

### C. Upload Secrets

```bash
# Upload all 4 API keys
cre secrets upload

# Verify secrets
cre secrets list
# Should show: GEMINI_API_KEY, CLAUDE_API_KEY, OPENAI_API_KEY, XAI_API_KEY
```

### D. Test Workflow Locally

```bash
# Simulate workflow (no gas fees)
cre workflow simulate

# Expected output:
# ✅ Secrets loaded
# ✅ HTTP client initialized
# ✅ Multi-AI consensus working
# ✅ EVM client connected
```

### E. Deploy Workflow

```bash
# Deploy to CRE (requires Early Access approval)
cre workflow deploy

# Expected output:
# ✅ Workflow deployed
# ✅ Forwarder address: 0x...
# ✅ Workflow ID: workflow-123...

# Save forwarder address → $FORWARDER_ADDRESS
```

### F. Link Wallet Key

```bash
# Link wallet for on-chain writes
cre wallet link --private-key $PRIVATE_KEY

# Verify wallet
cre wallet show
# Should show: "Wallet: 0x... (linked)"
```

### G. Activate Workflow

```bash
# Start CRON trigger
cre workflow activate

# Check status
cre workflow status
# Should show: "Status: Active"
```

---

## Step 3: Complete Oracle Deployment

Now that we have `FORWARDER_ADDRESS`, deploy `AletheiaOracle`:

```bash
cd contracts/

# Deploy oracle with forwarder address
forge create contracts/AletheiaOracle.sol:AletheiaOracle \
  --constructor-args $FORWARDER_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Update config.json with new oracle address
```

---

## Step 4: Verify Deployment

### Test Market Creation

```bash
# Use cast to create a test market
cast send $MARKET_ADDRESS \
  "createMarket(string,uint256,uint256,uint256)" \
  "Will BTC hit \$100k by Dec 31, 2026?" \
  1735689600 \
  1000000000000000000 \
  1000000000000000000 \
  --value 2ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Check market count
cast call $MARKET_ADDRESS "marketCount()" --rpc-url $RPC_URL
# Should return: 1
```

### Monitor CRE Workflow

```bash
# View workflow logs
cre workflow logs --follow

# Expected output every 5 minutes:
# CRON triggered at 2026-03-01T12:00:00.000Z
# Checking for pending markets...
# Found 0 pending market(s)
```

### Test Resolution (After Deadline)

```bash
# Fast-forward time (for testing)
# Create market with deadline in 1 minute
cast send $MARKET_ADDRESS \
  "createMarket(string,uint256,uint256,uint256)" \
  "Will ETH be above \$3000 right now?" \
  $(($(date +%s) + 60)) \
  1000000000000000000 \
  1000000000000000000 \
  --value 2ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Wait 2 minutes...

# Check logs
cre workflow logs --tail 50

# Expected output:
# Found 1 pending market(s)
# [Gemini] Querying AI...
# [Claude] Querying AI...
# [GPT] Querying AI...
# [Grok] Querying AI...
# Agreement level: 100% (4 AI models)
# ✅ Resolved market 2
```

---

## Step 5: Frontend Deployment

### A. Update Contract Addresses

```bash
cd frontend/

# Edit lib/thirdweb.ts
export const CONTRACTS_CONFIG = {
  ORACLE_ADDRESS: "<YOUR_ORACLE_ADDRESS>",
  PREDICTION_MARKET_ADDRESS: "<YOUR_MARKET_ADDRESS>",
  CHAIN_ID: 11155111,
}
```

### B. Get Thirdweb Client ID

1. Go to https://thirdweb.com/dashboard
2. Create new project
3. Copy Client ID

### C. Configure Environment

```bash
# Create .env.local
echo "NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here" > .env.local
```

### D. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Expected output:
# ✅ Production: https://aeeia.vercel.app
```

---

## Troubleshooting

### Issue: "Secret not found"

**Cause:** Secret name substring conflict (CRE CLI v1.1.0 bug)

**Fix:**
```yaml
# secrets.yaml - Use suffixes to avoid conflicts
secretsNames:
    GEMINI_API_KEY:
        - GEMINI_API_KEY_VAR  # ✅ Good (no substring)
    CLAUDE_API_KEY:
        - CLAUDE_VAR          # ✅ Good (no substring)
```

### Issue: "Forwarder address not authorized"

**Cause:** Oracle deployed before workflow

**Fix:** Redeploy oracle with correct forwarder address from `cre workflow deploy`

### Issue: "Consensus too low"

**Cause:** AI models disagreed on outcome

**Example:**
```
Gemini:  YES (60%)
Claude:  NO  (65%)
GPT:     YES (55%)
Grok:    NO  (70%)

YES Score: 60 + 55 = 115
NO Score:  65 + 70 = 135

Final: NO with 67.5% confidence
```

**Resolution:** Market skipped (requires ≥80% confidence)

---

## Deployment Checklist

- [ ] Wallet funded with Sepolia ETH
- [ ] Foundry installed and working
- [ ] CRE CLI installed (v1.1.0+)
- [ ] CRE account created and approved for Early Access
- [ ] All 4 AI API keys obtained
- [ ] EOTFactory deployed → save address
- [ ] CRE workflow deployed → save forwarder address
- [ ] AletheiaOracle deployed with forwarder → save address
- [ ] AletheiaMarket deployed with oracle + factory
- [ ] Secrets uploaded to CRE
- [ ] Wallet linked in CRE
- [ ] Workflow activated
- [ ] Test market created successfully
- [ ] CRE logs showing market detection
- [ ] Frontend deployed to Vercel
- [ ] End-to-end test: create → trade → resolve → redeem

---

## Cost Estimates

| Item | Estimated Cost (Sepolia ETH) |
|------|------------------------------|
| Deploy contracts (5 contracts) | ~0.05 ETH |
| Create test market | ~0.02 ETH |
| CRE workflow gas (per resolution) | ~0.01 ETH |
| **Total for testing** | **~0.08 ETH** |

**Note:** Sepolia ETH is free from faucets. No real costs.

---

## Production Considerations

### Before Mainnet Deployment:

1. **Security Audit**
   - Audit all smart contracts (especially AMM math)
   - Verify IReceiver implementation
   - Test reentrancy guards

2. **Gas Optimization**
   - Optimize AMM swap formula
   - Batch operations where possible
   - Use assembly for critical paths

3. **Economic Parameters**
   - Adjust AMM fee (0.3% → ?)
   - Set minimum liquidity threshold
   - Define minimum confidence threshold

4. **AI Model Selection**
   - Evaluate model performance on historical markets
   - Add/remove models based on accuracy
   - Adjust confidence weighting

5. **Monitoring**
   - Set up Grafana dashboard for CRE metrics
   - Alert on failed resolutions
   - Track AI consensus patterns

---

## Support

- **CRE Documentation**: https://docs.chain.link/cre/
- **CRE Discord**: https://discord.gg/chainlink
- **Thirdweb Discord**: https://discord.gg/thirdweb
- **AEEIA GitHub**: https://github.com/yourusername/convergence-chainlink

---

Built for **Chainlink Convergence Hackathon 2026** 🚀
