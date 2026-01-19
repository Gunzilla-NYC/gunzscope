import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TokenBalance, NFT } from '../types';

export class SolanaService {
  private connection: Connection;

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getGunTokenBalance(walletAddress: string): Promise<TokenBalance | null> {
    try {
      const gunTokenMint = process.env.NEXT_PUBLIC_GUN_TOKEN_SOLANA;

      if (!gunTokenMint || gunTokenMint.includes('Your')) {
        console.warn('GUN token mint address not configured for Solana');
        return null;
      }

      // Validate Solana address format before attempting to create PublicKey
      if (!walletAddress || walletAddress.startsWith('0x')) {
        console.log('Invalid Solana address format (appears to be EVM address)');
        return null;
      }

      const walletPublicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(gunTokenMint);

      // Get all token accounts for the wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      // Find the GUN token account
      const gunTokenAccount = tokenAccounts.value.find((accountInfo) => {
        const parsedData = accountInfo.account.data as ParsedAccountData;
        return parsedData.parsed.info.mint === gunTokenMint;
      });

      if (!gunTokenAccount) {
        return {
          balance: 0,
          decimals: 9,
          symbol: 'GUN',
        };
      }

      const parsedData = gunTokenAccount.account.data as ParsedAccountData;
      const balance = parsedData.parsed.info.tokenAmount.uiAmount;
      const decimals = parsedData.parsed.info.tokenAmount.decimals;

      return {
        balance: balance || 0,
        decimals,
        symbol: 'GUN',
      };
    } catch (error) {
      console.error('Error fetching Solana GUN token balance:', error);
      return null;
    }
  }

  async getNFTs(walletAddress: string): Promise<NFT[]> {
    try {
      // Validate Solana address format
      if (!walletAddress || walletAddress.startsWith('0x')) {
        console.log('Invalid Solana address format for NFT query');
        return [];
      }

      const walletPublicKey = new PublicKey(walletAddress);

      // Get all token accounts (including NFTs which are tokens with amount = 1 and decimals = 0)
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const nfts: NFT[] = [];

      for (const accountInfo of tokenAccounts.value) {
        const parsedData = accountInfo.account.data as ParsedAccountData;
        const tokenAmount = parsedData.parsed.info.tokenAmount;

        // NFTs typically have decimals = 0 and amount = 1
        if (tokenAmount.decimals === 0 && tokenAmount.uiAmount === 1) {
          const mintAddress = parsedData.parsed.info.mint;

          try {
            // Fetch metadata (this is simplified - real implementation would use Metaplex)
            const nft: NFT = {
              tokenId: mintAddress,
              name: `NFT ${mintAddress.slice(0, 8)}...`,
              image: '',
              collection: 'Solana NFT Collection',
              chain: 'solana',
            };

            // In production, you'd want to use the Metaplex SDK to fetch proper metadata
            // For now, we'll add a placeholder
            nfts.push(nft);
          } catch (error) {
            console.error(`Error fetching NFT metadata for ${mintAddress}:`, error);
          }
        }
      }

      return nfts;
    } catch (error) {
      console.error('Error fetching Solana NFTs:', error);
      return [];
    }
  }

  async getSolBalance(walletAddress: string): Promise<number> {
    try {
      if (!walletAddress || walletAddress.startsWith('0x')) {
        return 0;
      }
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return 0;
    }
  }

  async getTokenAccounts(walletAddress: string): Promise<any[]> {
    try {
      if (!walletAddress || walletAddress.startsWith('0x')) {
        return [];
      }
      const walletPublicKey = new PublicKey(walletAddress);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      return tokenAccounts.value.map((accountInfo) => {
        const parsedData = accountInfo.account.data as ParsedAccountData;
        return {
          mint: parsedData.parsed.info.mint,
          amount: parsedData.parsed.info.tokenAmount.uiAmount,
          decimals: parsedData.parsed.info.tokenAmount.decimals,
        };
      });
    } catch (error) {
      console.error('Error fetching token accounts:', error);
      return [];
    }
  }
}
