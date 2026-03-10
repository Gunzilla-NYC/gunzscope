import { ethers, upgrades } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  if (!deployer) {
    // Ledger-only mode: no hot wallet signers, Ledger plugin handles signing at provider level
    console.log("No hot wallet signer found — deploying via Ledger plugin...");
  } else {
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deploying PortfolioAttestation (UUPS Proxy)...");
    console.log("  Deployer:", deployer.address);
    console.log("  Balance:", ethers.formatEther(balance), "AVAX");
  }

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
  console.log("  Owner:", deployer?.address ?? "Ledger");
  console.log("\nAdd to .env.local:");
  console.log(`  NEXT_PUBLIC_ATTESTATION_CONTRACT=${proxyAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
