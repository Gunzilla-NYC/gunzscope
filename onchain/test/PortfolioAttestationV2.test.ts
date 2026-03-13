import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import type { PortfolioAttestationV2 } from "../typechain-types";

type HoldingLeaf = [string, string, string];

function buildMerkleTree(holdings: HoldingLeaf[]) {
  return StandardMerkleTree.of(holdings, ["address", "uint256", "uint256"]);
}

const ATTEST_FEE = ethers.parseEther("0.01");
const HANDLE_CHANGE_FEE = ethers.parseEther("0.005");

// Wallet status enum values (matches contract)
const WalletStatus = {
  NONE: 0,
  PRIMARY: 1,
  VERIFIED: 2,
  SELF_REPORTED: 3,
} as const;

describe("PortfolioAttestationV2", function () {
  async function deployV2Fixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();

    // Deploy V1 first, then upgrade to V2 (simulates real upgrade path)
    const V1 = await ethers.getContractFactory("PortfolioAttestation");
    const proxy = await upgrades.deployProxy(V1, [ATTEST_FEE], { kind: "uups" });

    const V2 = await ethers.getContractFactory("PortfolioAttestationV2");
    const upgraded = await upgrades.upgradeProxy(await proxy.getAddress(), V2, {
      call: { fn: "initializeV2", args: [HANDLE_CHANGE_FEE] },
    });
    const contract = upgraded as unknown as PortfolioAttestationV2;

    // Sample holdings
    const holdings: HoldingLeaf[] = [
      ["0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271", "1001", ethers.parseEther("500").toString()],
      ["0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271", "2045", ethers.parseEther("1200").toString()],
      ["0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271", "3789", ethers.parseEther("800").toString()],
    ];
    const tree = buildMerkleTree(holdings);
    const totalValueGun = ethers.parseEther("2500");
    const metadataURI = "ipfs://QmTestHash123456789";

    return { contract, owner, alice, bob, charlie, holdings, tree, totalValueGun, metadataURI };
  }

  // Also test fresh deploy (not via upgrade)
  async function deployFreshV2Fixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();

    const V2 = await ethers.getContractFactory("PortfolioAttestationV2");
    const proxy = await upgrades.deployProxy(V2, [ATTEST_FEE], { kind: "uups" });
    const contract = proxy as unknown as PortfolioAttestationV2;

    // Initialize V2
    await contract.initializeV2(HANDLE_CHANGE_FEE);

    return { contract, owner, alice, bob, charlie };
  }

  // ═══════════════════════════════════════════════════════════════
  // UPGRADE PATH
  // ═══════════════════════════════════════════════════════════════

  describe("Upgrade from V1", function () {
    it("should preserve V1 state after upgrade", async function () {
      const [owner, alice] = await ethers.getSigners();

      // Deploy V1 and create an attestation
      const V1 = await ethers.getContractFactory("PortfolioAttestation");
      const proxy = await upgrades.deployProxy(V1, [ATTEST_FEE], { kind: "uups" });
      const v1Contract = proxy as unknown as PortfolioAttestationV2;

      const holdings: HoldingLeaf[] = [
        ["0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271", "1001", ethers.parseEther("500").toString()],
      ];
      const tree = buildMerkleTree(holdings);
      const blockNumber = await ethers.provider.getBlockNumber();

      await v1Contract.connect(alice).attest(
        alice.address, blockNumber, tree.root,
        ethers.parseEther("500"), 1, "ipfs://QmV1Data",
        { value: ATTEST_FEE }
      );

      // Upgrade to V2
      const V2 = await ethers.getContractFactory("PortfolioAttestationV2");
      const upgraded = await upgrades.upgradeProxy(await proxy.getAddress(), V2, {
        call: { fn: "initializeV2", args: [HANDLE_CHANGE_FEE] },
      });
      const v2Contract = upgraded as unknown as PortfolioAttestationV2;

      // V1 data survives
      expect(await v2Contract.getAttestationCount(alice.address)).to.equal(1);
      expect(await v2Contract.totalAttestations()).to.equal(1);
      expect(await v2Contract.attestFee()).to.equal(ATTEST_FEE);
      expect(await v2Contract.owner()).to.equal(owner.address);

      const att = await v2Contract.getAttestation(alice.address, 0);
      expect(att.merkleRoot).to.equal(tree.root);

      // V2 state initialized
      expect(await v2Contract.handleChangeFee()).to.equal(HANDLE_CHANGE_FEE);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // gsHandle: IDENTITY
  // ═══════════════════════════════════════════════════════════════

  describe("gsHandle", function () {
    it("should register a handle for free (first time)", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);

      await expect(contract.connect(alice).setHandle("CryptoHaki"))
        .to.emit(contract, "HandleRegistered")
        .withArgs(alice.address, "CryptoHaki");

      expect(await contract.gsHandleOf(alice.address)).to.equal("CryptoHaki");
      expect(await contract.hasRegisteredHandle(alice.address)).to.be.true;
    });

    it("should preserve case but enforce case-insensitive uniqueness", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).setHandle("CryptoHaki");

      // Bob tries same handle different case
      await expect(
        contract.connect(bob).setHandle("cryptohaki")
      ).to.be.revertedWith("Handle taken");

      await expect(
        contract.connect(bob).setHandle("CRYPTOHAKI")
      ).to.be.revertedWith("Handle taken");

      // Stored with original case
      expect(await contract.gsHandleOf(alice.address)).to.equal("CryptoHaki");
    });

    it("should resolve handle to owner (case-insensitive)", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).setHandle("CryptoHaki");

      expect(await contract.resolveHandle("CryptoHaki")).to.equal(alice.address);
      expect(await contract.resolveHandle("cryptohaki")).to.equal(alice.address);
      expect(await contract.resolveHandle("CRYPTOHAKI")).to.equal(alice.address);
    });

    it("should return zero address for unregistered handle", async function () {
      const { contract } = await loadFixture(deployV2Fixture);
      expect(await contract.resolveHandle("nobody")).to.equal(ethers.ZeroAddress);
    });

    it("should charge fee for handle change", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);

      // First is free
      await contract.connect(alice).setHandle("OldName");

      // Change requires fee
      await expect(
        contract.connect(alice).setHandle("NewName")
      ).to.be.revertedWith("Insufficient fee for handle change");

      // With fee — works
      await expect(contract.connect(alice).setHandle("NewName", { value: HANDLE_CHANGE_FEE }))
        .to.emit(contract, "HandleChanged")
        .withArgs(alice.address, "OldName", "NewName");

      expect(await contract.gsHandleOf(alice.address)).to.equal("NewName");
    });

    it("should release old handle on change", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).setHandle("OldName");
      await contract.connect(alice).setHandle("NewName", { value: HANDLE_CHANGE_FEE });

      // Bob can now claim the released handle
      await contract.connect(bob).setHandle("OldName");
      expect(await contract.gsHandleOf(bob.address)).to.equal("OldName");
    });

    it("should allow reclaiming own handle without fee beyond first change", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).setHandle("MyName");

      // Changing to same handle (case-insensitive match, same owner) still costs fee
      // because hasRegisteredHandle is true
      await contract.connect(alice).setHandle("MyName", { value: HANDLE_CHANGE_FEE });
      expect(await contract.gsHandleOf(alice.address)).to.equal("MyName");
    });

    it("should track handle change fees in totalFeesCollected", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);

      const feesBefore = await contract.totalFeesCollected();
      await contract.connect(alice).setHandle("First");
      await contract.connect(alice).setHandle("Second", { value: HANDLE_CHANGE_FEE });

      expect(await contract.totalFeesCollected()).to.equal(feesBefore + HANDLE_CHANGE_FEE);
    });

    it("should reject handle shorter than 3 chars", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);
      await expect(contract.connect(alice).setHandle("ab")).to.be.revertedWith("Handle too short");
    });

    it("should reject handle longer than 32 chars", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);
      const longHandle = "a".repeat(33);
      await expect(contract.connect(alice).setHandle(longHandle)).to.be.revertedWith("Handle too long");
    });

    it("should accept handle at boundary lengths (3 and 32)", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);
      await contract.connect(alice).setHandle("abc");
      expect(await contract.gsHandleOf(alice.address)).to.equal("abc");

      const handle32 = "a".repeat(32);
      await contract.connect(bob).setHandle(handle32);
      expect(await contract.gsHandleOf(bob.address)).to.equal(handle32);
    });

    it("should reject handles with invalid characters", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);

      await expect(contract.connect(alice).setHandle("has space")).to.be.revertedWith("Invalid characters");
      await expect(contract.connect(alice).setHandle("has.dot")).to.be.revertedWith("Invalid characters");
      await expect(contract.connect(alice).setHandle("has@at")).to.be.revertedWith("Invalid characters");
      await expect(contract.connect(alice).setHandle("has!bang")).to.be.revertedWith("Invalid characters");
    });

    it("should accept handles with valid characters", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).setHandle("Alpha_123");
      await contract.connect(bob).setHandle("cool-name");
      await contract.connect(charlie).setHandle("ALL_CAPS_99");

      expect(await contract.gsHandleOf(alice.address)).to.equal("Alpha_123");
      expect(await contract.gsHandleOf(bob.address)).to.equal("cool-name");
      expect(await contract.gsHandleOf(charlie.address)).to.equal("ALL_CAPS_99");
    });

    it("should allow owner to update handle change fee", async function () {
      const { contract, owner } = await loadFixture(deployV2Fixture);
      const newFee = ethers.parseEther("0.1");

      await expect(contract.connect(owner).setHandleChangeFee(newFee))
        .to.emit(contract, "HandleFeeUpdated")
        .withArgs(HANDLE_CHANGE_FEE, newFee);

      expect(await contract.handleChangeFee()).to.equal(newFee);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PORTFOLIO: Multi-wallet registry
  // ═══════════════════════════════════════════════════════════════

  describe("Portfolio Wallets", function () {
    it("should add a SELF_REPORTED wallet", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await expect(contract.connect(alice).addWallet(bob.address, WalletStatus.SELF_REPORTED))
        .to.emit(contract, "WalletAdded")
        .withArgs(alice.address, bob.address, WalletStatus.SELF_REPORTED);

      const wallets = await contract.getPortfolioWallets(alice.address);
      expect(wallets.length).to.equal(1);
      expect(wallets[0].addr).to.equal(bob.address);
      expect(wallets[0].status).to.equal(WalletStatus.SELF_REPORTED);
    });

    it("should add a VERIFIED wallet", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(bob.address, WalletStatus.VERIFIED);

      const wallets = await contract.getPortfolioWallets(alice.address);
      expect(wallets[0].status).to.equal(WalletStatus.VERIFIED);
    });

    it("should set reverse lookup (primaryOf)", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(bob.address, WalletStatus.SELF_REPORTED);
      expect(await contract.primaryOf(bob.address)).to.equal(alice.address);
    });

    it("should add multiple wallets", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(bob.address, WalletStatus.VERIFIED);
      await contract.connect(alice).addWallet(charlie.address, WalletStatus.SELF_REPORTED);

      expect(await contract.getPortfolioWalletCount(alice.address)).to.equal(2);
    });

    it("should reject zero address", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);
      await expect(
        contract.connect(alice).addWallet(ethers.ZeroAddress, WalletStatus.SELF_REPORTED)
      ).to.be.revertedWith("Zero address");
    });

    it("should reject PRIMARY status (reserved)", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);
      await expect(
        contract.connect(alice).addWallet(bob.address, WalletStatus.PRIMARY)
      ).to.be.revertedWith("Invalid status");
    });

    it("should reject NONE status", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);
      await expect(
        contract.connect(alice).addWallet(bob.address, WalletStatus.NONE)
      ).to.be.revertedWith("Invalid status");
    });

    it("should reject wallet already claimed by another user", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(charlie.address, WalletStatus.VERIFIED);

      // Bob tries to claim charlie's wallet
      await expect(
        contract.connect(bob).addWallet(charlie.address, WalletStatus.SELF_REPORTED)
      ).to.be.revertedWith("Wallet claimed by another user");
    });

    it("should upgrade SELF_REPORTED to VERIFIED", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(bob.address, WalletStatus.SELF_REPORTED);

      await expect(contract.connect(alice).addWallet(bob.address, WalletStatus.VERIFIED))
        .to.emit(contract, "WalletUpgraded")
        .withArgs(alice.address, bob.address, WalletStatus.SELF_REPORTED, WalletStatus.VERIFIED);

      const wallets = await contract.getPortfolioWallets(alice.address);
      expect(wallets[0].status).to.equal(WalletStatus.VERIFIED);
    });

    it("should reject downgrade from VERIFIED to SELF_REPORTED", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(bob.address, WalletStatus.VERIFIED);

      await expect(
        contract.connect(alice).addWallet(bob.address, WalletStatus.SELF_REPORTED)
      ).to.be.revertedWith("Cannot downgrade status");
    });

    it("should remove a wallet", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(bob.address, WalletStatus.SELF_REPORTED);

      await expect(contract.connect(alice).removeWallet(bob.address))
        .to.emit(contract, "WalletRemoved")
        .withArgs(alice.address, bob.address);

      expect(await contract.getPortfolioWalletCount(alice.address)).to.equal(0);
      expect(await contract.primaryOf(bob.address)).to.equal(ethers.ZeroAddress);
    });

    it("should revert removing a wallet not in portfolio", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);
      await expect(
        contract.connect(alice).removeWallet(bob.address)
      ).to.be.revertedWith("Wallet not in portfolio");
    });

    it("should handle swap-and-pop correctly with multiple wallets", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(bob.address, WalletStatus.VERIFIED);
      await contract.connect(alice).addWallet(charlie.address, WalletStatus.SELF_REPORTED);

      // Remove first wallet — charlie should swap into its slot
      await contract.connect(alice).removeWallet(bob.address);

      const wallets = await contract.getPortfolioWallets(alice.address);
      expect(wallets.length).to.equal(1);
      expect(wallets[0].addr).to.equal(charlie.address);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TAKEOVER: Verified trumps self-reported
  // ═══════════════════════════════════════════════════════════════

  describe("Wallet Takeover", function () {
    it("should allow takeover of SELF_REPORTED wallet", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      // Alice self-reports charlie's wallet
      await contract.connect(alice).addWallet(charlie.address, WalletStatus.SELF_REPORTED);

      // Bob (the real owner) takes it over
      await contract.connect(bob).takeoverWallet(charlie.address, alice.address);

      // Charlie's wallet now belongs to Bob as VERIFIED
      expect(await contract.primaryOf(charlie.address)).to.equal(bob.address);

      const bobWallets = await contract.getPortfolioWallets(bob.address);
      expect(bobWallets.length).to.equal(1);
      expect(bobWallets[0].addr).to.equal(charlie.address);
      expect(bobWallets[0].status).to.equal(WalletStatus.VERIFIED);

      // Removed from Alice
      expect(await contract.getPortfolioWalletCount(alice.address)).to.equal(0);
    });

    it("should emit both WalletRemoved and WalletAdded on takeover", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(charlie.address, WalletStatus.SELF_REPORTED);

      const tx = contract.connect(bob).takeoverWallet(charlie.address, alice.address);

      await expect(tx)
        .to.emit(contract, "WalletRemoved")
        .withArgs(alice.address, charlie.address);

      await expect(tx)
        .to.emit(contract, "WalletAdded")
        .withArgs(bob.address, charlie.address, WalletStatus.VERIFIED);
    });

    it("should reject takeover of VERIFIED wallet", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(charlie.address, WalletStatus.VERIFIED);

      await expect(
        contract.connect(bob).takeoverWallet(charlie.address, alice.address)
      ).to.be.revertedWith("Cannot take over verified wallet");
    });

    it("should reject takeover with wrong fromPrimary", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).addWallet(charlie.address, WalletStatus.SELF_REPORTED);

      // Bob claims it's from charlie (wrong)
      await expect(
        contract.connect(bob).takeoverWallet(charlie.address, charlie.address)
      ).to.be.revertedWith("Wallet not claimed by fromPrimary");
    });

    it("should reject takeover of unclaimed wallet", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await expect(
        contract.connect(bob).takeoverWallet(alice.address, alice.address)
      ).to.be.revertedWith("Wallet not claimed by fromPrimary");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // V1 ATTESTATION: still works after upgrade
  // ═══════════════════════════════════════════════════════════════

  describe("Attestation (V1 compat)", function () {
    it("should create attestation after upgrade", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployV2Fixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(
        alice.address, blockNumber, tree.root, totalValueGun, 3, metadataURI,
        { value: ATTEST_FEE }
      );

      expect(await contract.getAttestationCount(alice.address)).to.equal(1);
    });

    it("should verify Merkle proofs after upgrade", async function () {
      const { contract, alice, holdings, tree, totalValueGun, metadataURI } = await loadFixture(deployV2Fixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(
        alice.address, blockNumber, tree.root, totalValueGun, 3, metadataURI,
        { value: ATTEST_FEE }
      );

      for (let i = 0; i < holdings.length; i++) {
        const proof = tree.getProof(i);
        const leaf = tree.leafHash(holdings[i]);
        expect(await contract.verifyHolding(alice.address, 0, leaf, proof)).to.be.true;
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMBINED FLOWS: identity + wallets + attestation
  // ═══════════════════════════════════════════════════════════════

  describe("Combined Flows", function () {
    it("should support full user journey: handle + wallets + attest", async function () {
      const { contract, alice, bob, tree, totalValueGun, metadataURI } = await loadFixture(deployV2Fixture);

      // 1. Register handle
      await contract.connect(alice).setHandle("CryptoHaki");

      // 2. Add secondary wallet
      await contract.connect(alice).addWallet(bob.address, WalletStatus.VERIFIED);

      // 3. Attest portfolio (holdings from both wallets consolidated)
      const blockNumber = await ethers.provider.getBlockNumber();
      await contract.connect(alice).attest(
        alice.address, blockNumber, tree.root, totalValueGun, 3, metadataURI,
        { value: ATTEST_FEE }
      );

      // Verify everything is queryable
      expect(await contract.gsHandleOf(alice.address)).to.equal("CryptoHaki");
      expect(await contract.getPortfolioWalletCount(alice.address)).to.equal(1);
      expect(await contract.getAttestationCount(alice.address)).to.equal(1);
      expect(await contract.resolveHandle("cryptohaki")).to.equal(alice.address);
      expect(await contract.primaryOf(bob.address)).to.equal(alice.address);
    });

    it("should allow looking up full identity from handle", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).setHandle("GunzMaster");
      await contract.connect(alice).addWallet(bob.address, WalletStatus.VERIFIED);
      await contract.connect(alice).addWallet(charlie.address, WalletStatus.SELF_REPORTED);

      // Resolve handle → address → wallets
      const primary = await contract.resolveHandle("gunzmaster");
      expect(primary).to.equal(alice.address);

      const wallets = await contract.getPortfolioWallets(primary);
      expect(wallets.length).to.equal(2);

      // Reverse: from any wallet, find the primary
      expect(await contract.primaryOf(bob.address)).to.equal(alice.address);
      expect(await contract.primaryOf(charlie.address)).to.equal(alice.address);
    });

    it("should handle the takeover-then-attest flow", async function () {
      const { contract, alice, bob, charlie, tree, totalValueGun, metadataURI } = await loadFixture(deployV2Fixture);

      // Alice self-reports a wallet
      await contract.connect(alice).addWallet(charlie.address, WalletStatus.SELF_REPORTED);

      // Bob takes it over (he's the real owner)
      await contract.connect(bob).takeoverWallet(charlie.address, alice.address);

      // Bob attests with the taken-over wallet in his portfolio
      const blockNumber = await ethers.provider.getBlockNumber();
      await contract.connect(bob).attest(
        bob.address, blockNumber, tree.root, totalValueGun, 3, metadataURI,
        { value: ATTEST_FEE }
      );

      expect(await contract.getAttestationCount(bob.address)).to.equal(1);
      expect(await contract.primaryOf(charlie.address)).to.equal(bob.address);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // OWNER FUNCTIONS (V2 additions)
  // ═══════════════════════════════════════════════════════════════

  describe("Owner Functions (V2)", function () {
    it("should reject non-owner setHandleChangeFee", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);
      await expect(
        contract.connect(alice).setHandleChangeFee(0)
      ).to.be.revertedWith("Not owner");
    });

    it("should allow setting handle change fee to zero", async function () {
      const { contract, owner } = await loadFixture(deployV2Fixture);
      await contract.connect(owner).setHandleChangeFee(0);
      expect(await contract.handleChangeFee()).to.equal(0);
    });

    it("should withdraw handle change fees via existing withdraw", async function () {
      const { contract, owner, alice } = await loadFixture(deployV2Fixture);

      // Generate handle change fee
      await contract.connect(alice).setHandle("First");
      await contract.connect(alice).setHandle("Second", { value: HANDLE_CHANGE_FEE });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await contract.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * BigInt(receipt!.gasPrice);
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.equal(balanceBefore + HANDLE_CHANGE_FEE - gasCost);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BATCH WALLET OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  describe("Batch wallet operations", function () {
    it("should batch add 3 wallets in one tx", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);
      const [, , , , extra1] = await ethers.getSigners();

      await contract.connect(alice).batchAddWallets(
        [bob.address, charlie.address, extra1.address],
        [WalletStatus.VERIFIED, WalletStatus.SELF_REPORTED, WalletStatus.VERIFIED]
      );

      const wallets = await contract.getPortfolioWallets(alice.address);
      expect(wallets.length).to.equal(3);
      expect(wallets[0].addr).to.equal(bob.address);
      expect(wallets[0].status).to.equal(WalletStatus.VERIFIED);
      expect(wallets[1].addr).to.equal(charlie.address);
      expect(wallets[1].status).to.equal(WalletStatus.SELF_REPORTED);
      expect(wallets[2].addr).to.equal(extra1.address);
      expect(wallets[2].status).to.equal(WalletStatus.VERIFIED);
    });

    it("should revert entire batch if one wallet is claimed by another", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      // Bob claims charlie's wallet first
      await contract.connect(bob).addWallet(charlie.address, WalletStatus.SELF_REPORTED);

      // Alice tries to batch add — charlie is already claimed by bob
      await expect(
        contract.connect(alice).batchAddWallets(
          [bob.address, charlie.address],
          [WalletStatus.VERIFIED, WalletStatus.VERIFIED]
        )
      ).to.be.revertedWith("Wallet claimed by another user");
    });

    it("should batch remove all wallets", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      // Add wallets first
      await contract.connect(alice).batchAddWallets(
        [bob.address, charlie.address],
        [WalletStatus.VERIFIED, WalletStatus.SELF_REPORTED]
      );
      expect(await contract.getPortfolioWalletCount(alice.address)).to.equal(2);

      // Batch remove
      await contract.connect(alice).batchRemoveWallets([bob.address, charlie.address]);

      expect(await contract.getPortfolioWalletCount(alice.address)).to.equal(0);
      expect(await contract.primaryOf(bob.address)).to.equal(ethers.ZeroAddress);
      expect(await contract.primaryOf(charlie.address)).to.equal(ethers.ZeroAddress);
    });

    it("should succeed with empty arrays (no-op)", async function () {
      const { contract, alice } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).batchAddWallets([], []);
      await contract.connect(alice).batchRemoveWallets([]);

      expect(await contract.getPortfolioWalletCount(alice.address)).to.equal(0);
    });

    it("should revert on length mismatch", async function () {
      const { contract, alice, bob } = await loadFixture(deployV2Fixture);

      await expect(
        contract.connect(alice).batchAddWallets(
          [bob.address],
          [WalletStatus.VERIFIED, WalletStatus.SELF_REPORTED]
        )
      ).to.be.revertedWith("Length mismatch");
    });

    it("should batch add then batch remove → portfolio empty", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).batchAddWallets(
        [bob.address, charlie.address],
        [WalletStatus.VERIFIED, WalletStatus.SELF_REPORTED]
      );

      await contract.connect(alice).batchRemoveWallets([bob.address, charlie.address]);

      const wallets = await contract.getPortfolioWallets(alice.address);
      expect(wallets.length).to.equal(0);
    });

    it("should emit WalletAdded for each wallet in batch", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      const tx = contract.connect(alice).batchAddWallets(
        [bob.address, charlie.address],
        [WalletStatus.VERIFIED, WalletStatus.SELF_REPORTED]
      );

      await expect(tx)
        .to.emit(contract, "WalletAdded")
        .withArgs(alice.address, bob.address, WalletStatus.VERIFIED);
      await expect(tx)
        .to.emit(contract, "WalletAdded")
        .withArgs(alice.address, charlie.address, WalletStatus.SELF_REPORTED);
    });

    it("should emit WalletRemoved for each wallet in batch remove", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployV2Fixture);

      await contract.connect(alice).batchAddWallets(
        [bob.address, charlie.address],
        [WalletStatus.VERIFIED, WalletStatus.SELF_REPORTED]
      );

      const tx = contract.connect(alice).batchRemoveWallets([bob.address, charlie.address]);

      await expect(tx)
        .to.emit(contract, "WalletRemoved")
        .withArgs(alice.address, bob.address);
      await expect(tx)
        .to.emit(contract, "WalletRemoved")
        .withArgs(alice.address, charlie.address);
    });
  });
});
