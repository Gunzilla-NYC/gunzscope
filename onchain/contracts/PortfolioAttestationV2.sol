// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title PortfolioAttestation V2 (UUPS Upgradeable)
/// @notice On-chain portfolio attestation + identity registry.
///         V2 adds: gsHandle (unique gaming identity) + multi-wallet portfolio mapping.
contract PortfolioAttestationV2 is Initializable, UUPSUpgradeable {

    // ── V1 Storage (DO NOT REORDER) ─────────────────────────────

    struct Attestation {
        uint256 blockNumber;
        bytes32 merkleRoot;
        uint256 totalValueGun;
        uint16  itemCount;
        uint48  timestamp;
        string  metadataURI;
    }

    address public owner;
    uint256 public attestFee;
    mapping(address => Attestation[]) private _attestations;
    uint256 public totalAttestations;
    uint256 public totalFeesCollected;

    // ── V2 Storage (appended after V1) ──────────────────────────

    enum WalletStatus {
        NONE,           // Not registered
        PRIMARY,        // Anchor wallet (Dynamic auth)
        VERIFIED,       // Proved via EIP-191 signature
        SELF_REPORTED   // Claimed without proof
    }

    struct PortfolioWallet {
        address addr;
        WalletStatus status;
        uint48 addedAt;
    }

    /// @notice Primary wallet => gsHandle (the canonical identity)
    mapping(address => string) public gsHandleOf;

    /// @notice gsHandle hash => owner address (uniqueness enforcement)
    mapping(bytes32 => address) public handleOwner;

    /// @notice Primary wallet => list of portfolio wallets
    mapping(address => PortfolioWallet[]) private _portfolioWallets;

    /// @notice Secondary wallet => primary wallet (reverse lookup)
    mapping(address => address) public primaryOf;

    /// @notice Fee to change gsHandle (first registration is free)
    uint256 public handleChangeFee;

    /// @notice Tracks whether a wallet has used its free handle registration
    mapping(address => bool) public hasRegisteredHandle;

    // ── Events ──────────────────────────────────────────────────

    event PortfolioAttested(
        address indexed wallet,
        uint256 indexed attestationId,
        bytes32 merkleRoot,
        uint256 totalValueGun,
        uint16  itemCount,
        uint256 blockNumber,
        string  metadataURI
    );

    event HandleRegistered(address indexed wallet, string handle);
    event HandleChanged(address indexed wallet, string oldHandle, string newHandle);
    event WalletAdded(address indexed primary, address indexed wallet, WalletStatus status);
    event WalletRemoved(address indexed primary, address indexed wallet);
    event WalletUpgraded(address indexed primary, address indexed wallet, WalletStatus oldStatus, WalletStatus newStatus);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event HandleFeeUpdated(uint256 oldFee, uint256 newFee);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);

    // ── Modifiers ───────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice V1 initializer (already called on proxy)
    function initialize(uint256 _attestFee) external initializer {
        owner = msg.sender;
        attestFee = _attestFee;
    }

    /// @notice V2 initializer — call via upgrade
    function initializeV2(uint256 _handleChangeFee) external reinitializer(2) {
        handleChangeFee = _handleChangeFee;
    }

    // ═════════════════════════════════════════════════════════════
    // IDENTITY: gsHandle
    // ═════════════════════════════════════════════════════════════

    /// @notice Register or change your gsHandle.
    ///         First registration is free. Changes cost handleChangeFee.
    /// @param handle The desired handle (case-preserved, uniqueness is case-insensitive)
    function setHandle(string calldata handle) external payable {
        require(bytes(handle).length >= 3, "Handle too short");
        require(bytes(handle).length <= 32, "Handle too long");
        require(_isValidHandle(handle), "Invalid characters");

        bytes32 handleHash = keccak256(abi.encodePacked(_toLower(handle)));
        address existingOwner = handleOwner[handleHash];
        require(existingOwner == address(0) || existingOwner == msg.sender, "Handle taken");

        // First registration is free, changes cost a fee
        if (hasRegisteredHandle[msg.sender]) {
            require(msg.value >= handleChangeFee, "Insufficient fee for handle change");
            unchecked { totalFeesCollected += msg.value; }
        }

        // Release old handle
        string memory oldHandle = gsHandleOf[msg.sender];
        if (bytes(oldHandle).length > 0) {
            bytes32 oldHash = keccak256(abi.encodePacked(_toLower(oldHandle)));
            delete handleOwner[oldHash];
            emit HandleChanged(msg.sender, oldHandle, handle);
        } else {
            emit HandleRegistered(msg.sender, handle);
        }

        // Claim new handle
        gsHandleOf[msg.sender] = handle;
        handleOwner[handleHash] = msg.sender;
        hasRegisteredHandle[msg.sender] = true;
    }

    /// @notice Look up who owns a handle (case-insensitive)
    function resolveHandle(string calldata handle) external view returns (address) {
        bytes32 handleHash = keccak256(abi.encodePacked(_toLower(handle)));
        return handleOwner[handleHash];
    }

    // ═════════════════════════════════════════════════════════════
    // PORTFOLIO: Multi-wallet registry
    // ═════════════════════════════════════════════════════════════

    /// @notice Add a wallet to your portfolio.
    ///         Only the primary wallet (msg.sender) can add wallets to their portfolio.
    /// @param wallet The wallet address to add
    /// @param status The claim status (VERIFIED or SELF_REPORTED; PRIMARY is auto-set)
    function addWallet(address wallet, WalletStatus status) external {
        _addWallet(wallet, status);
    }

    /// @notice Remove a wallet from your portfolio
    function removeWallet(address wallet) external {
        _removeWallet(wallet);
    }

    /// @notice Batch add wallets to your portfolio (one tx instead of N)
    function batchAddWallets(address[] calldata wallets, WalletStatus[] calldata statuses) external {
        require(wallets.length == statuses.length, "Length mismatch");
        for (uint256 i = 0; i < wallets.length; i++) {
            _addWallet(wallets[i], statuses[i]);
        }
    }

    /// @notice Batch remove wallets from your portfolio
    function batchRemoveWallets(address[] calldata wallets) external {
        for (uint256 i = 0; i < wallets.length; i++) {
            _removeWallet(wallets[i]);
        }
    }

    /// @notice Verified wallet takes over a self-reported claim from another user.
    ///         Caller must prove ownership (verification happens off-chain, status passed in).
    ///         Only works when the existing claim is SELF_REPORTED.
    function takeoverWallet(address wallet, address fromPrimary) external {
        require(primaryOf[wallet] == fromPrimary, "Wallet not claimed by fromPrimary");

        // Find and verify the existing claim is SELF_REPORTED
        PortfolioWallet[] storage fromWallets = _portfolioWallets[fromPrimary];
        bool found = false;
        for (uint256 i = 0; i < fromWallets.length; i++) {
            if (fromWallets[i].addr == wallet) {
                require(fromWallets[i].status == WalletStatus.SELF_REPORTED, "Cannot take over verified wallet");
                // Remove from old owner
                fromWallets[i] = fromWallets[fromWallets.length - 1];
                fromWallets.pop();
                found = true;
                break;
            }
        }
        require(found, "Wallet not found");

        // Add to new owner as VERIFIED
        _portfolioWallets[msg.sender].push(PortfolioWallet({
            addr: wallet,
            status: WalletStatus.VERIFIED,
            addedAt: uint48(block.timestamp)
        }));
        primaryOf[wallet] = msg.sender;

        emit WalletRemoved(fromPrimary, wallet);
        emit WalletAdded(msg.sender, wallet, WalletStatus.VERIFIED);
    }

    /// @notice Get all wallets in a portfolio
    function getPortfolioWallets(address primary) external view returns (PortfolioWallet[] memory) {
        return _portfolioWallets[primary];
    }

    /// @notice Get count of wallets in a portfolio
    function getPortfolioWalletCount(address primary) external view returns (uint256) {
        return _portfolioWallets[primary].length;
    }

    // ═════════════════════════════════════════════════════════════
    // ATTESTATION (V1 — unchanged)
    // ═════════════════════════════════════════════════════════════

    /// @notice Create an on-chain attestation of a portfolio's holdings.
    function attest(
        address wallet,
        uint256 blockNumber,
        bytes32 merkleRoot,
        uint256 totalValueGun,
        uint16  itemCount,
        string calldata metadataURI
    ) external payable returns (uint256 attestationId) {
        require(wallet != address(0), "Zero wallet");
        require(msg.value >= attestFee, "Insufficient fee");
        require(blockNumber <= block.number, "Future block");
        require(merkleRoot != bytes32(0), "Empty merkle root");
        require(bytes(metadataURI).length > 0, "Empty metadata URI");

        attestationId = _attestations[wallet].length;

        _attestations[wallet].push(Attestation({
            blockNumber: blockNumber,
            merkleRoot: merkleRoot,
            totalValueGun: totalValueGun,
            itemCount: itemCount,
            timestamp: uint48(block.timestamp),
            metadataURI: metadataURI
        }));

        unchecked {
            totalAttestations++;
            totalFeesCollected += msg.value;
        }

        emit PortfolioAttested(
            wallet,
            attestationId,
            merkleRoot,
            totalValueGun,
            itemCount,
            blockNumber,
            metadataURI
        );
    }

    function getAttestationCount(address wallet) external view returns (uint256) {
        return _attestations[wallet].length;
    }

    function getAttestation(address wallet, uint256 index) external view returns (Attestation memory) {
        require(index < _attestations[wallet].length, "Index out of bounds");
        return _attestations[wallet][index];
    }

    function getLatestAttestation(address wallet) external view returns (Attestation memory) {
        uint256 count = _attestations[wallet].length;
        require(count > 0, "No attestations");
        return _attestations[wallet][count - 1];
    }

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

    // ── Owner Functions ─────────────────────────────────────────

    function setFee(uint256 newFee) external onlyOwner {
        emit FeeUpdated(attestFee, newFee);
        attestFee = newFee;
    }

    function setHandleChangeFee(uint256 newFee) external onlyOwner {
        emit HandleFeeUpdated(handleChangeFee, newFee);
        handleChangeFee = newFee;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        (bool ok, ) = owner.call{value: balance}("");
        require(ok, "Transfer failed");
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ── Internal Helpers ────────────────────────────────────────

    function _addWallet(address wallet, WalletStatus status) internal {
        require(wallet != address(0), "Zero address");
        require(status == WalletStatus.VERIFIED || status == WalletStatus.SELF_REPORTED, "Invalid status");
        require(primaryOf[wallet] == address(0) || primaryOf[wallet] == msg.sender, "Wallet claimed by another user");

        // If wallet is already in our portfolio, just update status
        PortfolioWallet[] storage wallets = _portfolioWallets[msg.sender];
        for (uint256 i = 0; i < wallets.length; i++) {
            if (wallets[i].addr == wallet) {
                WalletStatus oldStatus = wallets[i].status;
                // Can only upgrade: SELF_REPORTED -> VERIFIED, never downgrade
                require(uint8(status) < uint8(oldStatus), "Cannot downgrade status");
                wallets[i].status = status;
                emit WalletUpgraded(msg.sender, wallet, oldStatus, status);
                return;
            }
        }

        // New wallet — add it
        wallets.push(PortfolioWallet({
            addr: wallet,
            status: status,
            addedAt: uint48(block.timestamp)
        }));
        primaryOf[wallet] = msg.sender;

        emit WalletAdded(msg.sender, wallet, status);
    }

    function _removeWallet(address wallet) internal {
        PortfolioWallet[] storage wallets = _portfolioWallets[msg.sender];
        uint256 len = wallets.length;

        for (uint256 i = 0; i < len; i++) {
            if (wallets[i].addr == wallet) {
                // Swap-and-pop removal
                wallets[i] = wallets[len - 1];
                wallets.pop();
                delete primaryOf[wallet];
                emit WalletRemoved(msg.sender, wallet);
                return;
            }
        }
        revert("Wallet not in portfolio");
    }

    /// @dev Validate handle: alphanumeric, underscores, hyphens only
    function _isValidHandle(string memory handle) internal pure returns (bool) {
        bytes memory b = bytes(handle);
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (
                !(c >= 0x30 && c <= 0x39) && // 0-9
                !(c >= 0x41 && c <= 0x5A) && // A-Z
                !(c >= 0x61 && c <= 0x7A) && // a-z
                c != 0x5F &&                  // _
                c != 0x2D                     // -
            ) {
                return false;
            }
        }
        return true;
    }

    /// @dev Convert string to lowercase for case-insensitive comparison
    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory b = bytes(str);
        bytes memory lower = new bytes(b.length);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) {
                lower[i] = bytes1(uint8(b[i]) + 32);
            } else {
                lower[i] = b[i];
            }
        }
        return string(lower);
    }
}
