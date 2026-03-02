# CRE Workflow Deployment Guide

Based on the official Chainlink CRE prediction market demo: https://github.com/smartcontractkit/cre-gcp-prediction-market-demo

---

## Architecture Overview

**YOU WERE RIGHT!** We don't need a backend API. Here's how it actually works:

```
User → Frontend → Creates Market On-Chain → Oracle Contract Emits Event
                                                    ↓
                                           CRE Workflow (deployed to Chainlink)
                                                    ↓
                                      Listens for blockchain events
                                                    ↓
                              CRON checks for expired markets
                                                    ↓
                              Multi-AI validates & resolves
                                                    ↓
                              Writes resolution back on-chain
```

**Key Points:**
- ✅ CRE workflow is **deployed to Chainlink testnet**
- ✅ CRE **listens directly to blockchain events** (EVM Log Trigger)
- ✅ **No backend API needed** - CRE is the backend!
- ✅ Secrets are configured **during CRE deployment** (not in Vercel)
- ✅ Frontend only needs Thirdweb Client ID for RPC access

---

## Where to Put Secrets

### 1. CRE Workflow Secrets (Deployed to Chainlink)

Create `/workspace/group/convergence-chainlink/cre-workflow/.env`:

```bash
# Ethereum Private Key (for on-chain writes)
CRE_ETH_PRIVATE_KEY=0xd753c130f8fe3559e37b969c58e580333e284bb4f192c02ff41d4f2675411cec

# CRE Target
CRE_TARGET=staging

# OpenRouter API Key (for multi-AI consensus)
OPENROUTER_API_KEY_VAR=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

# OR individual model keys:
# GEMINI_API_KEY_VAR=your_gemini_key
# CLAUDE_API_KEY_VAR=your_claude_key
# OPENAI_API_KEY_VAR=your_openai_key
# XAI_API_KEY_VAR=your_grok_key
```

**These secrets are uploaded to Chainlink during deployment via:**
```bash
cre workflow deploy . --target staging
```

CRE reads the `.env` file and uploads secrets securely to the Chainlink DON (Decentralized Oracle Network).

### 2. Frontend Secrets (Vercel)

**ONLY ONE SECRET NEEDED:**

```bash
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=<your-thirdweb-client-id>
```

Add this in Vercel Dashboard → Settings → Environment Variables.

**That's it!** No AI keys in Vercel because CRE handles all AI calls.

---

## Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
cd /workspace/group/convergence-chainlink/cre-workflow
bun install
```

### Step 2: Configure Secrets

Create `.env` file:

```bash
cp .env.example .env
# Edit .env and add your keys
```

Required secrets in `.env`:
- `CRE_ETH_PRIVATE_KEY` - Private key with Sepolia ETH (you already have this)
- `OPENROUTER_API_KEY_VAR` - OpenRouter key (sk-or-v1-...)
- `CRE_TARGET` - Set to `staging`

### Step 3: Update secrets.yaml

Check `/cre-workflow/secrets.yaml` matches:

```yaml
secretsNames:
  OPENROUTER_API_KEY:
    - OPENROUTER_API_KEY_VAR
