# Deployed Contract Addresses - Sepolia Testnet

Deployment Date: March 1, 2026
Network: Ethereum Sepolia Testnet
Deployer: `0x2000f57be293734aeD2Ca9d629080A21E782FCAb`

---

## Core Contracts

| Contract | Address | Status |
|----------|---------|---------|
| **EOTFactory** | `0x7e3419E3b14436336F41daFc7Fe35A822cdc78AF` | ✅ Deployed |
| **AletheiaOracle** | `0xe7A47740Ff60146f9E3C443bf84Bd5b6d03530a4` | ✅ Deployed |
| **AletheiaMarket** | `0xf2DA89D632f9E28aF45f4F584Fb9b59F3041a10E` | ✅ Deployed |

---

## Configuration

**Forwarder Address**: `0x2000f57be293734aeD2Ca9d629080A21E782FCAb` (Deployer - temporary)

> **Note**: For production CRE workflow, the forwarder address should be updated to the actual Chainlink Forwarder contract address from the CRE workflow deployment.

---

## Verification

### EOTFactory
- Deployed: ✅
- Compiler Version: 0.8.20
- Constructor Args: None

### AletheiaOracle
- Deployed: ✅
- Compiler Version: 0.8.20
- Constructor Args: forwarderAddress=`0x2000f57be293734aeD2Ca9d629080A21E782FCAb`
- Inherits: ReceiverTemplate, IReceiver

---

## Next Steps

1. Deploy AletheiaMarket with oracle and factory addresses
2. Update CRE workflow config.json with oracle address
3. Test market creation and resolution flow
4. Submit to hackathon

---

**Deployment Command Used:**
```bash
export PRIVATE_KEY=your_private_key_here
export RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
export FORWARDER_ADDRESS=0x2000f57be293734aeD2Ca9d629080A21E782FCAb

# Factory
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast

# Oracle
forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```
