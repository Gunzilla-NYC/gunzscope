import { ethers } from 'ethers';

export type NetworkEnvironment = 'mainnet' | 'testnet' | 'unknown';

export interface NetworkInfo {
  environment: NetworkEnvironment;
  chainId: number;
  name: string;
  explorerUrl: string;
}

// Known network configurations
const KNOWN_NETWORKS: Record<number, NetworkInfo> = {
  43419: {
    environment: 'mainnet',
    chainId: 43419,
    name: 'GunzChain Mainnet',
    explorerUrl: 'https://gunzscan.io',
  },
  49321: {
    environment: 'testnet',
    chainId: 49321,
    name: 'GunzChain Testnet',
    explorerUrl: 'https://testnet.gunzscan.io',
  },
};

/**
 * Detects which GunzChain network (mainnet/testnet) a wallet address is on
 * based on the RPC endpoint and chain ID
 */
export class NetworkDetector {
  private provider: ethers.JsonRpcProvider;

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Get the network information from the RPC endpoint
   */
  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      // Check if we know this network
      if (KNOWN_NETWORKS[chainId]) {
        return KNOWN_NETWORKS[chainId];
      }

      // Detect from RPC URL pattern
      const rpcUrl = this.provider._getConnection().url;

      if (rpcUrl.includes('testnet')) {
        return {
          environment: 'testnet',
          chainId,
          name: 'GunzChain Testnet',
          explorerUrl: 'https://testnet.gunzscan.io',
        };
      }

      if (rpcUrl.includes('gunzchain.io') || rpcUrl.includes('gunzscan.io')) {
        return {
          environment: 'mainnet',
          chainId,
          name: 'GunzChain Mainnet',
          explorerUrl: 'https://gunzscan.io',
        };
      }

      return {
        environment: 'unknown',
        chainId,
        name: 'Unknown Network',
        explorerUrl: '',
      };
    } catch (error) {
      console.error('Error detecting network:', error);
      return {
        environment: 'unknown',
        chainId: 0,
        name: 'Unknown Network',
        explorerUrl: '',
      };
    }
  }

  /**
   * Detect if an address is an in-game wallet vs external wallet
   * This is heuristic-based since we can't definitively know without game API
   */
  async detectWalletType(address: string): Promise<'in-game' | 'external' | 'unknown'> {
    try {
      // Check transaction history to make educated guess
      const txCount = await this.provider.getTransactionCount(address);
      const balance = await this.provider.getBalance(address);

      // Heuristics (these are guesses and would need refinement):
      // 1. Very few transactions + balance > 0 = likely in-game (player hasn't moved assets out)
      // 2. Many transactions = likely external wallet being actively used

      if (txCount === 0 && balance > BigInt(0)) {
        // Likely a fresh in-game wallet that received tokens but hasn't transacted
        return 'in-game';
      }

      if (txCount > 10) {
        // Active wallet, likely external/MetaMask
        return 'external';
      }

      // Can't determine
      return 'unknown';
    } catch (error) {
      console.error('Error detecting wallet type:', error);
      return 'unknown';
    }
  }

  /**
   * Get comprehensive wallet environment info
   */
  async getWalletEnvironment(address: string): Promise<{
    network: NetworkInfo;
    walletType: 'in-game' | 'external' | 'unknown';
    txCount: number;
  }> {
    const [network, walletType, txCount] = await Promise.all([
      this.getNetworkInfo(),
      this.detectWalletType(address),
      this.provider.getTransactionCount(address).catch(() => 0),
    ]);

    return {
      network,
      walletType,
      txCount,
    };
  }
}

/**
 * Quick helper to detect network from RPC URL
 */
export function detectNetworkFromRPC(rpcUrl: string): NetworkEnvironment {
  if (rpcUrl.includes('testnet')) {
    return 'testnet';
  }
  if (rpcUrl.includes('gunzchain.io') || rpcUrl.includes('gunzscan.io')) {
    return 'mainnet';
  }
  return 'unknown';
}

/**
 * Format network badge display
 */
export function getNetworkBadge(environment: NetworkEnvironment): {
  text: string;
  color: string;
  bgColor: string;
} {
  switch (environment) {
    case 'mainnet':
      return {
        text: 'Mainnet',
        color: 'text-green-800',
        bgColor: 'bg-green-100',
      };
    case 'testnet':
      return {
        text: 'Testnet',
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-100',
      };
    default:
      return {
        text: 'Unknown',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100',
      };
  }
}

/**
 * Format wallet type badge display
 */
export function getWalletTypeBadge(walletType: 'in-game' | 'external' | 'unknown'): {
  text: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  switch (walletType) {
    case 'in-game':
      return {
        text: 'In-Game Wallet',
        color: 'text-purple-800',
        bgColor: 'bg-purple-100',
        icon: '🎮',
      };
    case 'external':
      return {
        text: 'External Wallet',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        icon: '💼',
      };
    default:
      return {
        text: 'Unknown',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100',
        icon: '❓',
      };
  }
}
