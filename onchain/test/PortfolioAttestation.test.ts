import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

// Simulated NFT holding: [contractAddress, tokenId, valueGun]
type HoldingLeaf = [string, string, string];

function buildMerkleTree(holdings: HoldingLeaf[]) {
  return StandardMerkleTree.of(holdings, ["address", "uint256", "uint256"]);
}

describe("PortfolioAttestation", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const PortfolioAttestation = await ethers.getContractFactory("PortfolioAttestation");
    const contract = await PortfolioAttestation.deploy();

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
        metadataURI
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

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI);

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

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI);
      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 5, "ipfs://QmSecondAttestation");

      expect(await contract.getAttestationCount(alice.address)).to.equal(2);
      expect(await contract.totalAttestations()).to.equal(2);

      const latest = await contract.getLatestAttestation(alice.address);
      expect(latest.itemCount).to.equal(5);
    });

    it("should track attestations per wallet independently", async function () {
      const { contract, alice, bob, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI);
      await contract.connect(bob).attest(blockNumber, tree.root, totalValueGun, 1, "ipfs://QmBobAttestation");

      expect(await contract.getAttestationCount(alice.address)).to.equal(1);
      expect(await contract.getAttestationCount(bob.address)).to.equal(1);
      expect(await contract.totalAttestations()).to.equal(2);
    });

    it("should reject future block numbers", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const futureBlock = (await ethers.provider.getBlockNumber()) + 1000;

      await expect(
        contract.connect(alice).attest(futureBlock, tree.root, totalValueGun, 3, metadataURI)
      ).to.be.revertedWith("Future block");
    });

    it("should reject empty merkle root", async function () {
      const { contract, alice, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await expect(
        contract.connect(alice).attest(blockNumber, ethers.ZeroHash, totalValueGun, 3, metadataURI)
      ).to.be.revertedWith("Empty merkle root");
    });

    it("should reject empty metadata URI", async function () {
      const { contract, alice, tree, totalValueGun } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await expect(
        contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, "")
      ).to.be.revertedWith("Empty metadata URI");
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

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI);

      // Get proof for the first holding
      const proof = tree.getProof(0);
      const leaf = tree.leafHash(holdings[0]);

      expect(await contract.verifyHolding(alice.address, 0, leaf, proof)).to.be.true;
    });

    it("should verify all holdings in the tree", async function () {
      const { contract, alice, holdings, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI);

      for (let i = 0; i < holdings.length; i++) {
        const proof = tree.getProof(i);
        const leaf = tree.leafHash(holdings[i]);
        expect(await contract.verifyHolding(alice.address, 0, leaf, proof)).to.be.true;
      }
    });

    it("should reject an invalid holding", async function () {
      const { contract, alice, tree, totalValueGun, metadataURI } = await loadFixture(deployFixture);
      const blockNumber = await ethers.provider.getBlockNumber();

      await contract.connect(alice).attest(blockNumber, tree.root, totalValueGun, 3, metadataURI);

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
