import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import type { PortfolioAttestation } from "../typechain-types";

// Simulated NFT holding: [contractAddress, tokenId, valueGun]
type HoldingLeaf = [string, string, string];

function buildMerkleTree(holdings: HoldingLeaf[]) {
  return StandardMerkleTree.of(holdings, ["address", "uint256", "uint256"]);
}

const ATTEST_FEE = ethers.parseEther("0.01");

describe("PortfolioAttestation", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const PortfolioAttestation = await ethers.getContractFactory("PortfolioAttestation");
    const proxy = await upgrades.deployProxy(PortfolioAttestation, [ATTEST_FEE], { kind: "uups" });
    const contract = proxy as unknown as PortfolioAttestation;

    // Sample holdings for alice's portfolio
    const holdings: HoldingLeaf[] = [
      ["0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271", "1001", ethers.parseEther("500").toString()],
      ["0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271", "2045", ethers.parseEther("1200").toString()],
      ["0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271", "3789", ethers.parseEther("800").toString()],
    ];

    const tree = buildMerkleTree(holdings);
    const totalValueGun = ethers.parseEther("2500");
    const metadataURI = "ipfs://QmTestHash123456789";

    return { contract, owner, alice, bob, holdings, tree, totalValueGun, metadataURI };
  }

  describe("Attestation", function () {
    it("should create an attestation", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      const tx = await contract.connect(alice).attest(
        blockNumber,
        tree.root,
        totalValueGun,
        3, // itemCount
        metadataURI,
        { value: ATTEST_FEE }
      );

      await expect(tx)
        .to.emit(contract, "PortfolioAttested")
        .withArgs(alice.address, 0, tree.root, totalValueGun, 3, blockNumber, metadataURI);

      expect(await contract.getAttestationCount(alice.address)).to.equal(1);
      expect(await contract.totalAttestations()).to.equal(1);
    });

    it("should store attestation data correctly", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE });

      const att = await contract.getAttestation(alice.address, 0);
      expect(att.blockNumber).to.equal(blockNumber);
      expect(att.merkleRoot).to.equal(tree.root);
      expect(att.totalValueGun).to.equal(totalValueGun);
      expect(att.itemCount).to.equal(3);
      expect(att.metadataURI).to.equal(metadataURI);
      expect(att.timestamp).to.be.greaterThan(0);
    });

    it("should support multiple attestations per wallet", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE });
      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 5, "ipfs://QmSecondAttestation", { value: ATTEST_FEE });

      expect(await contract.getAttestationCount(alice.address)).to.equal(2);
      expect(await contract.totalAttestations()).to.equal(2);

      const latest = await contract.getLatestAttestation(alice.address);
      expect(latest.itemCount).to.equal(5);
    });

    it("should track attestations per wallet independently", async function () {
      const { contract, alice, bob, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE });
      await contract.connect(bob).attest(blockNumber, tree.root, totalValueGun, 1, "ipfs://QmBobAttestation", { value: ATTEST_FEE });

      expect(await contract.getAttestationCount(alice.address)).to.equal(1);
      expect(await contract.getAttestationCount(bob.address)).to.equal(1);
      expect(await contract.totalAttestations()).to.equal(2);
    });

    it("should reject insufficient fee", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await expect(
        contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: 0 })
      ).to.be.revertedWith("Insufficient fee");

      await expect(
        contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE - 1n })
      ).to.be.revertedWith("Insufficient fee");
    });

    it("should accept overpayment", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();
      const overpay = ATTEST_FEE * 2n;

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: overpay });
      expect(await contract.totalAttestations()).to.equal(1);
      expect(await contract.totalFeesCollected()).to.equal(overpay);
    });

    it("should track total fees collected", async function () {
      const { contract, alice, bob, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE });
      await contract.connect(bob).attest(blockNumber, tree.root, totalValueGun, 1, "ipfs://QmBob", { value: ATTEST_FEE });

      expect(await contract.totalFeesCollected()).to.equal(ATTEST_FEE * 2n);
    });

    it("should reject future block numbers", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const futureBlock = (await ethers.provider.getBlockNumber()) + 1000;

      await expect(
        contract.connect(alice).attest(futureBlock, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE })
      ).to.be.revertedWith("Future block");
    });

    it("should reject empty merkle root", async function () {
      const { contract, alice, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await expect(
        contract.connect(alice).attest(blockNumber, ethers.ZeroHash, totalValueGun, 3, metadataURI, { value: ATTEST_FEE })
      ).to.be.revertedWith("Empty merkle root");
    });

    it("should reject empty metadata URI", async function () {
      const { contract, alice, tree, totalValueGun } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await expect(
        contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, "", { value: ATTEST_FEE })
      ).to.be.revertedWith("Empty metadata URI");
    });
  });

  describe("Owner Functions", function () {
    it("should set owner on deploy", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("should set fee on deploy", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.attestFee()).to.equal(ATTEST_FEE);
    });

    it("should allow owner to update fee", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const newFee = ethers.parseEther("0.05");

      await expect(contract.connect(owner).setFee(newFee))
        .to.emit(contract, "FeeUpdated")
        .withArgs(ATTEST_FEE, newFee);

      expect(await contract.attestFee()).to.equal(newFee);
    });

    it("should reject non-owner fee update", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      await expect(
        contract.connect(alice).setFee(0)
      ).to.be.revertedWith("Not owner");
    });

    it("should allow owner to withdraw fees", async function () {
      const { contract, owner, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      // Generate some fees
      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await contract.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * BigInt(receipt!.gasPrice);
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.equal(balanceBefore + ATTEST_FEE - gasCost);
    });

    it("should reject withdraw with no balance", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await expect(
        contract.connect(owner).withdraw()
      ).to.be.revertedWith("No balance");
    });

    it("should reject non-owner withdraw", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      await expect(
        contract.connect(alice).withdraw()
      ).to.be.revertedWith("Not owner");
    });

    it("should allow owner to transfer ownership", async function () {
      const { contract, owner, alice } = await loadFixture(deployFixture);

      await expect(contract.connect(owner).transferOwnership(alice.address))
        .to.emit(contract, "OwnerTransferred")
        .withArgs(owner.address, alice.address);

      expect(await contract.owner()).to.equal(alice.address);
    });

    it("should reject transfer to zero address", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await expect(
        contract.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });

    it("should reject non-owner transfer", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      await expect(
        contract.connect(alice).transferOwnership(bob.address)
      ).to.be.revertedWith("Not owner");
    });
  });

  describe("Queries", function () {
    it("should revert on out-of-bounds getAttestation", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      await expect(
        contract.getAttestation(alice.address, 0)
      ).to.be.revertedWith("Index out of bounds");
    });

    it("should revert on getLatestAttestation with no history", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      await expect(
        contract.getLatestAttestation(alice.address)
      ).to.be.revertedWith("No attestations");
    });
  });

  describe("Merkle Verification", function () {
    it("should verify a valid holding", async function () {
      const { contract, alice, holdings, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE });

      // Get proof for the first holding
      const proof = tree.getProof(0);
      const leaf = tree.leafHash(holdings[0]);

      expect(await contract.verifyHolding(alice.address, 0, leaf, proof)).to.be.true;
    });

    it("should verify all holdings in the tree", async function () {
      const { contract, alice, holdings, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE });

      for (let i = 0; i < holdings.length; i++) {
        const proof = tree.getProof(i);
        const leaf = tree.leafHash(holdings[i]);
        expect(await contract.verifyHolding(alice.address, 0, leaf, proof)).to.be.true;
      }
    });

    it("should reject an invalid holding", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI, { value: ATTEST_FEE });

      // Fabricate a fake leaf
      const fakeLeaf = ethers.keccak256(ethers.toUtf8Bytes("fake-holding"));
      const realProof = tree.getProof(0);

      expect(await contract.verifyHolding(alice.address, 0, fakeLeaf, realProof)).to.be.false;
    });

    it("should reject verification for non-existent attestation", async function () {
      const { contract, alice, holdings, tree } = await loadFixture(deployFixture);
      const proof = tree.getProof(0);
      const leaf = tree.leafHash(holdings[0]);

      await expect(
        contract.verifyHolding(alice.address, 0, leaf, proof)
      ).to.be.revertedWith("Index out of bounds");
    });
  });
});