```

### Step 4: Login to CRE

```bash
export PATH="$HOME/.cre/bin:$PATH"
cre login
```

This opens a browser for OAuth authentication with Chainlink.

### Step 5: Test Simulation Locally

```bash
cre workflow simulate . --target local-simulation --non-interactive --trigger-index 0 --verbose
```

This tests the workflow locally before deploying.

### Step 6: Deploy to Chainlink Testnet

```bash
cre workflow deploy . --target staging
```

**What this does:**
1. Uploads your workflow code to Chainlink
2. Securely uploads secrets from `.env`
3. Registers workflow with Chainlink DON
4. Returns a workflow ID

**Expected output:**
```
✓ Workflow deployed successfully
✓ Workflow ID: wf_abc123def456
✓ Workflow URL: https://cre.chain.link/workflows/wf_abc123def456
✓ Status: Active
```

### Step 7: Verify Deployment

Check workflow status:

```bash
cre workflow list
```

View logs:

```bash
cre workflow logs wf_abc123def456 --follow
```

---

## How CRE Triggers Work

### CRON Trigger (Current Implementation)

Your `main.ts` uses CRON to check for expired markets every 5 minutes:

```typescript
export async function main(config: AEEIAConfig) {
  const workflowRunner = new cre.Runner({
    runtime: cre.tsRuntime(),
    app: cre.capabilities.CronCapability(
      config.cronSchedule,
      async (runtime: Runtime<any>) => {
        return onCronTrigger(runtime, config)
      }
    ),
  })
  workflowRunner.run()
}
```

**How it works:**
1. CRE runs your workflow every 5 minutes
2. Calls `getPendingMarkets()` on Oracle contract
3. For each pending market past deadline:
   - Queries 4 AI models
   - Calculates consensus
   - Writes resolution on-chain

**No event needed!** CRON just checks periodically.

### Optional: Add HTTP Trigger for Market Creation

If you want to add question validation BEFORE market creation, you can add an HTTP trigger:

```typescript
// In a separate workflow file (e.g., validator.ts)
export async function main(config: any) {
  const workflowRunner = new cre.Runner({
    runtime: cre.tsRuntime(),
    app: cre.capabilities.HTTPTriggerCapability(
      async (runtime: Runtime<any>, request: HTTPRequest) => {
        const { question } = JSON.parse(request.body);

        // Validate question using multi-AI consensus
        const validation = await validateQuestion(runtime, question);

        return {
          statusCode: validation.valid ? 200 : 400,
          body: JSON.stringify(validation)
        };
      }
    ),
  })
  workflowRunner.run()
}
```

Then frontend can call:
```typescript
const response = await fetch('https://cre.chain.link/workflows/wf_validator_id/execute', {
  method: 'POST',
  body: JSON.stringify({ question })
});
```

**But for hackathon, CRON trigger is simpler and works fine!**

---

## Testing the Deployed Workflow

### 1. Create a Test Market

Via frontend or directly:

```typescript
// Using test-contracts.ts
const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
const question = "Will this test resolve correctly?";
const tx = await oracle.createMarket(question, deadline);
```

### 2. Wait for Deadline

Wait 1 minute for the market to expire.

### 3. CRE Auto-Resolves

Within 5 minutes, CRE will:
1. Detect the pending market
2. Query AI models
3. Calculate consensus
4. Write resolution on-chain

### 4. Check Logs

```bash
cre workflow logs wf_abc123def456 --follow
```

Expected output:
```
[2026-03-02T08:00:00.000Z] CRON triggered
[2026-03-02T08:00:00.142Z] Checking for pending markets...
[2026-03-02T08:00:00.398Z] Found 1 pending market(s)
[2026-03-02T08:00:00.401Z] Processing market 1: Will this test resolve correctly?
[2026-03-02T08:00:01.823Z] Claude 3.5: YES (92% confidence)
[2026-03-02T08:00:01.987Z] GPT-4o Mini: YES (88% confidence)
[2026-03-02T08:00:02.145Z] Gemini 2.0: YES (90% confidence)
[2026-03-02T08:00:02.301Z] Grok 2: YES (85% confidence)
[2026-03-02T08:00:02.305Z] Agreement level: 100%
[2026-03-02T08:00:02.315Z] Writing resolution for market 1: outcome=true, confidence=88
[2026-03-02T08:00:15.678Z] ✅ Transaction hash: 0xabc123...
```

---

## Updating the Deployed Workflow

To update after code changes:

```bash
cd /workspace/group/convergence-chainlink/cre-workflow
cre workflow deploy . --target staging
```

CRE will update the existing workflow (same workflow ID).

---

## Monitoring & Debugging

### View Workflow Status

```bash
cre workflow list
cre workflow status wf_abc123def456
```

### View Execution History

```bash
cre workflow executions wf_abc123def456 --limit 10
```

### View Live Logs

```bash
cre workflow logs wf_abc123def456 --follow
```

### Pause/Resume Workflow

```bash
cre workflow pause wf_abc123def456
cre workflow resume wf_abc123def456
```

---

## Common Issues & Solutions

### Issue 1: "authentication required: you are not logged in"

**Solution:**
```bash
export PATH="$HOME/.cre/bin:$PATH"
cre login
```

### Issue 2: "secret not found: OPENROUTER_API_KEY"

**Solution:**
Check `.env` file has correct variable names matching `secrets.yaml`:
```bash
# secrets.yaml
secretsNames:
  OPENROUTER_API_KEY:
    - OPENROUTER_API_KEY_VAR

# .env
OPENROUTER_API_KEY_VAR=sk-or-v1-...
```

### Issue 3: "insufficient funds for gas"

**Solution:**
Private key needs Sepolia ETH:
```bash
# Check balance
cast balance 0x2000f57be293734aeD2Ca9d629080A21E782FCAb --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# Get testnet ETH
# https://sepoliafaucet.com/
```

### Issue 4: "workflow failed: timeout"

**Solution:**
Check OpenRouter API key has credits:
```bash
curl https://openrouter.ai/api/v1/auth/key \
  -H "Authorization: Bearer sk-or-v1-..."
```

---

## Cost Estimation

### CRE Execution Costs

- **Per CRON execution**: ~$0.01 (gas + compute)
- **Per market resolution**: ~$0.10 (4 AI calls + on-chain write)
- **Monthly estimate** (100 markets): ~$10

### Testnet Costs

- Gas: Free (testnet ETH)
- AI calls: ~$0.02 per call (OpenRouter)
- Total: $0.08 per market resolution

---

## Summary

### ✅ What You Need to Do:

1. **Create `.env` file** in `/cre-workflow/` with:
   - `CRE_ETH_PRIVATE_KEY` (you have this)
   - `OPENROUTER_API_KEY_VAR` (you have this)
   - `CRE_TARGET=staging`

2. **Login to CRE:**
   ```bash
   cre login
   ```

3. **Deploy workflow:**
   ```bash
   cre workflow deploy . --target staging
   ```

4. **Add Thirdweb Client ID to Vercel** (frontend only needs this)

### ❌ What You DON'T Need:

- ❌ Backend API
- ❌ Firebase/Firestore (optional)
- ❌ AI keys in Vercel
- ❌ Complex authentication

### 🎯 Final Architecture:

```
User → Frontend (Thirdweb) → Creates Market On-Chain
                                      ↓
                            Oracle Contract Deployed
                                      ↓
                      CRE Workflow (deployed to Chainlink)
                                      ↓
                          CRON runs every 5 minutes
                                      ↓
                        Checks for expired markets
                                      ↓
                    Multi-AI consensus resolution
                                      ↓
                    Writes resolution on-chain
                                      ↓
                      Frontend displays results
```

**Simple, secure, decentralized!** ✅

---

**Next Step:** Run `cre login` and then `cre workflow deploy . --target staging`
