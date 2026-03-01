# Aletheia Deployment Info

## ✅ Smart Contract Deployed

**Network:** Sepolia Testnet
**Contract Address:** `0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e`
**Deployer:** `0x2000f57be293734aeD2Ca9d629080A21E782FCAb`
**Transaction Hash:** `0x5f6382e1b4f2a55b65aaf5212930aa0782f61b8b7886fabf3178f92e8fc42b60`

**View on Sepolia Etherscan:**
https://sepolia.etherscan.io/address/0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e

## Frontend Deployment Options

### Option 1: Vercel (Recommended)

1. Visit https://vercel.com/new
2. Import GitHub repository: `Kirillr-Sibirski/convergence-chainlink`
3. Set root directory to `frontend`
4. Framework preset: Next.js (auto-detected)
5. Click "Deploy"
6. Done! Your app will be live in ~2 minutes

### Option 2: Vercel CLI

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

### Option 3: Netlify

```bash
cd frontend
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=.next
```

### Option 4: Railway.app

1. Visit https://railway.app
2. New Project → Deploy from GitHub
3. Select `convergence-chainlink` repo
4. Set root to `frontend`
5. Deploy

## Frontend Status

✅ **Production build tested** - All routes render correctly
✅ **Mock data working** - Demo markets display properly
✅ **Responsive design** - Works on all screen sizes
✅ **Thirdweb integrated** - Ready for wallet connections

## Next Steps to Go Live

1. **Deploy frontend** using any option above
2. **Update contract address** in `frontend/app/page.tsx` if needed
3. **Add wallet connection** (thirdweb ConnectButton)
4. **Test end-to-end** - Create market → Wait for deadline → CRE resolves
5. **Record demo video** showing the full flow

## Current Features

- Browse prediction markets
- View resolved markets with confidence scores
- Create new markets with AI-powered category detection
- Minimal black & white design

## Repository

https://github.com/Kirillr-Sibirski/convergence-chainlink

---

**Contract deployed with Foundry**
**Frontend built with Next.js 14 + Thirdweb + Tailwind CSS**
