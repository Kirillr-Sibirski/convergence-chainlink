const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e";
  
  console.log("Deploying DemoPredictionMarket...");
  console.log("Oracle address:", ORACLE_ADDRESS);
  
  const DemoPredictionMarket = await hre.ethers.getContractFactory("DemoPredictionMarket");
  const predictionMarket = await DemoPredictionMarket.deploy(ORACLE_ADDRESS);
  
  await predictionMarket.waitForDeployment();
  
  const address = await predictionMarket.getAddress();
  
  console.log("\n✅ DemoPredictionMarket deployed to:", address);
  console.log("\n📝 Update frontend/lib/contracts.ts:");
  console.log(`PREDICTION_MARKET_ADDRESS: "${address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
