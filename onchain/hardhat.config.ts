import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-ledger";

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = DEPLOYER_KEY ? [DEPLOYER_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    gunzchain: {
      url: "https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc",
      chainId: 43419,
      accounts,
    },
    gunzchainTestnet: {
      url: "https://rpc.gunz.dev/ext/bc/ryk9vkvNuKtewME2PeCgybo9sdWXGmCkBrrx4VPuZPdVdAak8/rpc",
      chainId: 49321,
      accounts,
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts,
      ledgerAccounts: [
        "0x8ABF795f22931DFb0D086693343F5f80571b488C",
      ],
      ledgerOptions: {
        derivationFunction: (accountNumber: number) =>
          `m/44'/60'/${accountNumber}'/0/0`,
      },
    },
    avalanche: {
      url: "https://avalanche-c-chain-rpc.publicnode.com",
      chainId: 43114,
      accounts,
      ledgerAccounts: [
        "0x8ABF795f22931DFb0D086693343F5f80571b488C", // Contract owner (Ledger)
      ],
      ledgerOptions: {
        derivationFunction: (accountNumber: number) =>
          `m/44'/60'/${accountNumber}'/0/0`,
      },
    },
  },
  etherscan: {
    apiKey: {
      avalanche: "verifyContract",
      avalancheFujiTestnet: "verifyContract",
    },
    customChains: [
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api",
          browserURL: "https://snowtrace.io",
        },
      },
      {
        network: "avalancheFujiTestnet",
        chainId: 43113,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api",
          browserURL: "https://testnet.snowtrace.io",
        },
      },
    ],
  },
};

export default config;
