# CRE Workflow Compilation Fix

## Issue
The `cre workflow simulate` command failed with:
```
error: script not found 'cre-compile'
```

## Root Cause
The CRE SDK requires a **postinstall** script (`bunx cre-setup`) that creates the `cre-compile` tool. This script needs **bun** to run.

## Solution

### Step 1: Install Bun (if not installed)

On macOS:
```bash
curl -fsSL https://bun.sh/install | bash
```

Then add to your shell profile:
```bash
export PATH="$HOME/.bun/bin:$PATH"
source ~/.bashrc  # or ~/.zshrc
```

### Step 2: Reinstall Dependencies with Bun

```bash
cd /workspace/group/convergence-chainlink/cre-workflow
rm -rf node_modules package-lock.json
bun install
```

This will:
- Install all dependencies
- Run the `postinstall` script (`bunx cre-setup`)
- Create the `cre-compile` tool

### Step 3: Verify Setup

```bash
# Check if cre-compile exists
ls -la node_modules/.bin/cre-compile

# Should show: node_modules/.bin/cre-compile -> ...
```

### Step 4: Run Simulation

```bash
cre workflow simulate . --non-interactive --trigger-index 0 -T local-simulation
```

---

## Changes Made

I've updated the following files to match the official CRE demo structure:

### `package.json`
- Added `"postinstall": "bunx cre-setup"`
- Updated CRE SDK version to `0.0.8-alpha` (stable version)
- Updated dependencies:
  - `viem`: `^2.38.3`
  - `zod`: `^4.1.12`
- Added `@types/bun` dev dependency
- Changed `main` to `"dist/main.js"` (compiled output)

### `tsconfig.json`
- Changed `module` from `"ESNext"` to `"commonjs"` (required by CRE)
- Changed `target` from `"ES2022"` to `"esnext"`
- Added `"outDir": "./dist"` for compiled output
- Changed `include` to only `["main.ts"]` (entry point)
- Removed `"noEmit": true` (we need compilation)

---

## Alternative: Manual cre-setup (Advanced)

If you can't install bun for some reason, you could try:

1. **Use the official demo's node_modules:**
   ```bash
   cd /tmp
   git clone https://github.com/smartcontractkit/cre-gcp-prediction-market-demo.git
   cd cre-gcp-prediction-market-demo/cre-workflow/prediction-market-demo
   bun install
   # Copy the compiled cre tools to your project
   ```

2. **Skip simulation and deploy directly:**
   - You can skip the simulation step and deploy directly to staging
   - CRE will compile on their servers during deployment
   - **NOTE**: This is riskier as you won't catch errors locally

---

## Expected Output After Fix

```bash
$ bun install
...
✅ CRE TS SDK is ready to use.

$ ls node_modules/.bin/ | grep cre
cre-compile
cre-setup

$ cre workflow simulate .
✓ Compiling workflow...
✓ Running simulation...
[Simulation output]
```

---

## Next Steps After Fix

1. **Simulate locally** (optional but recommended):
   ```bash
   cre workflow simulate . --non-interactive --trigger-index 0 -T local-simulation
   ```

2. **Login to CRE**:
   ```bash
   cre login
   ```

3. **Deploy to staging**:
   ```bash
   cre workflow deploy . --target staging
   ```

4. **Monitor logs**:
   ```bash
   cre workflow logs <workflow-id> --follow
   ```

---

**Status**: Ready to proceed once bun is installed and `bun install` is run.
