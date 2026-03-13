/**
 * Fuji-only upgrade script — uses software signer (DEPLOYER_PRIVATE_KEY).
 * For mainnet, use upgrade.ts which requires the Ledger.
 */
import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("Set PROXY_ADDRESS env var to the proxy contract address");
  }

  const [signer] = await ethers.getSigners();
  console.log("Upgrading to PortfolioAttestationV2 on Fuji...");
  console.log("  Proxy:", proxyAddress);
  console.log("  Signer:", signer.address);

  const PortfolioAttestationV2 = await ethers.getContractFactory(
    "PortfolioAttestationV2",
    signer
  );
  const upgraded = await upgrades.upgradeProxy(proxyAddress, PortfolioAttestationV2, {
    kind: "uups",
    call: { fn: "initializeV2", args: [ethers.parseEther("0.005")] },
  });
  await upgraded.waitForDeployment();

  const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("\nUpgrade complete:");
  console.log("  Proxy (unchanged):", proxyAddress);
  console.log("  New implementation:", newImpl);
  console.log("  handleChangeFee: 0.005 AVAX");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
