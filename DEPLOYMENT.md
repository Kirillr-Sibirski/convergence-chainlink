# Deployment Guide

## Prerequisites

1. **Install Foundry** (Solidity toolkit):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Get Sepolia ETH** from faucet:
   - https://sepoliafaucet.com/
   - https://www.alchemy.com/faucets/ethereum-sepolia

3. **Set up environment variables**:
   ```bash
   export DEPLOYER_PRIVATE_KEY=0x... # Your private key (DO NOT COMMIT)
   export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
   # Or use a free RPC: https://rpc.sepolia.org
   ```

---

## Step 1: Deploy AletheiaOracle Contract

```bash
cd convergence-chainlink

# Deploy the oracle contract
forge create contracts/AletheiaOracle.sol:AletheiaOracle \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Save the deployed address (output will show: "Deployed to: 0x...")
export ORACLE_ADDRESS=0x...
```

**Example output:**
```
Deployer: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Transaction hash: 0x...
```

---

## Step 2: Set CRE Workflow Address

The CRE workflow needs to be authorized to call `resolveMarket()`.

**Option A: If you have the CRE workflow address:**
```bash
cast send $ORACLE_ADDRESS \
  "setWorkflowAddress(address)" \
  $CRE_WORKFLOW_ADDRESS \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

**Option B: Authorize yourself for testing:**
```bash
# Use your own address for testing
cast send $ORACLE_ADDRESS \
  "setWorkflowAddress(address)" \
  $(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY) \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## Step 3: Update CRE Config

Update `cre-workflow/config.json` with the deployed address:

```json
{
  "cronSchedule": "*/5 * * * *",
  "oracleAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "chainSelectorName": "ethereum-testnet-sepolia",
  "gasLimit": "500000"
}
```

---

## Step 4: Create Test Market

Create a market with a deadline in the past (for immediate testing):

```bash
# Deadline = now - 1 hour (so it's immediately resolvable)
DEADLINE=$(($(date +%s) - 3600))

cast send $ORACLE_ADDRESS \
  "createMarket(string,uint256)" \
  "Will BTC close above \$60,000 on March 1, 2026?" \
  $DEADLINE \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Check the market was created
cast call $ORACLE_ADDRESS "getMarketCount()" --rpc-url $SEPOLIA_RPC_URL
```

---

## Step 5: Test Simulation (No Deployment Needed)

```bash
cd cre-workflow

# Simulate the CRON trigger (testnet simulation)
cre workflow simulate . --non-interactive --trigger-index 0 -T staging-settings
```

**Expected output:**
```
[INFO] CRON triggered at 2026-02-28T21:00:00.000Z
[INFO] Checking for pending markets...
[INFO] Found 1 pending market(s)
[INFO] Processing market 1: Will BTC close above $60,000 on March 1, 2026?
[INFO] Analyzing question: Will BTC close above $60,000 on March 1, 2026?
[INFO] Strategy: price, sources: 5
[INFO] Fetching BTC price from 5 sources...
[INFO] ✓ coingecko: $95,234.56
[INFO] ✓ binance: $95,231.12
[INFO] ✓ coinbase: $95,240.23
[INFO] ✓ kraken: $95,228.45
[INFO] ✓ coincap: $95,235.67
[INFO] Median price: $95,234.56
[INFO] Spread: 0.01%
[INFO] Confidence: 95%
[INFO] Evaluating: BTC > $60,000?
[INFO] Result: TRUE (95% confidence)
[INFO] Consensus validated: 95%
[INFO] Writing resolution for market 1: outcome=true, confidence=95
[INFO] ✅ Write report transaction succeeded at txHash: 0xabcd1234...
[INFO] ✅ Resolved market 1
[INFO] Resolved 1 market(s): Market 1: 0xabcd1234...
```

---

## Step 6: Verify On-Chain Resolution

```bash
# Check if market was resolved
cast call $ORACLE_ADDRESS \
  "getResolution(uint256)" \
  1 \
  --rpc-url $SEPOLIA_RPC_URL

# Output: resolved=true, outcome=true, confidence=95, proofHash=0x...
```

---

## Optional: Deploy DemoPredictionMarket

```bash
forge create contracts/DemoPredictionMarket.sol:DemoPredictionMarket \
  --constructor-args $ORACLE_ADDRESS \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## Troubleshooting

**Error: "Insufficient funds"**
- Get more Sepolia ETH from faucets

**Error: "Only CRE workflow"**
- Run `setWorkflowAddress()` to authorize the caller

**Error: "Network not found"**
- Ensure `chainSelectorName` in config.json is `"ethereum-testnet-sepolia"`

**Simulation fails with HTTP errors:**
- Check internet connection (simulation fetches real price data)
- Some APIs may rate-limit (CoinGecko, Binance) - wait and retry

**No pending markets found:**
- Ensure the market deadline is in the past
- Check `getMarketCount()` to verify market was created

---

## Production Deployment

For production (after winning the hackathon! 🏆):

1. Deploy to mainnet (Ethereum, Arbitrum, Base, etc.)
2. Use CRE's production DON (requires Early Access approval)
3. Set proper `creWorkflowAddress` from deployed CRE workflow
4. Increase `gasLimit` if needed for complex resolutions
5. Add more source categories (social, on-chain, hybrid)
6. Consider proof storage on IPFS for full evidence retrieval

---

**Next:** Test simulation, capture transaction hash, submit to Moltbook!
