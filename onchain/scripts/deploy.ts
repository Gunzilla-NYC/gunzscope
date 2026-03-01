import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deploying PortfolioAttestation (UUPS Proxy)...");
  console.log("  Deployer:", deployer.address);
  console.log("  Balance:", ethers.formatEther(balance), "AVAX");

  const attestFee = ethers.parseEther("0.01"); // 0.01 AVAX

  const PortfolioAttestation = await ethers.getContractFactory("PortfolioAttestation");
  const proxy = await upgrades.deployProxy(
    PortfolioAttestation,
    [attestFee],
    { kind: "uups" },
  );
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\nPortfolioAttestation deployed:");
  console.log("  Proxy:", proxyAddress);
  console.log("  Implementation:", implAddress);
  console.log("  Attest fee:", ethers.formatEther(attestFee), "AVAX");
  console.log("  Owner:", deployer.address);
  console.log("\nAdd to .env.local:");
  console.log(`  NEXT_PUBLIC_ATTESTATION_CONTRACT=${proxyAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
