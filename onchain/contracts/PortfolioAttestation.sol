// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title PortfolioAttestation
/// @notice On-chain proof of NFT portfolio holdings on GunzChain.
///         Stores a Merkle root of holdings; full data lives on IPFS.
///         Anyone can verify a specific holding via Merkle proof.
contract PortfolioAttestation {
    struct Attestation {
        uint256 blockNumber;   // Block at which holdings were snapshotted
        bytes32 merkleRoot;    // Merkle root of the holdings list
        uint256 totalValueGun; // Total portfolio value in GUN (18 decimals)
        uint16  itemCount;     // Number of NFTs in portfolio
        uint48  timestamp;     // When attestation was created
        string  metadataURI;   // IPFS URI with full holdings data
    }

    /// @notice wallet => list of attestations
    mapping(address => Attestation[]) private _attestations;

    /// @notice Total attestations across all wallets
    uint256 public totalAttestations;

    event PortfolioAttested(
        address indexed wallet,
        uint256 indexed attestationId,
        bytes32 merkleRoot,
        uint256 totalValueGun,
        uint16  itemCount,
        uint256 blockNumber,
        string  metadataURI
    );

    /// @notice Create an on-chain attestation of your portfolio holdings.
    /// @param blockNumber The block number at which holdings were verified
    /// @param merkleRoot Merkle root of the sorted holdings leaf set
    /// @param totalValueGun Total portfolio value in GUN (18 decimals)
    /// @param itemCount Number of NFT items in the portfolio
    /// @param metadataURI IPFS/Arweave URI containing the full holdings list
    /// @return attestationId Index of this attestation in the caller's history
    function attest(
        uint256 blockNumber,
        bytes32 merkleRoot,
        uint256 totalValueGun,
        uint16  itemCount,
        string calldata metadataURI
    ) external returns (uint256 attestationId) {
        require(blockNumber <= block.number, "Future block");
        require(merkleRoot != bytes32(0), "Empty merkle root");
        require(bytes(metadataURI).length > 0, "Empty metadata URI");

        attestationId = _attestations[msg.sender].length;

        _attestations[msg.sender].push(Attestation({
            blockNumber: blockNumber,
            merkleRoot: merkleRoot,
            totalValueGun: totalValueGun,
            itemCount: itemCount,
            timestamp: uint48(block.timestamp),
            metadataURI: metadataURI
        }));

        unchecked { totalAttestations++; }

        emit PortfolioAttested(
            msg.sender,
            attestationId,
            merkleRoot,
            totalValueGun,
            itemCount,
            blockNumber,
            metadataURI
        );
    }

    /// @notice Get the number of attestations for a wallet
    function getAttestationCount(address wallet) external view returns (uint256) {
        return _attestations[wallet].length;
    }

    /// @notice Get a specific attestation by index
    function getAttestation(
        address wallet,
        uint256 index
    ) external view returns (Attestation memory) {
        require(index < _attestations[wallet].length, "Index out of bounds");
        return _attestations[wallet][index];
    }

    /// @notice Get the most recent attestation for a wallet
    function getLatestAttestation(
        address wallet
    ) external view returns (Attestation memory) {
        uint256 count = _attestations[wallet].length;
        require(count > 0, "No attestations");
        return _attestations[wallet][count - 1];
    }

    /// @notice Verify that a specific holding was included in an attestation.
    /// @param wallet The wallet that created the attestation
    /// @param attestationIndex Which attestation to check against
    /// @param leaf The keccak256 hash of the holding data
    /// @param proof The Merkle proof path
    /// @return valid Whether the holding is included in the attestation
    function verifyHolding(
        address wallet,
        uint256 attestationIndex,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool valid) {
        require(attestationIndex < _attestations[wallet].length, "Index out of bounds");
        bytes32 root = _attestations[wallet][attestationIndex].merkleRoot;
        return MerkleProof.verify(proof, root, leaf);
    }
}
