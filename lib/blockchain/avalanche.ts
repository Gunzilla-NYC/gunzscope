import { ethers } from 'ethers';
import { TokenBalance, NFT, NFTPageResult, AcquisitionVenue } from '../types';

// =============================================================================
// Contract Deployment Block Configuration
// =============================================================================
// Hardcoded deployment start blocks for known contracts to avoid scanning from block 0.
// Key format: `${chainId}:${contractAddress.toLowerCase()}`
// These values should be the block number where the contract was deployed (or slightly before).

const DEPLOYMENT_START_BLOCKS: Record<string, number> = {
  // GunzChain (chainId: 43419) - Off The Grid NFT Collection
  // Contract: 0x9ed98e159be43a8d42b64053831fcae5e4d7d271
  // Deployed around block 1,000,000 - adjust if needed based on actual deployment
  '43419:0x9ed98e159be43a8d42b64053831fcae5e4d7d271': 1_000_000,

  // Avalanche C-Chain (chainId: 43114) - placeholder for future contracts
  // '43114:0x...': 30_000_000,
};

// Fallback: look back ~6 months instead of 2 years for unknown contracts
const DEFAULT_LOOKBACK_BLOCKS = Math.floor((6 * 30 * 24 * 60 * 60) / 2); // ~6 months at 2 sec/block

// Debug logging flag
const DEBUG_ACQUISITION = process.env.NODE_ENV !== 'production';

// =============================================================================
// Venue Classification Constants
// =============================================================================

// Known Seaport fulfill selectors (OpenSea)
const SEAPORT_SELECTORS = new Set([
  '0xfb0f3ee1', // fulfillBasicOrder
  '0x87201b41', // fulfillBasicOrder_efficient_6GL6yc
  '0xb3a34c4c', // fulfillOrder
  '0xe7acab24', // fulfillAvailableOrders
  '0xed98a574', // fulfillAvailableAdvancedOrders
  '0xf2d12b12', // matchOrders
  '0x88147732', // matchAdvancedOrders
]);

// Known OTG Marketplace selector
const OTG_MARKETPLACE_SELECTOR = '0xdc2e6be8';

// Known Decoder selectors (add more as discovered)
const DECODER_SELECTORS = new Set([
  '0x00000000', // placeholder - add actual decoder selectors
]);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize an Ethereum address to lowercase with 0x prefix
 */
function normalizeAddr(addr: string | null | undefined): string {
  if (!addr) return '';
  return addr.toLowerCase().startsWith('0x') ? addr.toLowerCase() : `0x${addr.toLowerCase()}`;
}

/**
 * Extract the 4-byte function selector from transaction data
 */
function getSelector(data: string | null | undefined): string | null {
  if (!data || data.length < 10) return null;
  return data.slice(0, 10).toLowerCase();
}

/**
 * Parse a comma-separated list of contract addresses from env var
 */
function parseContractList(envVar: string | undefined): Set<string> {
  if (!envVar) return new Set();
  return new Set(
    envVar
      .split(',')
      .map((addr) => normalizeAddr(addr.trim()))
      .filter((addr) => addr.length > 0)
  );
}

/**
 * Compute net GUN outflow from a transaction receipt
 * Returns the net amount of GUN tokens sent FROM the wallet (outflow - inflow)
 */
function computeNetGunOutflowFromReceipt(
  receipt: ethers.TransactionReceipt,
  walletAddress: string,
  gunTokenAddress: string
): number {
  const walletLower = normalizeAddr(walletAddress);
  const gunLower = normalizeAddr(gunTokenAddress);
  const erc20TransferSig = ethers.id('Transfer(address,address,uint256)');

  let outflow = BigInt(0);
  let inflow = BigInt(0);

  for (const log of receipt.logs) {
    // Check if this is a GUN token Transfer event
    if (normalizeAddr(log.address) !== gunLower) continue;
    if (log.topics[0] !== erc20TransferSig) continue;
    if (log.topics.length < 3) continue;

    const from = normalizeAddr('0x' + log.topics[1].slice(26));
    const to = normalizeAddr('0x' + log.topics[2].slice(26));
    const value = BigInt(log.data);

    if (from === walletLower) {
      outflow += value;
    }
    if (to === walletLower) {
      inflow += value;
    }
  }

  const netOutflow = outflow > inflow ? outflow - inflow : BigInt(0);
  return parseFloat(ethers.formatUnits(netOutflow, 18));
}

