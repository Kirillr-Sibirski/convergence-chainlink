# Testing Guide

## Quick Simulation Test (No Deployment Required)

The fastest way to test the workflow for the hackathon submission:

### Option 1: Test with Mock Data (Fastest)

```bash
cd cre-workflow

# Run simulation with CRON trigger
cre workflow simulate . --non-interactive --trigger-index 0 -T staging-settings
```

This will:
1. ✅ Trigger the CRON callback
2. ✅ Query the oracle contract for pending markets
3. ✅ If markets exist past deadline, resolve them
4. ✅ Fetch BTC price from 5 sources
5. ✅ Calculate consensus (median, confidence)
6. ✅ Generate proof hash
7. ✅ Create DON report
8. ✅ Submit transaction on-chain
9. ✅ Output transaction hash

### Option 2: Test with Deployed Contract (For Evidence)

Follow `DEPLOYMENT.md` to:
1. Deploy AletheiaOracle to Sepolia
2. Create a test market with deadline in the past
3. Run simulation
4. Capture transaction hash from output

---

## Capture Evidence for Submission

### Screenshot Requirements:
- ✅ Full terminal visible
- ✅ Simulation command shown
- ✅ Execution logs visible
- ✅ **Transaction hash clearly visible**
- ✅ Success confirmation

### Example:
```
$ cre workflow simulate . --non-interactive --trigger-index 0 -T staging-settings

[INFO] Initializing CRE workflow...
[INFO] Config loaded: ethereum-testnet-sepolia
[INFO] CRON triggered at 2026-02-28T21:00:00.000Z
[INFO] Checking for pending markets...
[INFO] Found 1 pending market(s)
[INFO] Processing market 1: Will BTC close above $60,000 on March 1, 2026?
[INFO] Fetching BTC price from 5 sources...
[INFO] ✓ coingecko: $95,234.56
[INFO] ✓ binance: $95,231.12
[INFO] ✓ coinbase: $95,240.23
[INFO] ✓ kraken: $95,228.45
[INFO] ✓ coincap: $95,235.67
[INFO] Median price: $95,234.56, Confidence: 95%
[INFO] Writing resolution for market 1: outcome=true, confidence=95
[INFO] ✅ Write report transaction succeeded at txHash: 0xabcd1234efgh5678...
[INFO] ✅ Resolved market 1
[SUCCESS] Workflow completed successfully
```

**Save screenshot as:** `evidence/simulation-output.png`

---

## Verification Checklist

Before submitting to Moltbook:

- [ ] Simulation runs from clean clone (`git clone` in new directory)
- [ ] No manual file edits required
- [ ] Transaction hash appears in output
- [ ] On-chain write confirmed (check Sepolia Etherscan)
- [ ] Screenshot clearly shows transaction hash
- [ ] Execution logs show multi-source consensus
- [ ] All 5 price sources fetched successfully

---

## Common Issues

**Issue:** "Network not found: ethereum-testnet-sepolia"
- **Fix:** Ensure CRE SDK supports Sepolia. Check supported networks with `cre network list`

**Issue:** "No pending markets to resolve"
- **Fix:** Create a market with deadline in the past using `cast send` (see DEPLOYMENT.md)

**Issue:** "Only CRE workflow can call resolveMarket"
- **Fix:** Call `setWorkflowAddress()` to authorize your address for testing

**Issue:** HTTP sources fail
- **Fix:** Check internet connection. Some APIs rate-limit; wait and retry.

**Issue:** Transaction simulation fails
- **Fix:** Ensure wallet has Sepolia ETH for gas

---

## Next Steps

1. ✅ Test simulation
2. ✅ Capture screenshot with transaction hash
3. ✅ Verify transaction on Sepolia Etherscan
4. ✅ Copy transaction hash to submission
5. 📤 Submit to m/chainlink-official on Moltbook

Good luck! 🚀
