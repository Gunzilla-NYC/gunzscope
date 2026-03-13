/**
 * Mainnet upgrade script using direct Ledger communication.
 * Bypasses hardhat-ledger plugin which has issues with provider wrapping.
 *
 * Uses @ledgerhq/hw-transport-node-hid and @ledgerhq/hw-app-eth directly,
 * wraps the Ledger in an ethers.js Signer, then passes to OpenZeppelin upgrades.
 */
import { ethers, upgrades } from "hardhat";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import Eth from "@ledgerhq/hw-app-eth";

const LEDGER_ADDRESS = "0x8ABF795f22931DFb0D086693343F5f80571b488C";
const DERIVATION_PATH = "44'/60'/3'/0/0";

/**
 * Creates an ethers.js Signer that delegates signing to a Ledger device.
 */
class LedgerSigner extends ethers.AbstractSigner {
  private eth: Eth | null = null;
  private _address: string;

  constructor(
    provider: ethers.Provider,
    private derivationPath: string,
    address: string
  ) {
    super(provider);
    this._address = address;
  }

  async init(): Promise<void> {
    if (this.eth) return;
    console.log("  Connecting to Ledger...");
    const transport = await TransportNodeHid.create(10000, 10000);
    this.eth = new Eth(transport);

    // Verify address matches
    const result = await this.eth.getAddress(this.derivationPath);
    if (result.address.toLowerCase() !== this._address.toLowerCase()) {
      throw new Error(
        `Ledger address mismatch: expected ${this._address}, got ${result.address}`
      );
    }
    console.log("  Ledger connected:", result.address);
  }

  async getAddress(): Promise<string> {
    return this._address;
  }

  connect(provider: ethers.Provider): LedgerSigner {
    return new LedgerSigner(provider, this.derivationPath, this._address);
  }

  async signTransaction(
    tx: ethers.TransactionLike
  ): Promise<string> {
    await this.init();
    if (!this.eth) throw new Error("Ledger not initialized");

    // Resolve all fields
    const populated = await this.populateTransaction(tx);

    // Remove 'from' — ethers.Transaction.from() doesn't accept it for unsigned tx
    const { from: _from, ...txWithoutFrom } = populated;

    // Serialize unsigned transaction
    const unsignedTx = ethers.Transaction.from(txWithoutFrom);
    const serialized = unsignedTx.unsignedSerialized;

    // Strip 0x prefix for Ledger
    const rawTxHex = serialized.slice(2);

    console.log("  Please confirm transaction on Ledger...");
    const sig = await this.eth.signTransaction(
      this.derivationPath,
      rawTxHex
    );

    // Apply signature
    unsignedTx.signature = {
      r: "0x" + sig.r,
      s: "0x" + sig.s,
      v: parseInt(sig.v, 16),
    };

    return unsignedTx.serialized;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    await this.init();
    if (!this.eth) throw new Error("Ledger not initialized");

    const msgHex =
      typeof message === "string"
        ? Buffer.from(message).toString("hex")
        : Buffer.from(message).toString("hex");

    console.log("  Please sign message on Ledger...");
    const sig = await this.eth.signPersonalMessage(
      this.derivationPath,
      msgHex
    );

    return ethers.Signature.from({
      r: "0x" + sig.r,
      s: "0x" + sig.s,
      v: parseInt(sig.v, 16),
    }).serialized;
  }

  async signTypedData(
    _domain: ethers.TypedDataDomain,
    _types: Record<string, ethers.TypedDataField[]>,
    _value: Record<string, unknown>
  ): Promise<string> {
    throw new Error("signTypedData not implemented for Ledger");
  }
}

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("Set PROXY_ADDRESS env var to the proxy contract address");
  }

  console.log("Upgrading to PortfolioAttestationV2 on Avalanche C-Chain...");
  console.log("  Proxy:", proxyAddress);

  // Create Ledger signer with the hardhat provider
  const provider = ethers.provider;
  const ledgerSigner = new LedgerSigner(provider, DERIVATION_PATH, LEDGER_ADDRESS);
  await ledgerSigner.init();

  // Verify the Ledger address is the proxy owner
  const proxyAdmin = await upgrades.erc1967.getAdminAddress(proxyAddress).catch(() => null);
  console.log("  Proxy admin:", proxyAdmin ?? "(UUPS - no admin)");

  // Force-import the existing proxy so OZ manifest is in sync
  const currentImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("  Current implementation:", currentImpl);

  const PortfolioAttestationV1 = await ethers.getContractFactory(
    "PortfolioAttestation",
    ledgerSigner
  );
  console.log("  Force-importing existing proxy into manifest...");
  await upgrades.forceImport(proxyAddress, PortfolioAttestationV1, { kind: "uups" });
  console.log("  Import complete.");

  const PortfolioAttestationV2 = await ethers.getContractFactory(
    "PortfolioAttestationV2",
    ledgerSigner
  );

  console.log("\n  Deploying new implementation + calling initializeV2...");
  console.log("  You will need to confirm 2 transactions on Ledger:");
  console.log("    1. Deploy new implementation contract");
  console.log("    2. Upgrade proxy + call initializeV2\n");

  const upgraded = await upgrades.upgradeProxy(proxyAddress, PortfolioAttestationV2, {
    kind: "uups",
    call: { fn: "initializeV2", args: [ethers.parseEther("0.005")] },
  });
  await upgraded.waitForDeployment();

  const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("\nUpgrade complete!");
  console.log("  Proxy (unchanged):", proxyAddress);
  console.log("  New implementation:", newImpl);
  console.log("  handleChangeFee: 0.005 AVAX");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