// =============================================================================
// Types
// =============================================================================

export interface NFTHoldingAcquisition {
  owned: boolean;
  acquiredAtIso: string | null;
  txHash: string | null;
  venue: AcquisitionVenue;
  costGun: number;
  fromAddress?: string;
  isMint?: boolean;
  debug?: {
    txTo?: string;
    selector?: string;
    gunIsNative?: boolean;
    matchedRule?: string;
  };
}

/**
 * Get the starting block for transfer event queries.
 * Uses hardcoded deployment blocks for known contracts, falls back to recent history.
 */
function getQueryStartBlock(
  chainId: number,
  contractAddress: string,
  currentBlock: number
): number {
  const key = `${chainId}:${contractAddress.toLowerCase()}`;
  const deploymentBlock = DEPLOYMENT_START_BLOCKS[key];

  if (deploymentBlock !== undefined) {
    return deploymentBlock;
  }

  // Fallback: look back a reasonable amount instead of from genesis
  return Math.max(0, currentBlock - DEFAULT_LOOKBACK_BLOCKS);
}

// ERC-20 ABI for token balance queries
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// ERC-721 ABI for NFT queries
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

// ERC-1155 ABI for multi-token queries
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
];

export class AvalancheService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async getGunTokenBalance(walletAddress: string): Promise<TokenBalance | null> {
    try {
      const tokenAddress = process.env.NEXT_PUBLIC_GUN_TOKEN_AVALANCHE;

      if (!tokenAddress || tokenAddress.includes('Your')) {
        console.warn('GUN token contract address not configured for Avalanche');
        return null;
      }

      // Check if this is a native token (no contract code) or ERC-20
      const code = await this.provider.getCode(tokenAddress);

      if (code === '0x') {
        // Native token - get balance directly from wallet
        console.log('GUN is native token on GunzChain, fetching native balance');
        const balance = await this.provider.getBalance(walletAddress);
        const formattedBalance = parseFloat(ethers.formatEther(balance));

        return {
          balance: formattedBalance,
          decimals: 18,
          symbol: 'GUN',
        };
      } else {
        // ERC-20 token - use contract
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);

        const [balance, decimals, symbol] = await Promise.all([
          contract.balanceOf(walletAddress),
          contract.decimals(),
          contract.symbol(),
        ]);

        const formattedBalance = parseFloat(ethers.formatUnits(balance, decimals));

        return {
          balance: formattedBalance,
          decimals: Number(decimals),
          symbol,
        };
      }
    } catch (error) {
      console.error('Error fetching Avalanche GUN token balance:', error);
      return null;
    }
  }

  /**
   * Get NFTs with pagination support
   * @param walletAddress - Wallet address to query
   * @param startIndex - Starting index (default 0)
   * @param pageSize - Number of NFTs to fetch (default 50)
   * @returns NFTPageResult with nfts, totalCount, and pagination info
   */
  async getNFTsPaginated(
    walletAddress: string,
    startIndex: number = 0,
    pageSize: number = 50
  ): Promise<NFTPageResult> {
    try {
      const nftContractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE;

      if (!nftContractAddress || nftContractAddress.includes('Your')) {
        console.warn('NFT collection address not configured for Avalanche');
        return { nfts: [], totalCount: 0, startIndex, pageSize, hasMore: false };
      }

      const contract = new ethers.Contract(nftContractAddress, ERC721_ABI, this.provider);
      const balance = await contract.balanceOf(walletAddress);
      const totalCount = Number(balance);

      if (totalCount === 0 || startIndex >= totalCount) {
        return { nfts: [], totalCount, startIndex, pageSize, hasMore: false };
      }

      const nfts: NFT[] = [];
      const endIndex = Math.min(startIndex + pageSize, totalCount);

      // Fetch NFT details for each token in the page range
      for (let i = startIndex; i < endIndex; i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
          const tokenURI = await contract.tokenURI(tokenId);

          // Fetch metadata from tokenURI
          let metadata: any = {};
          try {
            if (tokenURI.startsWith('http')) {
              const response = await fetch(tokenURI);
              metadata = await response.json();
            } else if (tokenURI.startsWith('ipfs://')) {
              const ipfsUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
              const response = await fetch(ipfsUrl);
              metadata = await response.json();
            }
          } catch (metadataError) {
            console.warn(`Failed to fetch metadata for token ${tokenId}:`, metadataError);
          }

          // Process traits and extract mint number
          const traits = metadata.attributes?.reduce((acc: any, attr: any) => {
            acc[attr.trait_type] = attr.value;
            return acc;
          }, {});

          // Extract mint number from traits (check various possible trait names)
          const mintNumber = traits?.['Mint Number'] ||
                            traits?.['MINT_NUMBER'] ||
                            traits?.['Serial Number'] ||
                            traits?.['SERIAL_NUMBER'] ||
                            traits?.['Serial Number'] ||
                            traits?.['serialNumber'];

          nfts.push({
            tokenId: tokenId.toString(),
            mintNumber: mintNumber?.toString(),
            name: metadata.name || `NFT #${tokenId}`,
            image: metadata.image?.replace('ipfs://', 'https://ipfs.io/ipfs/') || '',
            collection: 'Off The Grid NFT Collection',
            chain: 'avalanche',
            traits,
          });
        } catch (error) {
          console.error(`Error fetching NFT at index ${i}:`, error);
        }
      }

      return {
        nfts,
        totalCount,
        startIndex,
        pageSize,
        hasMore: endIndex < totalCount,
      };
    } catch (error) {
      console.error('Error fetching Avalanche NFTs:', error);
      return { nfts: [], totalCount: 0, startIndex, pageSize, hasMore: false };
    }
  }

  /**
   * @deprecated Use getNFTsPaginated instead for proper pagination
   * Legacy method that returns first 50 NFTs (for backward compatibility)
   */
  async getNFTs(walletAddress: string): Promise<NFT[]> {
    const result = await this.getNFTsPaginated(walletAddress, 0, 50);
    return result.nfts;
  }

  async getAvaxBalance(walletAddress: string): Promise<number> {
    try {
      const balance = await this.provider.getBalance(walletAddress);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error fetching AVAX balance:', error);
      return 0;
    }
  }

  /**
   * Query transfer events in chunks to handle large block ranges
   * Returns all logs sorted by (blockNumber, logIndex)
   */
  private async queryLogsInChunks(
    filter: ethers.Filter,
    fromBlock: number,
    toBlock: number,
    chunkSize: number = 100000
  ): Promise<{ logs: ethers.Log[]; chunksQueried: number; blockRanges: Array<{ from: number; to: number; logsFound: number }> }> {
    const allLogs: ethers.Log[] = [];
    const blockRanges: Array<{ from: number; to: number; logsFound: number }> = [];
    let chunksQueried = 0;

    for (let start = fromBlock; start <= toBlock; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, toBlock);
      chunksQueried++;

      try {
        const logs = await this.provider.getLogs({
          ...filter,
          fromBlock: start,
          toBlock: end,
        });
        blockRanges.push({ from: start, to: end, logsFound: logs.length });
        allLogs.push(...logs);
      } catch (error) {
        // If chunk is too large, try smaller chunks
        if (chunkSize > 10000) {
          console.warn(`Chunk ${start}-${end} failed, retrying with smaller chunks`);
          const subResult = await this.queryLogsInChunks(filter, start, end, Math.floor(chunkSize / 4));
          blockRanges.push(...subResult.blockRanges);
          allLogs.push(...subResult.logs);
          chunksQueried += subResult.chunksQueried - 1;
        } else {
          console.error(`Failed to query logs for range ${start}-${end}:`, error);
          blockRanges.push({ from: start, to: end, logsFound: -1 });
        }
      }
    }

    // Sort by blockNumber, then logIndex
    allLogs.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      }
      return a.index - b.index;
    });

    return { logs: allLogs, chunksQueried, blockRanges };
  }

  /**
   * Get all Transfer events for a specific tokenId (any sender, any receiver)
   * Uses explicit topic encoding to ensure correct matching
   */
  async getTransferEvents(
    contractAddress: string,
    tokenId: string
  ): Promise<{
    events: Array<{
      from: string;
      to: string;
      tokenId: string;
      blockNumber: number;
      logIndex: number;
      transactionHash: string;
    }>;
    currentOwner: string | null;
    debugInfo: {
      fromBlock: number;
      toBlock: number;
      chunksQueried: number;
      totalLogsFound: number;
      blockRanges: Array<{ from: number; to: number; logsFound: number }>;
    };
  }> {
    const currentBlock = await this.provider.getBlockNumber();

    // Get chain ID for deployment block lookup
    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);

    // Use optimized start block based on contract deployment
    const fromBlock = getQueryStartBlock(chainId, contractAddress, currentBlock);

    // ERC-721 Transfer event signature: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const topic0 = ethers.id('Transfer(address,address,uint256)');

    // Encode tokenId as 32-byte hex (topic3 for ERC-721)
    const topic3 = ethers.zeroPadValue(ethers.toBeHex(BigInt(tokenId)), 32);

    const filter: ethers.Filter = {
      address: contractAddress,
      topics: [topic0, null, null, topic3], // [signature, from (any), to (any), tokenId]
    };

    console.log(`[getTransferEvents] Querying transfers for tokenId=${tokenId}`);
    console.log(`[getTransferEvents] Chain: ${chainId}, Block range: ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)`);
    console.log(`[getTransferEvents] Filter topics:`, { topic0, topic3 });

    const { logs, chunksQueried, blockRanges } = await this.queryLogsInChunks(filter, fromBlock, currentBlock);

    console.log(`[getTransferEvents] Found ${logs.length} transfer events`);

    // Parse logs into structured events
    const events = logs.map((log) => ({
      from: '0x' + log.topics[1].slice(26).toLowerCase(),
      to: '0x' + log.topics[2].slice(26).toLowerCase(),
      tokenId: BigInt(log.topics[3]).toString(),
      blockNumber: log.blockNumber,
      logIndex: log.index,
      transactionHash: log.transactionHash,
    }));

    // Derive currentOwner from the last transfer's "to" address
    const currentOwner = events.length > 0 ? events[events.length - 1].to : null;

    return {
      events,
      currentOwner,
      debugInfo: {
        fromBlock,
        toBlock: currentBlock,
        chunksQueried,
        totalLogsFound: logs.length,
        blockRanges,
      },
    };
  }

  /**
   * @deprecated Use getNFTHoldingAcquisition for current holding details.
   *
   * This legacy method returns the ORIGINAL/FIRST acquisition (when wallet first received the token).
   * For current holding acquisition (most recent inbound transfer), use getNFTHoldingAcquisition instead.
   *
   * Key difference:
   * - getNFTTransferHistory: Returns FIRST incoming transfer (original acquisition)
   * - getNFTHoldingAcquisition: Returns MOST RECENT incoming transfer (current holding)
   *
   * If a user sold and re-bought an NFT, this method returns the original purchase,
   * while getNFTHoldingAcquisition returns the re-purchase.
   */
  async getNFTTransferHistory(
    contractAddress: string,
    tokenId: string,
    walletAddress: string
  ): Promise<{
    purchasePriceGun: number;
    purchaseDate?: Date;
    transferredFrom?: string;
    isFreeTransfer?: boolean;
    debugInfo?: {
      fromBlock: number;
      toBlock: number;
      chunksQueried: number;
      totalLogsFound: number;
      currentOwner: string | null;
    };
  } | null> {
    try {
      // Use new robust getTransferEvents method
      const { events, currentOwner, debugInfo } = await this.getTransferEvents(contractAddress, tokenId);

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTTransferHistory] tokenId=${tokenId}, wallet=${walletAddress}`);
        console.log(`[getNFTTransferHistory] Found ${events.length} total transfer events, currentOwner=${currentOwner}`);
      }

      if (events.length === 0) {
        return {
          purchasePriceGun: 0,
          isFreeTransfer: true,
          debugInfo: {
            ...debugInfo,
            currentOwner,
          },
        };
      }

      // Find transfers where this wallet received the token
      const walletLower = walletAddress.toLowerCase();
      const incomingTransfers = events.filter((e) => e.to === walletLower);

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTTransferHistory] Incoming transfers to wallet: ${incomingTransfers.length}`);
      }

      if (incomingTransfers.length === 0) {
        // Wallet doesn't own this token based on transfer history
        return {
          purchasePriceGun: 0,
          isFreeTransfer: true,
          debugInfo: {
            ...debugInfo,
            currentOwner,
          },
        };
      }

      // Get the FIRST transfer to this wallet (original acquisition)
      const firstIncoming = incomingTransfers[0];
      const isFromZeroAddress = firstIncoming.from === '0x0000000000000000000000000000000000000000';

      // Fetch block and transaction details
      const block = await this.provider.getBlock(firstIncoming.blockNumber);
      const txReceipt = await this.provider.getTransactionReceipt(firstIncoming.transactionHash);
      const transaction = await this.provider.getTransaction(firstIncoming.transactionHash);

      if (DEBUG_ACQUISITION) {
        console.log('[getNFTTransferHistory] First incoming transfer:', {
          hash: firstIncoming.transactionHash,
          from: firstIncoming.from,
          to: firstIncoming.to,
          blockNumber: firstIncoming.blockNumber,
          isFromZeroAddress,
        });
      }

      // Look for GUN token transfers in the transaction receipt
      let purchasePriceGun: number | undefined;

      // ERC-20 Transfer event signature
      const erc20TransferSignature = ethers.id('Transfer(address,address,uint256)');
      const gunTokenAddress = process.env.NEXT_PUBLIC_GUN_TOKEN_AVALANCHE?.toLowerCase();

      if (txReceipt && txReceipt.logs) {
        for (const log of txReceipt.logs) {
          // Check if this is an ERC-20 Transfer event (only 3 topics for non-indexed value)
          if (log.topics[0] === erc20TransferSignature && log.topics.length === 3) {
            // Check if this transfer is FROM the wallet (payment)
            const fromAddress = '0x' + log.topics[1].slice(26).toLowerCase();

            if (fromAddress === walletLower) {
              // Decode the transfer amount (value is in the data field for ERC-20)
              const value = BigInt(log.data);
              // Assume 18 decimals for GUN token
              const amount = parseFloat(ethers.formatUnits(value, 18));

              if (DEBUG_ACQUISITION) {
                console.log(`[getNFTTransferHistory] Found outgoing ERC-20 transfer: ${amount} tokens from ${log.address}`);
              }

              // If this is from the GUN token contract, use this as purchase price
              if (gunTokenAddress && log.address.toLowerCase() === gunTokenAddress) {
                purchasePriceGun = amount;
                if (DEBUG_ACQUISITION) {
                  console.log(`[getNFTTransferHistory] GUN token purchase detected: ${purchasePriceGun} GUN`);
                }
              } else if (purchasePriceGun === undefined) {
                // Use first outgoing token transfer as purchase price if we don't have GUN specifically
                purchasePriceGun = amount;
                if (DEBUG_ACQUISITION) {
                  console.log(`[getNFTTransferHistory] Token purchase detected from ${log.address}: ${amount} tokens`);
                }
              }
            }
          }
        }
      }

      // If no ERC-20 transfer found, check native transaction value
      // On GunzChain, native token is GUN
      if (purchasePriceGun === undefined && transaction && transaction.value > BigInt(0)) {
        purchasePriceGun = parseFloat(ethers.formatEther(transaction.value));
        if (DEBUG_ACQUISITION) {
          console.log(`[getNFTTransferHistory] Native GUN payment detected: ${purchasePriceGun} GUN`);
        }
      }

      // Determine if this was a free transfer (no payment detected)
      const isFreeTransfer = purchasePriceGun === undefined || purchasePriceGun === 0;

      return {
        purchasePriceGun: purchasePriceGun ?? 0,
        purchaseDate: block ? new Date(block.timestamp * 1000) : undefined,
        transferredFrom: isFreeTransfer && !isFromZeroAddress ? firstIncoming.from : undefined,
        isFreeTransfer,
        debugInfo: {
          ...debugInfo,
          currentOwner,
        },
      };
    } catch (error) {
      console.error('Error fetching NFT transfer history:', error);
      return null;
    }
  }

  async detectNFTQuantity(
    contractAddress: string,
    tokenId: string,
    walletAddress: string
  ): Promise<number> {
    try {
      // Try ERC-1155 first (supports multiple quantities)
      const erc1155Contract = new ethers.Contract(contractAddress, ERC1155_ABI, this.provider);

      try {
        const quantity = await erc1155Contract.balanceOf(walletAddress, tokenId);
        return Number(quantity);
      } catch {
        // Not ERC-1155 or method doesn't exist, assume ERC-721 (quantity = 1)
        return 1;
      }
    } catch (error) {
      console.error('Error detecting NFT quantity:', error);
      return 1;
    }
  }

  /**
   * Check if GUN is native token (no contract code) or ERC-20
   * Caches result for efficiency
   */
  private gunIsNativeCache: boolean | null = null;
  private async isGunNative(): Promise<boolean> {
    if (this.gunIsNativeCache !== null) return this.gunIsNativeCache;

    const tokenAddress = process.env.NEXT_PUBLIC_GUN_TOKEN_AVALANCHE;
    if (!tokenAddress || tokenAddress.includes('Your')) {
      // Assume native if not configured
      this.gunIsNativeCache = true;
      return true;
    }

    try {
      const code = await this.provider.getCode(tokenAddress);
      this.gunIsNativeCache = code === '0x';
      return this.gunIsNativeCache;
    } catch {
      this.gunIsNativeCache = true;
      return true;
    }
  }

  /**
   * Classify the acquisition venue based on transaction context
   */
  private classifyVenue(
    txTo: string | null,
    selector: string | null,
    fromAddress: string
  ): { venue: AcquisitionVenue; matchedRule: string } {
    const txToLower = normalizeAddr(txTo);

    // Check for mint (from zero address)
    if (fromAddress === '0x0000000000000000000000000000000000000000') {
      return { venue: 'mint', matchedRule: 'from_zero_address' };
    }

    // 1. Decoder contract check
    const decoderContract = normalizeAddr(process.env.NEXT_PUBLIC_OTG_DECODER_CONTRACT);
    if (decoderContract && txToLower === decoderContract) {
      return { venue: 'decoder', matchedRule: 'decoder_contract_match' };
    }
    if (selector && DECODER_SELECTORS.has(selector)) {
      return { venue: 'decoder', matchedRule: 'decoder_selector_match' };
    }

    // 2. OTG Marketplace check
    const marketplaceContract = normalizeAddr(process.env.NEXT_PUBLIC_OTG_MARKETPLACE_CONTRACT);
    if (marketplaceContract && txToLower === marketplaceContract) {
      return { venue: 'otg_marketplace', matchedRule: 'marketplace_contract_match' };
    }
    if (selector === OTG_MARKETPLACE_SELECTOR) {
      return { venue: 'otg_marketplace', matchedRule: 'marketplace_selector_match' };
    }

    // 3. OpenSea / Seaport check
    const openseaContracts = parseContractList(process.env.NEXT_PUBLIC_OPENSEA_CONTRACTS);
    if (openseaContracts.has(txToLower)) {
      return { venue: 'opensea', matchedRule: 'opensea_contract_match' };
    }
    if (selector && SEAPORT_SELECTORS.has(selector)) {
      return { venue: 'opensea', matchedRule: 'seaport_selector_match' };
    }

    // 4. Default to transfer if we have tx.to, otherwise unknown
    if (txTo) {
      return { venue: 'transfer', matchedRule: 'default_transfer' };
    }

    return { venue: 'unknown', matchedRule: 'no_tx_to' };
  }

  /**
   * Get acquisition details for a CURRENTLY OWNED NFT
   * Returns the most recent inbound transfer (current holding acquisition)
   *
   * @param contractAddress - NFT contract address
   * @param tokenId - Token ID
   * @param walletAddress - Wallet address to check ownership for
   * @returns Acquisition details or null if not owned
   */
  async getNFTHoldingAcquisition(
    contractAddress: string,
    tokenId: string,
    walletAddress: string
  ): Promise<NFTHoldingAcquisition | null> {
    try {
      const walletLower = normalizeAddr(walletAddress);

      // Get all transfer events for this token
      const { events, currentOwner } = await this.getTransferEvents(contractAddress, tokenId);

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTHoldingAcquisition] tokenId=${tokenId}, wallet=${walletLower}`);
        console.log(`[getNFTHoldingAcquisition] currentOwner=${currentOwner}, events=${events.length}`);
      }

      // Verify wallet is current owner
      if (normalizeAddr(currentOwner) !== walletLower) {
        if (DEBUG_ACQUISITION) {
          console.log(`[getNFTHoldingAcquisition] Wallet is not current owner`);
        }
        return {
          owned: false,
          acquiredAtIso: null,
          txHash: null,
          venue: 'unknown',
          costGun: 0,
        };
      }

      // Find all inbound transfers to this wallet
      const incomingTransfers = events.filter((e) => normalizeAddr(e.to) === walletLower);

      if (incomingTransfers.length === 0) {
        if (DEBUG_ACQUISITION) {
          console.log(`[getNFTHoldingAcquisition] No incoming transfers found`);
        }
        return {
          owned: true,
          acquiredAtIso: null,
          txHash: null,
          venue: 'unknown',
          costGun: 0,
        };
      }

      // Get the MOST RECENT inbound transfer (current holding acquisition)
      const acquisitionEvent = incomingTransfers[incomingTransfers.length - 1];
      const isMint = acquisitionEvent.from === '0x0000000000000000000000000000000000000000';

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTHoldingAcquisition] Acquisition event:`, {
          txHash: acquisitionEvent.transactionHash,
          from: acquisitionEvent.from,
          block: acquisitionEvent.blockNumber,
          isMint,
        });
      }

      // Fetch transaction and block details
      const [tx, receipt, block] = await Promise.all([
        this.provider.getTransaction(acquisitionEvent.transactionHash),
        this.provider.getTransactionReceipt(acquisitionEvent.transactionHash),
        this.provider.getBlock(acquisitionEvent.blockNumber),
      ]);

      // Get acquisition timestamp
      const acquiredAtIso = block ? new Date(block.timestamp * 1000).toISOString() : null;

      // Extract tx context
      const txTo = tx?.to ?? null;
      const selector = getSelector(tx?.data);

      // Classify venue
      const { venue, matchedRule } = this.classifyVenue(txTo, selector, acquisitionEvent.from);

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTHoldingAcquisition] Venue classification:`, {
          txTo,
          selector,
          venue,
          matchedRule,
        });
      }

      // Compute cost in GUN
      let costGun = 0;
      const gunIsNative = await this.isGunNative();
      const gunTokenAddress = process.env.NEXT_PUBLIC_GUN_TOKEN_AVALANCHE;

      if (!gunIsNative && receipt && gunTokenAddress) {
        // ERC-20 GUN: compute net outflow from receipt logs
        costGun = computeNetGunOutflowFromReceipt(receipt, walletAddress, gunTokenAddress);

        if (DEBUG_ACQUISITION) {
          console.log(`[getNFTHoldingAcquisition] ERC-20 GUN outflow: ${costGun}`);
        }
      } else if (gunIsNative && tx) {
        // Native GUN: use tx.value if tx.from is the wallet
        const txFrom = normalizeAddr(tx.from);
        if (txFrom === walletLower && tx.value > BigInt(0)) {
          costGun = parseFloat(ethers.formatEther(tx.value));

          if (DEBUG_ACQUISITION) {
            console.log(`[getNFTHoldingAcquisition] Native GUN payment: ${costGun}`);
          }
        }
      }

      return {
        owned: true,
        acquiredAtIso,
        txHash: acquisitionEvent.transactionHash,
        venue,
        costGun,
        fromAddress: isMint ? undefined : acquisitionEvent.from,
        isMint,
        debug: DEBUG_ACQUISITION
          ? {
              txTo: txTo ?? undefined,
              selector: selector ?? undefined,
              gunIsNative,
              matchedRule,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[getNFTHoldingAcquisition] Error:', error);
      return null;
    }
  }

}
