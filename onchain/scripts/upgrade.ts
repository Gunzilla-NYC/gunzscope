import { ethers, upgrades } from "hardhat";

const LEDGER_OWNER = "0x8ABF795f22931DFb0D086693343F5f80571b488C";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("Set PROXY_ADDRESS env var to the proxy contract address");
  }

  // Get all signers — Ledger signer is available via hardhat-ledger plugin
  const signers = await ethers.getSigners();
  const ledgerSigner = signers.find(
    (s) => s.address.toLowerCase() === LEDGER_OWNER.toLowerCase()
  );

  if (!ledgerSigner) {
    throw new Error(
      `Ledger signer ${LEDGER_OWNER} not found. Ensure Ledger is connected and the Ethereum app is open.`
    );
  }

  console.log("Upgrading PortfolioAttestation...");
  console.log("  Proxy:", proxyAddress);
  console.log("  Owner (Ledger):", ledgerSigner.address);

  const PortfolioAttestationV2 = await ethers.getContractFactory(
    "PortfolioAttestation",
    ledgerSigner
  );
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
