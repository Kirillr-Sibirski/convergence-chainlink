# Environment Variables Setup Guide

## Issues You're Experiencing

1. **401 Unauthorized** - Missing Thirdweb Client ID for RPC access
2. **Question validation not working** - Should use CRE, not frontend API calls
3. **Environment variables not configured** in Vercel

---

## Current Architecture Problems

### ❌ **Current (Wrong) Approach:**
- Frontend tries to create markets directly via Web3
- No question validation before market creation
- Frontend needs API keys (security risk)

### ✅ **Correct Approach (What We Need to Build):**
1. User submits question via frontend
2. Frontend calls **backend API** (Next.js API route)
3. Backend API calls **deployed CRE workflow** via HTTP trigger
4. CRE workflow validates question using multi-AI consensus
5. If valid, CRE creates market on-chain via EVM write
6. Frontend displays result

---

## Required Environment Variables

### 1. Frontend (Vercel)

Create these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Thirdweb Client ID (Required for Web3 RPC)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=<your-thirdweb-client-id>
```

**Get Thirdweb Client ID:**
1. Go to https://thirdweb.com/dashboard/settings/api-keys
2. Create new API key
3. Copy the Client ID
4. Add to Vercel environment variables

### 2. CRE Workflow (Chainlink)

These are configured in CRE deployment, NOT in Vercel:

```bash
# AI Model API Keys (for question validation & resolution)
GEMINI_API_KEY_VAR=<gemini-api-key>
CLAUDE_API_KEY_VAR=<claude-api-key>
OPENAI_API_KEY_VAR=<openai-api-key>
XAI_API_KEY_VAR=<grok-api-key>

# OR use OpenRouter for all models (simpler)
OPENROUTER_API_KEY_VAR=<openrouter-api-key>

# Ethereum Private Key (for on-chain writes)
CRE_ETH_PRIVATE_KEY=<private-key-for-sepolia>
```

---

## Proper Architecture We Need to Implement

### Step 1: Deploy CRE Workflow

The CRE workflow needs to be **deployed to Chainlink** (not just on your local machine):

```bash
cd cre-workflow
cre login  # Authenticate with Chainlink
cre workflow deploy . --target production
```

This gives you a **deployed workflow URL** that can be triggered via HTTP.

### Step 2: Add HTTP Trigger to CRE Workflow

Update `cre-workflow/workflow.yaml` to add HTTP trigger for question validation:

```yaml
triggers:
  - type: cron
    schedule: "*/5 * * * *"
    name: resolve-markets

  - type: http
    name: validate-and-create-market
    method: POST
    path: /create-market
```

### Step 3: Create Backend API Route

Create `frontend/app/api/create-market/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    // Call deployed CRE workflow via HTTP trigger
    const response = await fetch(
      'https://cre.chain.link/workflows/YOUR_WORKFLOW_ID/create-market',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRE_API_KEY}`,
        },
        body: JSON.stringify({ question }),
      }
    );

    const result = await response.json();

    if (!result.valid) {
      return NextResponse.json(
        {
          error: 'Invalid question',
          issues: result.issues,
          suggestions: result.suggestions
        },
        { status: 400 }
      );
    }

    // CRE created the market on-chain
    return NextResponse.json({
      success: true,
      marketId: result.marketId,
      txHash: result.txHash,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create market' },
      { status: 500 }
    );
  }
}
```

### Step 4: Update Frontend to Call Backend API

Update `CreateMarketModal.tsx`:

```typescript
const handleCreate = async () => {
  setIsCreating(true);
  setError("");

  try {
    // Call our backend API (which calls CRE)
    const response = await fetch('/api/create-market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create market');
    }

    // Success! Market created by CRE
    toast.success(`Market created! TX: ${result.txHash}`);
    onClose();

  } catch (err) {
    setError(err.message);
  } finally {
    setIsCreating(false);
  }
};
```

---

## Why This Architecture?

### ✅ **Security:**
- API keys stay in CRE environment (not exposed to frontend)
- No private keys in Vercel
- CRE handles all on-chain writes securely

### ✅ **Validation:**
- Multi-AI consensus validates every question
- Invalid questions rejected before wasting gas
- Users get instant feedback with suggestions

### ✅ **Decentralization:**
- CRE workflow runs autonomously
- No centralized backend server needed
- Chainlink DON provides security and uptime

### ✅ **Simplicity:**
- Frontend just calls one API endpoint
- CRE handles everything (validation + market creation)
- Users don't need wallets to create markets

---

## Immediate Fix for Your Error

The **401 Unauthorized** error is because Thirdweb needs a client ID to access RPC endpoints.

**Quick fix:**

1. Go to https://thirdweb.com/dashboard/settings/api-keys
2. Create a new API key
3. Copy the Client ID
4. Add to Vercel:
   - Go to your Vercel project
   - Settings → Environment Variables
   - Add: `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` = `<your-client-id>`
   - Redeploy

---

## Current State vs. Target State

### Current (Broken):
```
User → Frontend → Thirdweb (401 error) ❌
```

### Target (Correct):
```
User → Frontend → Backend API → CRE Workflow → Validation → Market Creation → Blockchain ✅
```

---

## Action Items

### 1. **Immediate (Fix 401 error):**
- [ ] Get Thirdweb Client ID
- [ ] Add to Vercel environment variables
- [ ] Redeploy Vercel

### 2. **Short-term (Proper architecture):**
- [ ] Add HTTP trigger to CRE workflow
- [ ] Deploy CRE workflow to Chainlink
- [ ] Create `/api/create-market` backend route
- [ ] Update frontend to call backend API
- [ ] Remove direct Web3 calls from frontend

### 3. **Long-term (Production ready):**
- [ ] Add deadline extraction to validation
- [ ] Show validation feedback in UI
- [ ] Add market creation confirmation dialog
- [ ] Implement proper error handling

---

## Testing the CRE Workflow

Once deployed, you can test via HTTP:

```bash
curl -X POST https://cre.chain.link/workflows/YOUR_WORKFLOW_ID/create-market \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRE_API_KEY" \
  -d '{
    "question": "Will ETH reach $5000 by tomorrow at midnight?"
  }'
```

Expected response:
```json
{
  "valid": true,
  "score": 85,
  "category": "price",
  "marketId": 2,
  "txHash": "0xabc123...",
  "deadline": 1709337600
}
```

---

## Summary

**Root cause of your error:** Missing `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` in Vercel.

**Proper solution:** Don't create markets from frontend. Use this flow:
1. Frontend → Backend API
2. Backend API → CRE Workflow (HTTP trigger)
3. CRE → Validates + Creates market on-chain
4. Returns result to frontend

**For hackathon submission:** We can use the current approach (direct Web3) if we add the Thirdweb Client ID. But for production, we should implement the CRE-based architecture.

---

**Next steps:** Let me know if you want me to:
1. Just fix the immediate 401 error (add Thirdweb client ID guide)
2. Implement the proper CRE-based market creation flow
3. Both
