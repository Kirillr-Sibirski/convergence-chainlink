# AEEIA Testing Guide

Complete guide for deploying and testing AEEIA on Sepolia testnet.

---

## Prerequisites

### 1. Install Tools

```bash
# Install Foundry (Solidity deployment)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install CRE CLI
npm install -g @chainlink/cre-cli@latest

# Verify installations
forge --version  # Should be ≥0.2.0
cre --version    # Should be ≥1.1.0
```

### 2. Get Sepolia ETH

- Go to [Chainlink Faucet](https://faucets.chain.link/)
- Connect wallet
- Request Sepolia ETH (need ~0.5 ETH for testing)

### 3. Setup CRE Account

```bash
# Create CRE account
cre account create

# Login
cre auth login

# Verify Early Access (required)
cre account show
# Should show: "Early Access: Approved"
```

---

## Deployment Steps

### Step 1: Deploy Smart Contracts

```bash
cd contracts/

# Set environment variables
export PRIVATE_KEY=your_private_key_here
export RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key

# 1. Deploy Factory
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# This creates: deployments/sepolia-factory.json
# Save the factory address for later
```

### Step 2: Deploy CRE Workflow

```bash
cd cre-workflow/

# Install dependencies
npm install

# Verify .env exists with OpenRouter key
cat .env
# Should contain: OPENROUTER_API_KEY_VAR=sk-or-v1-...

# Upload secrets
cre secrets upload

# Verify secrets
cre secrets list
# Should show: OPENROUTER_API_KEY

# Update config.json with placeholder oracle address
# (We'll update this after oracle deployment)

# Deploy workflow
cre workflow deploy

# IMPORTANT: Save the forwarder address from output!
# Output will show: "Forwarder address: 0x..."
export FORWARDER_ADDRESS=<address_from_output>
```

### Step 3: Deploy Oracle (with forwarder)

```bash
cd contracts/

# Deploy oracle with forwarder address from Step 2
export FORWARDER_ADDRESS=<address_from_cre_deployment>

forge script script/DeployOracle.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# This creates: deployments/sepolia-oracle.json
# Save the oracle address
export ORACLE_ADDRESS=<oracle_address_from_output>
```

### Step 4: Update CRE Config & Deploy Market

```bash
# Update CRE config with real oracle address
cd cre-workflow/
nano config.json
# Change "oracleAddress" to actual oracle address from Step 3

# Redeploy workflow with updated config
cre workflow deploy --update

# Deploy market contract
cd ../contracts/

forge script script/DeployMarket.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# This creates: deployments/sepolia-market.json
```

### Step 5: Link Wallet & Activate Workflow

```bash
cd cre-workflow/

# Link wallet for on-chain writes
cre wallet link --private-key $PRIVATE_KEY

# Verify wallet
cre wallet show
# Should show: "Wallet: 0x... (linked)"

# Activate workflow (starts CRON)
cre workflow activate

# Check status
cre workflow status
# Should show: "Status: Active"
```

---

## Testing

### Test 1: Create Market

```bash
# Read market contract address
MARKET_ADDRESS=$(cat deployments/sepolia-market.json | jq -r '.market')

# Create test market (deadlines 5 minutes from now for quick testing)
DEADLINE=$(($(date +%s) + 300))

cast send $MARKET_ADDRESS \
  "createMarket(string,uint256,uint256,uint256)" \
  "Will BTC be above \$100,000 right now?" \
  $DEADLINE \
  1000000000000000000 \
  1000000000000000000 \
  --value 2ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Check market was created
cast call $MARKET_ADDRESS "marketCount()" --rpc-url $RPC_URL
# Should return: 1
```

### Test 2: Monitor CRE Workflow

```bash
# Watch workflow logs
cre workflow logs --follow

# Expected output every 5 minutes:
# CRON triggered at 2026-03-01T12:00:00.000Z
# Checking for pending markets...
# Found 0 pending market(s)  (until deadline passes)
```

### Test 3: Wait for Resolution

After 5 minutes (deadline passes), CRE should automatically resolve:

```bash
# Check logs (should show after deadline)
cre workflow logs --tail 100

# Expected output:
# Found 1 pending market(s)
# Processing market 1: Will BTC be above $100,000 right now?
# [Gemini 2.0] Querying AI...
# [Claude 3.5] Querying AI...
# [GPT-4o Mini] Querying AI...
# [Grok 2] Querying AI...
# === Consensus Results ===
# Final Outcome: YES (or NO)
# Confidence: 85%
# Agreement: 100% (4/4 AIs agreed)
# ✅ Resolved market 1
```

### Test 4: Verify Resolution On-Chain

```bash
ORACLE_ADDRESS=$(cat deployments/sepolia-oracle.json | jq -r '.oracle')

# Check market resolution
cast call $ORACLE_ADDRESS \
  "getResolution(uint256)" \
  1 \
  --rpc-url $RPC_URL

# Should return something like:
# true      (resolved)
# true      (outcome: YES)
# 85        (confidence: 85%)
# 0x123...  (proof hash)
```

### Test 5: Mint Tokens

```bash
# Mint YES/NO tokens by staking ETH
cast send $MARKET_ADDRESS \
  "mintTokens(uint256)" \
  1 \
  --value 10ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Check your token balances
YOUR_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)

cast call $MARKET_ADDRESS \
  "getUserBalances(uint256,address)" \
  1 \
  $YOUR_ADDRESS \
  --rpc-url $RPC_URL

# Should return:
# 10000000000000000000  (10 YES tokens)
# 10000000000000000000  (10 NO tokens)
```

### Test 6: Redeem Winnings

```bash
# After market is resolved, redeem winning tokens
cast send $MARKET_ADDRESS \
  "redeemTokens(uint256)" \
  1 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Check your balance increased
cast balance $YOUR_ADDRESS --rpc-url $RPC_URL
```

---

## Debugging

### Check Workflow Status

```bash
# View workflow status
cre workflow status

# View recent logs
cre workflow logs --tail 50

# View all workflows
cre workflow list
```

### Check Contract State

```bash
# Check market count
cast call $MARKET_ADDRESS "marketCount()" --rpc-url $RPC_URL

# Get market details (market ID 1)
cast call $MARKET_ADDRESS "markets(uint256)" 1 --rpc-url $RPC_URL

# Check pending markets
cast call $ORACLE_ADDRESS "getPendingMarkets()" --rpc-url $RPC_URL
```

### Common Issues

**Issue: "Secret not found"**
```bash
# Re-upload secrets
cd cre-workflow/
cre secrets upload

# Verify
cre secrets list
```

**Issue: "Forwarder not authorized"**
```bash
# Redeploy oracle with correct forwarder address
export FORWARDER_ADDRESS=<correct_address>
cd contracts/
forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

**Issue: "Consensus too low"**
```bash
# Check logs to see AI responses
cre workflow logs --tail 100

# If AIs disagreed, market will be skipped
# Try creating a clearer question
```

---

## Testing Checklist

- [ ] Foundry installed and working
- [ ] CRE CLI installed and authenticated
- [ ] Sepolia ETH obtained (≥0.5 ETH)
- [ ] Factory contract deployed
- [ ] CRE workflow deployed (forwarder address saved)
- [ ] Oracle deployed with forwarder
- [ ] Market contract deployed
- [ ] Secrets uploaded to CRE
- [ ] Wallet linked in CRE
- [ ] Workflow activated
- [ ] Test market created successfully
- [ ] CRE logs showing market detection
- [ ] Market resolved by multi-AI consensus
- [ ] Resolution verified on-chain
- [ ] Tokens minted successfully
- [ ] Winning tokens redeemed

---

## Expected Costs (Sepolia)

| Action | Estimated Gas | ETH Cost |
|--------|---------------|----------|
| Deploy Factory | ~500k gas | ~0.02 ETH |
| Deploy Oracle | ~800k gas | ~0.03 ETH |
| Deploy Market | ~1M gas | ~0.04 ETH |
| Create Market | ~300k gas | ~0.01 ETH |
| Mint Tokens | ~150k gas | ~0.005 ETH |
| CRE Resolution | ~200k gas | ~0.008 ETH (paid by CRE) |
| Redeem Tokens | ~100k gas | ~0.004 ETH |
| **Total** | | **~0.08 ETH** |

**Note:** Sepolia ETH is free from faucets. No real costs.

---

## OpenRouter API Costs

With $2 credit, you can test approximately:

| Model | Cost per 1M tokens | Test resolutions |
|-------|-------------------|------------------|
| Gemini 2.0 Flash | Free | Unlimited |
| Claude 3.5 Sonnet | $3 / 1M | ~50 resolutions |
| GPT-4o Mini | $0.15 / 1M | ~1000 resolutions |
| Grok 2 | $2 / 1M | ~75 resolutions |

**Estimate:** Each resolution uses ~10k tokens across 4 models = ~$0.05
**$2 credit = ~40 test resolutions**

---

## Production Considerations

Before mainnet:

1. **Security Audit** - Audit all contracts
2. **Gas Optimization** - Optimize AMM formulas
3. **Economic Parameters** - Adjust fees, thresholds
4. **Model Selection** - Evaluate AI accuracy
5. **Monitoring** - Set up Grafana dashboards

---

## Support

- **CRE Docs**: https://docs.chain.link/cre/
- **CRE Discord**: https://discord.gg/chainlink
- **OpenRouter Docs**: https://openrouter.ai/docs
- **GitHub**: https://github.com/Kirillr-Sibirski/convergence-chainlink

---

**Built for Chainlink Convergence Hackathon 2026** 🚀
