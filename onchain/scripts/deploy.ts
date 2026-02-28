import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deploying PortfolioAttestation...");
  console.log("  Deployer:", deployer.address);
  console.log("  Balance:", ethers.formatEther(balance), "GUN");

  const PortfolioAttestation = await ethers.getContractFactory("PortfolioAttestation");
  const contract = await PortfolioAttestation.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nPortfolioAttestation deployed to:", address);
  console.log("\nAdd to .env.local:");
  console.log(`  NEXT_PUBLIC_ATTESTATION_CONTRACT=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
