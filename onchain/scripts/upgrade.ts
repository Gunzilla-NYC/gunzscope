import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("Set PROXY_ADDRESS env var to the proxy contract address");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Upgrading PortfolioAttestation...");
  console.log("  Proxy:", proxyAddress);
  console.log("  Deployer:", deployer.address);

  const PortfolioAttestationV2 = await ethers.getContractFactory("PortfolioAttestation");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, PortfolioAttestationV2, {
    kind: "uups",
  });
  await upgraded.waitForDeployment();

  const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("\nUpgrade complete:");
  console.log("  Proxy (unchanged):", proxyAddress);
  console.log("  New implementation:", newImpl);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
