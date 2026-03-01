# AEEIA Deployment Guide

Complete guide for deploying and testing AEEIA prediction markets on Sepolia testnet for the Chainlink Convergence Hackathon.

---

## Overview

AEEIA (Aletheia) is an AI-powered prediction market oracle that uses:
- **Multi-AI Consensus**: 4 AI models (Claude 3.5, GPT-4o Mini, Gemini 2.0, Grok 2) vote on outcomes
- **Chainlink CRE**: Autonomous CRON-based resolution workflow
- **Event Outcome Tokens (EOTs)**: YES/NO tokens for trading predictions
- **AMM**: Constant product formula for price discovery

---

## Prerequisites

### 1. Installed Tools ✅

- [x] **Foundry** v1.5.1 - Solidity development framework
- [x] **CRE CLI** v1.2.0 - Chainlink Runtime Environment
- [x] **Bun** v1.2.21 - TypeScript runtime for CRE workflows
- [x] **OpenRouter API Key** - Multi-AI access (provided: sk-or-v1-...)

```bash
# Verify installations
forge --version  # v1.5.1
cre version      # v1.2.0
bun --version    # v1.2.21
```

### 2. Get Sepolia ETH

- Go to [Chainlink Faucet](https://faucets.chain.link/)
- Connect your wallet
- Request Sepolia ETH (~0.5 ETH needed for deployment and testing)

### 3. Prepare Environment Variables

You'll need:
- `PRIVATE_KEY` - Your Ethereum wallet private key (for contract deployment)
- `RPC_URL` - Sepolia RPC endpoint (e.g., Alchemy, Infura, or public node)

---

## Step-by-Step Deployment

### Step 1: Authenticate with CRE

```bash
# Login to CRE (opens browser for authentication)
cre login

# Verify authentication
cre whoami
# Should show your account email and organization

# Check if you have deploy access
# Note: Early Access approval may be required for production deployments
# For hackathon simulation testing, this is not required
```

### Step 2: Test CRE Workflow Locally (Simulation)

Before deploying anything on-chain, test the workflow in simulation mode:

```bash
cd cre-workflow/

# Verify .env file contains OpenRouter API key
cat .env
# Should contain: OPENROUTER_API_KEY_VAR=sk-or-v1-...

# Install dependencies (already done)
bun install

# Run simulation test
# This tests the workflow WITHOUT deploying or spending gas
cre workflow simulate . \
  --http-payload '{"marketId": 1, "question": "Will BTC be above $100,000?"}'

# Expected output:
# - Workflow executes locally
# - Multi-AI consensus runs
# - No on-chain transactions (simulation only)
```

### Step 3: Deploy Factory Contract

```bash
cd contracts/

# Set environment variables
export PRIVATE_KEY=your_private_key_here
export RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key

# Deploy EOTFactory
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Output saved to: deployments/sepolia-factory.json
# Save the factory address
FACTORY_ADDRESS=$(cat deployments/sepolia-factory.json | grep -o '"factory": "[^"]*' | cut -d'"' -f4)
echo "Factory deployed at: $FACTORY_ADDRESS"
```

### Step 4: Get CRE Forwarder Address

For Sepolia testnet, the CRE forwarder address is pre-deployed:

```bash
# Sepolia Forwarder Address (use this for testnet)
export FORWARDER_ADDRESS="0x..."  # Get from CRE docs or deployment output

# Alternative: If deploying CRE workflow, the forwarder address will be in deployment output
# cre workflow deploy would show: "Forwarder address: 0x..."
```

**Note**: For hackathon simulation testing, you can use the MockKeystoneForwarder address for local testing. For actual Sepolia deployment, you'll need the production KeystoneForwarder address from the CRE forwarder directory.

### Step 5: Deploy Oracle Contract

```bash
cd contracts/

# Deploy Oracle with forwarder address
forge script script/DeployOracle.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Output saved to: deployments/sepolia-oracle.json
ORACLE_ADDRESS=$(cat deployments/sepolia-oracle.json | grep -o '"oracle": "[^"]*' | cut -d'"' -f4)
echo "Oracle deployed at: $ORACLE_ADDRESS"
```

### Step 6: Update CRE Workflow Configuration

```bash
cd cre-workflow/

# Update config.json with real oracle address
cat > config.json << EOF
{
  "cronSchedule": "*/5 * * * *",
  "oracleAddress": "$ORACLE_ADDRESS",
  "chainSelectorName": "ethereum-testnet-sepolia",
  "gasLimit": "500000"
}
EOF

echo "Updated config.json with oracle address: $ORACLE_ADDRESS"
```

### Step 7: Deploy Market Contract

```bash
cd contracts/

# Deploy AletheiaMarket
forge script script/DeployMarket.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Output saved to: deployments/sepolia-market.json
MARKET_ADDRESS=$(cat deployments/sepolia-market.json | grep -o '"market": "[^"]*' | cut -d'"' -f4)
echo "Market deployed at: $MARKET_ADDRESS"
```

### Step 8: Upload Secrets to CRE (For Production Deployment)

**Note**: For hackathon simulation, secrets are read from `.env` file. For production deployment:

```bash
cd cre-workflow/

# Upload secrets to CRE Vault DON
cre secrets create

# Verify secrets uploaded
cre secrets list
# Should show: OPENROUTER_API_KEY

# Link wallet for on-chain writes (required for production)
cre wallet link --private-key $PRIVATE_KEY

# Verify wallet linked
cre wallet show
```

### Step 9: Deploy CRE Workflow (Production)

**Note**: This step requires Early Access approval and is for production deployment. For hackathon submission, use simulation instead.

```bash
cd cre-workflow/

# Deploy workflow to CRE
cre workflow deploy

# Activate workflow (starts CRON trigger)
cre workflow activate

# Check status
cre workflow status
# Should show: "Status: Active"

# Monitor logs
cre workflow logs --follow
```

---

## Testing

### Test 1: Create a Test Market

```bash
# Calculate deadline (5 minutes from now for quick testing)
DEADLINE=$(($(date +%s) + 300))

# Create market
cast send $MARKET_ADDRESS \
  "createMarket(string,uint256,uint256,uint256)" \
  "Will BTC be above \$100,000 right now?" \
  $DEADLINE \
  1000000000000000000 \
  1000000000000000000 \
  --value 2ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Verify market created
cast call $MARKET_ADDRESS "marketCount()" --rpc-url $RPC_URL
# Should return: 1
```

### Test 2: Simulate CRE Resolution

For hackathon submission, run workflow in simulation mode:

```bash
cd cre-workflow/

# Simulate CRON trigger manually
cre workflow simulate . \
  --env-file .env \
  --config config.json

# Expected output:
# - "Checking for pending markets..."
# - "Found 1 pending market(s)" (after deadline passes)
# - Multi-AI consensus results
# - "✅ Resolved market 1"
```

### Test 3: Verify Resolution On-Chain

```bash
# Check market resolution
cast call $ORACLE_ADDRESS \
  "getResolution(uint256)" \
  1 \
  --rpc-url $RPC_URL

# Should return:
# - resolved: true
# - outcome: true/false
# - confidence: 85 (example)
# - proofHash: 0x123...
```

### Test 4: Mint YES/NO Tokens

```bash
# Mint tokens by staking ETH
cast send $MARKET_ADDRESS \
  "mintTokens(uint256)" \
  1 \
  --value 10ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Check balances
YOUR_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
cast call $MARKET_ADDRESS \
  "getUserBalances(uint256,address)" \
  1 \
  $YOUR_ADDRESS \
  --rpc-url $RPC_URL
```

### Test 5: Redeem Winning Tokens

```bash
# After market is resolved, redeem winning tokens
cast send $MARKET_ADDRESS \
  "redeemTokens(uint256)" \
  1 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Check balance increased
cast balance $YOUR_ADDRESS --rpc-url $RPC_URL
```

---

## Hackathon Submission

### Simulation-Based Submission

For the Chainlink Convergence Hackathon, you can submit using simulation results:

1. **Complete Simulation Testing**:
   - Run `cre workflow simulate` successfully
   - Capture terminal output showing execution
   - Screenshot showing transaction hash from simulation

2. **Prepare Submission Post**:
   - Follow SUBMISSION_TEMPLATE.md format
   - Include simulation commands
   - Provide evidence artifact (logs/screenshot)
   - Explain multi-AI consensus mechanism

3. **Submit to Moltbook**:
   - Post in `m/chainlink-official`
   - Title: `#chainlink-hackathon-convergence #prediction-markets — AEEIA`
   - First line: `#chainlink-hackathon-convergence #prediction-markets`
   - Include all required sections from template

---

## Cost Estimates

### Sepolia Testnet (Free)

| Action | Estimated Gas | ETH Cost |
|--------|---------------|----------|
| Deploy Factory | ~500k gas | ~0.02 ETH |
| Deploy Oracle | ~800k gas | ~0.03 ETH |
| Deploy Market | ~1M gas | ~0.04 ETH |
| Create Market | ~300k gas | ~0.01 ETH |
| Mint Tokens | ~150k gas | ~0.005 ETH |
| Redeem Tokens | ~100k gas | ~0.004 ETH |
| **Total** | | **~0.08 ETH** |

### OpenRouter API (Paid)

With $2 credit:
- ~$0.05 per resolution (4 AI models)
- **~40 test resolutions possible**

---

## Troubleshooting

### Common Issues

**Issue: "Secret not found"**
```bash
# For simulation: Verify .env file
cat .env

# For production: Re-upload secrets
cre secrets create
cre secrets list
```

**Issue: "Forwarder not authorized"**
```bash
# Verify forwarder address matches deployment
# Redeploy oracle with correct forwarder address
forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

**Issue: "Consensus too low"**
```bash
# Check simulation logs to see AI responses
# If AIs disagreed, market will be skipped
# Try creating a clearer, more objective question
```

**Issue: "CRE workflow simulate fails"**
```bash
# Verify Bun is installed
bun --version

# Verify dependencies installed
bun install

# Check config.json format is valid JSON
cat config.json | jq .
```

---

## Production Considerations

Before mainnet deployment:

1. **Security Audit** - Audit all smart contracts
2. **Gas Optimization** - Optimize AMM formulas and storage
3. **Economic Parameters** - Adjust fees, thresholds, and incentives
4. **Model Selection** - Evaluate AI accuracy and costs
5. **Monitoring** - Set up Grafana/DataDog dashboards
6. **Early Access** - Request CRE production deployment access

---

## Support & Resources

- **CRE Docs**: https://docs.chain.link/cre/
- **CRE Discord**: https://discord.gg/chainlink
- **OpenRouter Docs**: https://openrouter.ai/docs
- **GitHub**: https://github.com/Kirillr-Sibirski/convergence-chainlink
- **Hackathon**: https://chain.link/hackathon

---

**Built for Chainlink Convergence Hackathon 2026** 🚀

**Track**: Prediction Markets (#prediction-markets)
**Technology**: CRE + Multi-AI Consensus + DeFi Primitives
